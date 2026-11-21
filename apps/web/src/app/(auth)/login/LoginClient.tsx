'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeRedirect } from '@/lib/safe-redirect';

export default function LoginPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando acceso...</div>}><LoginContent /></Suspense>;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeRedirect(searchParams.get('callbackUrl'));
  const error = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setFormError('Credenciales inválidas. Verifica tu correo y contraseña.');
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setFormError('Error al iniciar sesión. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center gap-2 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <span className="text-primary-foreground font-heading font-bold text-xl">P</span>
            </div>
            <span className="font-heading font-semibold text-heading-lg text-foreground">
              Pizca del Monte
            </span>
          </Link>
          <h1 className="text-display-sm font-heading font-medium">Iniciar sesión</h1>
          <p className="text-muted-foreground mt-2">
            Accede a tu cuenta para gestionar pedidos y direcciones
          </p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-heading-md">Bienvenido de nuevo</CardTitle>
            <CardDescription>
              Ingresa tus credenciales para continuar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(error || formError) && (
              <div
                className={cn(
                  'p-3 rounded-lg text-sm text-destructive bg-destructive/10 border border-destructive/20',
                  error && 'animate-slide-in-from-top'
                )}
                role="alert"
              >
                {formError || 'Credenciales inválidas'}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    autoComplete="email"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <Link
                    href="/recuperar-contrasena"
                    className="text-body-sm text-primary hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar sesión'
                )}
              </Button>
            </form>

            <p className="text-center text-body-sm text-muted-foreground mt-6">
              ¿No tienes cuenta?{' '}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Regístrate
              </Link>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-body-xs text-muted-foreground mt-6">
          Al continuar, aceptas nuestros{' '}
          <Link href="/terminos-y-condiciones" className="underline hover:text-foreground">
            Términos y Condiciones
          </Link>{' '}
          y{' '}
          <Link href="/politica-de-privacidad" className="underline hover:text-foreground">
            Política de Privacidad
          </Link>
        </p>
      </div>
    </div>
  );
}