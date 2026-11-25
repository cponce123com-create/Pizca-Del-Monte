'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

const promotionSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(180),
  slug: z.string().min(1, 'Slug requerido').max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Solo minúsculas, números y guiones'),
  description: z.string().max(5000).optional(),
  type: z.enum(['PERCENTAGE_OFF', 'FIXED_AMOUNT_OFF', 'BUY_X_GET_Y', 'FREE_SHIPPING', 'GIFT_WITH_PURCHASE', 'VOLUME_DISCOUNT', 'TIME_LIMITED']),
  value: z.string().regex(/^\d{1,10}(?:\.\d{1,2})?$/, 'Valor numérico válido'),
  minOrderAmount: z.string().regex(/^\d{1,10}(?:\.\d{1,2})?$/, 'Monto válido').optional().nullable(),
  maxDiscount: z.string().regex(/^\d{1,10}(?:\.\d{1,2})?$/, 'Monto válido').optional().nullable(),
  usageLimit: z.string().regex(/^\d{1,9}$/, 'Número entero').optional().nullable(),
  perCustomerLimit: z.string().regex(/^\d{1,9}$/, 'Número entero').optional().nullable(),
  startDate: z.string().min(1, 'Fecha de inicio requerida'),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  priority: z.string().regex(/^\d{1,3}$/, 'Número entero').default('0'),
  appliesToAll: z.boolean().default(false),
  requiresCoupon: z.boolean().default(false),
  couponCode: z.string().max(40).optional().nullable(),
}).refine((data) => {
  if (data.endDate && data.startDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
}, { message: 'La fecha de fin debe ser posterior a la de inicio', path: ['endDate'] });

type PromotionFormData = z.infer<typeof promotionSchema>;

interface PromocionFormProps {
  promocion: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    type: string;
    value: any;
    minOrderAmount: any | null;
    maxDiscount: any | null;
    usageLimit: number | null;
    perCustomerLimit: number | null;
    startDate: string | Date;
    endDate: string | Date | null;
    isActive: boolean;
    priority: number;
    appliesToAll: boolean;
    requiresCoupon: boolean;
    couponCode: string | null;
  };
}

export default function PromocionForm({ promocion }: PromocionFormProps) {
  const [saving, setSaving] = useState(false);

  const form = useForm<PromotionFormData>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      name: promocion.name,
      slug: promocion.slug,
      description: promocion.description || '',
      type: promocion.type as any,
      value: promocion.value.toString(),
      minOrderAmount: promocion.minOrderAmount?.toString() || '',
      maxDiscount: promocion.maxDiscount?.toString() || '',
      usageLimit: promocion.usageLimit?.toString() || '',
      perCustomerLimit: promocion.perCustomerLimit?.toString() || '',
      startDate: new Date(promocion.startDate).toISOString().slice(0, 16),
      endDate: promocion.endDate ? new Date(promocion.endDate).toISOString().slice(0, 16) : '',
      isActive: promocion.isActive,
      priority: promocion.priority.toString(),
      appliesToAll: promocion.appliesToAll,
      requiresCoupon: promocion.requiresCoupon,
      couponCode: promocion.couponCode || '',
    },
  });

  const onSubmit = async (data: PromotionFormData) => {
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          formData.append(key, value);
        }
      });

      const res = await fetch(`/admin/promociones/${promocion.id}`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        window.location.reload();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const typeLabels: Record<string, string> = {
    PERCENTAGE_OFF: '% Descuento',
    FIXED_AMOUNT_OFF: 'Monto Fijo',
    BUY_X_GET_Y: 'Compra X Lleva Y',
    FREE_SHIPPING: 'Envío Gratis',
    GIFT_WITH_PURCHASE: 'Regalo con Compra',
    VOLUME_DISCOUNT: 'Descuento por Volumen',
    TIME_LIMITED: 'Tiempo Limitado',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Save className="h-5 w-5" />
          Editar Promoción
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h4 className="font-medium text-lg">Información Básica</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="Ej: 20% Descuento en Ajíes"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  {...form.register('slug')}
                  placeholder="ej: 20-descuento-ajies"
                />
                {form.formState.errors.slug && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.slug.message}</p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                {...form.register('description')}
                rows={3}
                placeholder="Descripción interna de la promoción..."
              />
            </div>
          </div>

          <Separator />

          {/* Type & Value */}
          <div className="space-y-4">
            <h4 className="font-medium text-lg">Tipo y Valor</h4>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="type">Tipo de Promoción *</Label>
                <Select
                  value={form.watch('type')}
                  onValueChange={(v) => form.setValue('type', v as any, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="value">Valor *</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...form.register('value')}
                  placeholder={form.watch('type') === 'PERCENTAGE_OFF' ? 'Ej: 20' : 'Ej: 15.50'}
                />
              </div>
              <div>
                <Label htmlFor="priority">Prioridad</Label>
                <Input
                  id="priority"
                  type="number"
                  min="0"
                  max="999"
                  {...form.register('priority')}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Conditional fields */}
            <div className="grid gap-4 md:grid-cols-2">
              {(form.watch('type') === 'PERCENTAGE_OFF' || form.watch('type') === 'VOLUME_DISCOUNT' || form.watch('type') === 'FIXED_AMOUNT_OFF') && (
                <>
                  <div>
                    <Label htmlFor="minOrderAmount">Monto Mínimo de Orden (opcional)</Label>
                    <Input
                      id="minOrderAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      {...form.register('minOrderAmount')}
                      placeholder="Ej: 50.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxDiscount">Descuento Máximo (opcional)</Label>
                    <Input
                      id="maxDiscount"
                      type="number"
                      step="0.01"
                      min="0"
                      {...form.register('maxDiscount')}
                      placeholder="Ej: 100.00"
                    />
                  </div>
                </>
              )}
              {form.watch('type') === 'BUY_X_GET_Y' && (
                <Alert variant="info">
                  <AlertDescription>
                    Para "Compra X Lleva Y", configurar productos en la sección de productos vinculados.
                  </AlertDescription>
                </Alert>
              )}
              {form.watch('type') === 'FREE_SHIPPING' && (
                <Alert variant="info">
                  <AlertDescription>
                    Envío gratis se aplica automáticamente al carrito que cumpla condiciones.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <Separator />

          {/* Dates & Limits */}
          <div className="space-y-4">
            <h4 className="font-medium text-lg">Vigencia y Límites</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="startDate">Fecha Inicio *</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  {...form.register('startDate')}
                />
                {form.formState.errors.startDate && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.startDate.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="endDate">Fecha Fin (opcional)</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  {...form.register('endDate')}
                />
                {form.formState.errors.endDate && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.endDate.message}</p>
                )}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="usageLimit">Límite de Usos Totales (opcional)</Label>
                <Input
                  id="usageLimit"
                  type="number"
                  min="1"
                  {...form.register('usageLimit')}
                  placeholder="Ej: 100"
                />
              </div>
              <div>
                <Label htmlFor="perCustomerLimit">Límite por Cliente (opcional)</Label>
                <Input
                  id="perCustomerLimit"
                  type="number"
                  min="1"
                  {...form.register('perCustomerLimit')}
                  placeholder="Ej: 1"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-lg">Configuración</h4>
            <div className="flex items-center justify-between">
              <div>
                <Label>Activa</Label>
                <p className="text-sm text-muted-foreground">La promoción está visible y aplicable</p>
              </div>
              <Switch
                checked={form.watch('isActive')}
                onCheckedChange={(v) => form.setValue('isActive', v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Aplica a Todos los Productos</Label>
                <p className="text-sm text-muted-foreground">Si está desactivado, debe vincular productos específicos abajo</p>
              </div>
              <Switch
                checked={form.watch('appliesToAll')}
                onCheckedChange={(v) => form.setValue('appliesToAll', v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Requiere Cupón</Label>
                <p className="text-sm text-muted-foreground">El cliente debe ingresar un código para aplicar la promoción</p>
              </div>
              <Switch
                checked={form.watch('requiresCoupon')}
                onCheckedChange={(v) => form.setValue('requiresCoupon', v)}
              />
            </div>
            {form.watch('requiresCoupon') && (
              <div>
                <Label htmlFor="couponCode">Código de Cupón</Label>
                <Input
                  id="couponCode"
                  {...form.register('couponCode')}
                  placeholder="Ej: VERANO20"
                  maxLength={40}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Debe ser único. Se genera automáticamente si se deja vacío al crear.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              Restablecer
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar Cambios
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}