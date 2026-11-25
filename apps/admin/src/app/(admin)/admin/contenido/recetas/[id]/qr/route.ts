import { prisma } from '@pizca/database';
import QRCode from 'qrcode';
import { requireAdmin } from '@/lib/auth/require-admin';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({ where: { id }, select: { slug: true, isPublished: true } });
  if (!recipe?.isPublished) return new Response('Receta no publicada', { status: 404 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl || !URL.canParse(appUrl) || !['http:', 'https:'].includes(new URL(appUrl).protocol)) {
    return new Response('Falta configurar la URL de la tienda', { status: 503 });
  }

  const url = new URL('/recetas/' + encodeURIComponent(recipe.slug), appUrl);
  const buffer = await QRCode.toBuffer(url.href, { width: 512, errorCorrectionLevel: 'M' });
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': 'attachment; filename="receta-qr.png"',
      'Cache-Control': 'private, no-store',
    },
  });
}
