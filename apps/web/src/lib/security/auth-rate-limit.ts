import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const AUTH_RATE_LIMITS = {
  'login:ip': { requests: 30, window: '15 m' },
  'login:identity': { requests: 10, window: '15 m' },
  'register:ip': { requests: 10, window: '1 h' },
  'register:identity': { requests: 3, window: '1 h' },
} as const;

export type AuthRateLimitScope = keyof typeof AUTH_RATE_LIMITS;
export type AuthRateLimitCheck = {
  scope: AuthRateLimitScope;
  identifier: string;
};

export type AuthRateLimitResult =
  | { status: 'allowed' }
  | { status: 'limited'; retryAfterSeconds: number }
  | { status: 'unavailable' };

type Limiter = InstanceType<typeof Ratelimit>;
type LimiterSet = Record<AuthRateLimitScope, Limiter>;

let cachedLimiterSet: { key: string; limiters: LimiterSet } | undefined;

/**
 * Uses the first forwarded address only when the hosting proxy overwrites the
 * header. Configure the proxy to discard any client-supplied forwarding header.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = headers.get('x-real-ip')?.trim();
  const candidate = forwarded || realIp;

  return candidate && isIP(candidate) ? candidate : 'unknown';
}

function getLimiterSet(): LimiterSet | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const cacheKey = `${url}\u0000${token}`;
  if (cachedLimiterSet?.key === cacheKey) return cachedLimiterSet.limiters;

  const redis = new Redis({ url, token });
  const limiters = Object.fromEntries(
    Object.entries(AUTH_RATE_LIMITS).map(([scope, policy]) => [
      scope,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(policy.requests, policy.window),
        prefix: `pizca:auth:${scope}`,
      }),
    ])
  ) as LimiterSet;

  cachedLimiterSet = { key: cacheKey, limiters };
  return limiters;
}

function hashIdentifier(scope: AuthRateLimitScope, identifier: string): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'pizca-development-only';
  return createHmac('sha256', secret)
    .update(`${scope}:${identifier.trim().toLowerCase()}`)
    .digest('hex');
}

/**
 * Each check is stored in Upstash so limits are shared by application instances.
 * With no store, production fails closed; local development and tests can run
 * without Redis credentials. Do not use an in-memory limiter as a production fallback.
 */
export async function checkAuthRateLimits(
  checks: readonly AuthRateLimitCheck[]
): Promise<AuthRateLimitResult> {
  if (checks.length === 0) return { status: 'allowed' };

  const hasUrl = Boolean(process.env.UPSTASH_REDIS_REST_URL);
  const hasToken = Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);
  const isProduction = process.env.NODE_ENV === 'production';

  if (!hasUrl && !hasToken && !isProduction) return { status: 'allowed' };
  if (!hasUrl || !hasToken) return { status: 'unavailable' };
  if (isProduction && !process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
    return { status: 'unavailable' };
  }

  try {
    const limiters = getLimiterSet();
    if (!limiters) return { status: 'unavailable' };

    const results = await Promise.all(
      checks.map(({ scope, identifier }) =>
        limiters[scope].limit(hashIdentifier(scope, identifier))
      )
    );
    const blocked = results.filter((result) => !result.success);

    if (blocked.length === 0) return { status: 'allowed' };

    const retryAfterSeconds = Math.max(
      1,
      ...blocked.map((result) => Math.ceil((result.reset - Date.now()) / 1000))
    );
    return { status: 'limited', retryAfterSeconds };
  } catch {
    return isProduction ? { status: 'unavailable' } : { status: 'allowed' };
  }
}
