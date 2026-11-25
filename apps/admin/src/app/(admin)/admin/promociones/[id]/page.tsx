import { notFound } from 'next/navigation';
import { prisma } from '@pizca/database';
import { requireAdmin } from '@/lib/auth/require-admin';
import PromocionForm from './PromocionForm';
import PromocionProductos from './PromocionProductos';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PromocionDetailPage({ params }: Props) {
  const admin = await requireAdmin();
  const { id } = await params;

  const promocion = await prisma.promotion.findUnique({
    where: { id },
    include: {
      products: {
        include: {
          product: { include: { media: { where: { isPrimary: true }, take: 1 } } },
          variant: { include: { media: { where: { isPrimary: true }, take: 1 } } },
          category: true,
          collection: true,
        },
      },
      coupons: true,
      _count: { select: { products: true, OrderPromotion: true } },
    },
  });

  if (!promocion) notFound();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{promocion.name}</h1>
          <p className="text-muted-foreground">ID: {promocion.id} • Slug: {promocion.slug}</p>
        </div>
        <div className="flex gap-2">
          <a href={`/admin/promociones/${id}/editar`} className="btn btn-outline">
            Editar
          </a>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2">
        <span className={`badge ${promocion.isActive ? 'badge-primary' : 'badge-secondary'}`}>
          {promocion.isActive ? 'Activa' : 'Inactiva'}
        </span>
        {promocion.endDate && new Date(promocion.endDate) < new Date() && promocion.isActive && (
          <span className="badge badge-destructive">Expirada</span>
        )}
        {promocion.startDate && new Date(promocion.startDate) > new Date() && promocion.isActive && (
          <span className="badge badge-outline">Programada</span>
        )}
        <span className="badge badge-outline">{promocion.type.replace('_', ' ')}</span>
        {promocion.requiresCoupon && promocion.couponCode && (
          <span className="badge badge-secondary">Cupón: {promocion.couponCode}</span>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr]">
        {/* Main Info */}
        <div className="col-span-2 space-y-6">
          <PromocionForm promocion={promocion} />

          <PromocionProductos promocion={promocion} adminId={admin.id} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <h3 className="font-semibold">Información General</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Valor</dt>
                <dd className="font-mono font-medium">
                  {promocion.type === 'PERCENTAGE_OFF' || promocion.type === 'VOLUME_DISCOUNT'
                    ? `${promocion.value.toString()}%`
                    : promocion.type === 'FREE_SHIPPING'
                      ? 'Envío Gratis'
                      : new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(promocion.value))}
                </dd>
              </div>
              {promocion.minOrderAmount && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Monto Mínimo</dt>
                  <dd className="font-mono">
                    {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(promocion.minOrderAmount))}
                  </dd>
                </div>
              )}
              {promocion.maxDiscount && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Descuento Máximo</dt>
                  <dd className="font-mono">
                    {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(promocion.maxDiscount))}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Prioridad</dt>
                <dd className="font-mono">{promocion.priority}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Aplica a</dt>
                <dd>{promocion.appliesToAll ? 'Todos los productos' : 'Productos seleccionados'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Usos Totales</dt>
                <dd className="font-mono">{promocion.usageCount} / {promocion.usageLimit || 'Ilimitado'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Límite por Cliente</dt>
                <dd className="font-mono">{promocion.perCustomerLimit || 'Ilimitado'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Vigencia</dt>
                <dd className="text-right">
                  <p>{new Date(promocion.startDate).toLocaleDateString('es-PE')}</p>
                  {promocion.endDate && (
                    <p className="text-muted-foreground">hasta {new Date(promocion.endDate).toLocaleDateString('es-PE')}</p>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border bg-card p-6 space-y-4">
            <h3 className="font-semibold">Estadísticas</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Órdenes con esta promo</dt>
                <dd className="font-mono">{promocion._count.OrderPromotion}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Productos vinculados</dt>
                <dd className="font-mono">{promocion._count.products}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Cupones asociados</dt>
                <dd className="font-mono">{promocion.coupons.length}</dd>
              </div>
            </dl>
          </div>

          {promocion.coupons.length > 0 && (
            <div className="rounded-lg border bg-card p-6 space-y-4">
              <h3 className="font-semibold">Cupones Asociados</h3>
              <ul className="space-y-2">
                {promocion.coupons.map((coupon) => (
                  <li key={coupon.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted">
                    <span className="font-mono">{coupon.code}</span>
                    <span className="text-muted-foreground">{coupon.usageCount}/{coupon.usageLimit || '∞'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg border bg-card p-6 space-y-2">
            <h3 className="font-semibold">Acciones Rápidas</h3>
            <div className="flex flex-col gap-2">
              <form action={async () => {
                'use server';
                await prisma.promotion.update({ where: { id }, data: { isActive: !promocion.isActive } });
                await prisma.auditLog.create({ data: { userId: admin.id, action: 'UPDATE', entityType: 'Promotion', entityId: id, newData: { isActive: !promocion.isActive } } });
              }}>
                <button className="btn btn-outline w-full justify-start">
                  {promocion.isActive ? 'Desactivar' : 'Activar'} Promoción
                </button>
              </form>
              <form action={async () => {
                'use server';
                await prisma.promotionProduct.deleteMany({ where: { promotionId: id } });
                await prisma.auditLog.create({ data: { userId: admin.id, action: 'DELETE', entityType: 'PromotionProduct', entityId: id } });
              }}>
                <button className="btn btn-outline w-full justify-start text-destructive">
                  Desvincular Todos los Productos
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}