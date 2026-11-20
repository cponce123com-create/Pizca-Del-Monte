'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ShoppingBag, MapPin, CreditCard, Truck, Lock, Check, ChevronRight, X, Mail, Phone, User, Home, Building2, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPEN } from '@pizca/utils';
import { useToast } from '@/hooks/use-toast';

interface CartItem {
  id: string;
  variantId: string;
  sku: string;
  name: string;
  productSlug: string;
  quantity: number;
  unitPrice: number;
  formattedUnitPrice: string;
  subtotal: number;
  formattedSubtotal: string;
  image: { url: string; alt: string } | null;
  inStock: boolean;
  maxQty: number;
}

interface SavedAddress {
  id: string;
  type: string;
  isDefault: boolean;
  firstName: string;
  lastName: string;
  company: string | null;
  addressLine1: string;
  addressLine2: string | null;
  neighborhood: string | null;
  district: string;
  province: string;
  department: string;
  postalCode: string | null;
  country: string;
  phone: string | null;
  instructions: string | null;
  latitude: number | null;
  longitude: number | null;
  ubigeo: string | null;
}

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface ShippingMethod {
  id: string;
  carrierId: string;
  carrierName: string;
  carrierSlug: string;
  zoneName: string;
  name: string;
  basePrice: number;
  pricePerKg: number;
  estimatedDays: string;
  freeShippingThreshold: number | null;
}

interface CheckoutSummary {
  cart: {
    items: CartItem[];
    subtotal: number;
    formattedSubtotal: string;
    itemCount: number;
  };
  shipping: {
    cost: number;
    freeShipping: boolean;
    estimatedDays: string;
    carrier?: string;
  };
  tax: number;
  formattedTax: string;
  coupon: { code: string; discount: number; formattedDiscount: string } | null;
  total: number;
  formattedTotal: string;
  savedAddresses: SavedAddress[];
  paymentMethods: PaymentMethod[];
  shippingMethods: ShippingMethod[];
}

const PERU_DEPARTMENTS = [
  'Amazonas', 'Ancash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca',
  'Callao', 'Cusco', 'Huancavelica', 'Huánuco', 'Ica', 'Junín',
  'La Libertad', 'Lambayeque', 'Lima', 'Loreto', 'Madre de Dios',
  'Moquegua', 'Pasco', 'Piura', 'Puno', 'San Martín', 'Tacna',
  'Tumbes', 'Ucayali'
];

const DOCUMENT_TYPES = ['DNI', 'RUC', 'CE', 'PASAPORTE'] as const;

export function CheckoutClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [summary, setSummary] = useState<CheckoutSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: envío, 2: pago, 3: confirmación
  const [selectedShippingAddress, setSelectedShippingAddress] = useState<SavedAddress | null>(null);
  const [selectedBillingAddress, setSelectedBillingAddress] = useState<SavedAddress | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('MERCADO_PAGO');
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [showNewShippingAddress, setShowNewShippingAddress] = useState(false);
  const [showNewBillingAddress, setShowNewBillingAddress] = useState(false);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form data
  const [shippingForm, setShippingForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    department: '',
    province: '',
    district: '',
    urbanization: '',
    reference: '',
    postalCode: '',
    instructions: '',
  });

  const [billingForm, setBillingForm] = useState({
    firstName: '',
    lastName: '',
    documentType: 'DNI' as 'DNI' | 'RUC' | 'CE' | 'PASAPORTE',
    documentNumber: '',
    businessName: '',
    phone: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    department: '',
    province: '',
    district: '',
  });

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/checkout');
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login?callbackUrl=/checkout');
          return;
        }
        throw new Error('Error al cargar resumen');
      }
      const data = await response.json();
      setSummary(data);

      // Seleccionar dirección por defecto si existe
      const defaultShipping = data.savedAddresses.find((a: SavedAddress) => a.type === 'shipping' && a.isDefault);
      const defaultBilling = data.savedAddresses.find((a: SavedAddress) => a.type === 'billing' && a.isDefault);

      if (defaultShipping) setSelectedShippingAddress(defaultShipping);
      if (defaultBilling) setSelectedBillingAddress(defaultBilling);

      // Seleccionar método de envío por defecto
      if (data.shippingMethods.length > 0) {
        setSelectedShippingMethod(data.shippingMethods[0].id);
      }
    } catch (error) {
      console.error('Error fetching checkout summary:', error);
      toast({ title: 'Error', description: 'Error al cargar el checkout', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      // Validar dirección de envío
      if (!selectedShippingAddress && !showNewShippingAddress) {
        newErrors.shippingAddress = 'Selecciona o ingresa una dirección de envío';
      }
      if (showNewShippingAddress) {
        if (!shippingForm.firstName.trim()) newErrors.shippingFirstName = 'Nombre requerido';
        if (!shippingForm.lastName.trim()) newErrors.shippingLastName = 'Apellido requerido';
        if (!shippingForm.phone.trim()) newErrors.shippingPhone = 'Teléfono requerido';
        if (!/^\+?51\s?9\d{8}$/.test(shippingForm.phone.replace(/\s/g, ''))) {
          newErrors.shippingPhone = 'Formato: +51 999 888 777';
        }
        if (!shippingForm.addressLine1.trim()) newErrors.shippingAddressLine1 = 'Dirección requerida';
        if (!shippingForm.department) newErrors.shippingDepartment = 'Departamento requerido';
        if (!shippingForm.province) newErrors.shippingProvince = 'Provincia requerida';
        if (!shippingForm.district) newErrors.shippingDistrict = 'Distrito requerido';
      }
    }

    if (step === 2) {
      // Validar dirección de facturación si es diferente
      if (!sameAsShipping) {
        if (!selectedBillingAddress && !showNewBillingAddress) {
          newErrors.billingAddress = 'Selecciona o ingresa una dirección de facturación';
        }
        if (showNewBillingAddress) {
          if (!billingForm.firstName.trim()) newErrors.billingFirstName = 'Nombre requerido';
          if (!billingForm.lastName.trim()) newErrors.billingLastName = 'Apellido requerido';
          if (!billingForm.documentType) newErrors.billingDocumentType = 'Tipo de documento requerido';
          if (!billingForm.documentNumber.trim()) newErrors.billingDocumentNumber = 'Número de documento requerido';
          if (billingForm.documentType === 'DNI' && billingForm.documentNumber.length !== 8) {
            newErrors.billingDocumentNumber = 'DNI debe tener 8 dígitos';
          }
          if (billingForm.documentType === 'RUC' && billingForm.documentNumber.length !== 11) {
            newErrors.billingDocumentNumber = 'RUC debe tener 11 dígitos';
          }
          if (!billingForm.phone.trim()) newErrors.billingPhone = 'Teléfono requerido';
          if (!billingForm.email.trim()) newErrors.billingEmail = 'Email requerido';
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingForm.email)) newErrors.billingEmail = 'Email inválido';
          if (!billingForm.addressLine1.trim()) newErrors.billingAddressLine1 = 'Dirección requerida';
          if (!billingForm.department) newErrors.billingDepartment = 'Departamento requerido';
          if (!billingForm.province) newErrors.billingProvince = 'Provincia requerida';
          if (!billingForm.district) newErrors.billingDistrict = 'Distrito requerido';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;

    try {
      const response = await fetch(`/api/checkout?coupon=${encodeURIComponent(couponCode)}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Cupón inválido');
      }
      const data = await response.json();
      setSummary(data);
      toast({ title: 'Éxito', description: 'Cupón aplicado correctamente', variant: 'success' });
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Error al aplicar cupón', variant: 'destructive' });
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) return;

    setIsSubmitting(true);

    try {
      const shippingAddress = selectedShippingAddress || shippingForm;
      const billingAddress = sameAsShipping ? shippingAddress : (selectedBillingAddress || billingForm);

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingAddress: {
            firstName: shippingAddress.firstName,
            lastName: shippingAddress.lastName,
            phone: shippingAddress.phone,
            addressLine1: shippingAddress.addressLine1,
            addressLine2: shippingAddress.addressLine2,
            department: shippingAddress.department,
            province: shippingAddress.province,
            district: shippingAddress.district,
            urbanization: shippingAddress.urbanization || shippingAddress.neighborhood,
            reference: shippingAddress.reference || shippingAddress.instructions,
            postalCode: shippingAddress.postalCode,
            instructions: shippingAddress.instructions,
          },
          billingAddress: sameAsShipping ? undefined : {
            firstName: billingAddress.firstName,
            lastName: billingAddress.lastName,
            documentType: billingAddress.documentType,
            documentNumber: billingAddress.documentNumber,
            businessName: billingAddress.businessName,
            phone: billingAddress.phone,
            email: billingAddress.email,
            addressLine1: billingAddress.addressLine1,
            addressLine2: billingAddress.addressLine2,
            department: billingAddress.department,
            province: billingAddress.province,
            district: billingAddress.district,
          },
          paymentMethod: selectedPaymentMethod,
          shippingMethodId: selectedShippingMethod,
          couponCode: couponCode || undefined,
          useSavedAddress: !!selectedShippingAddress,
          savedShippingAddressId: selectedShippingAddress?.id,
          savedBillingAddressId: selectedBillingAddress?.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear orden');
      }

      const data = await response.json();

      // Redirigir según método de pago
      if (data.payment.paymentUrl) {
        window.location.href = data.payment.paymentUrl;
      } else {
        router.push(`/orden/${data.order.orderNumber}?success=true`);
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Error al procesar la orden', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <CheckoutSkeleton />
        </div>
      </div>
    );
  }

  if (!summary || summary.cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-16">
        <div className="text-center px-4">
          <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground/50 mb-6" />
          <h1 className="text-display-sm font-heading font-medium mb-2">Tu carrito está vacío</h1>
          <p className="text-muted-foreground mb-8">Agrega productos para continuar con la compra.</p>
          <Link href="/tienda">
            <Button size="lg">Continuar comprando</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { cart, shipping, tax, formattedTax, coupon, total, formattedTotal } = summary;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="hidden md:flex items-center justify-center mb-8">
          {[
            { num: 1, label: 'Envío', icon: MapPin },
            { num: 2, label: 'Pago', icon: CreditCard },
            { num: 3, label: 'Confirmar', icon: Check },
          ].map((step, index) => (
            <div key={step.num} className="flex items-center">
              <div className={cn(
                'flex items-center justify-center w-10 h-10 rounded-full border-2 text-body-sm font-medium',
                currentStep >= step.num
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground'
              )}>
                {currentStep > step.num ? <Check className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
              </div>
              <span className={cn(
                'ml-2 text-body-sm font-medium',
                currentStep >= step.num ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {step.label}
              </span>
              {index < 2 && (
                <div className={cn(
                  'ml-4 w-16 h-0.5',
                  currentStep > step.num ? 'bg-primary' : 'bg-border'
                )} />
              )}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Formulario */}
          <div className="lg:col-span-2 space-y-6">
            {/* Paso 1: Envío */}
            {currentStep === 1 && (
              <ShippingStep
                summary={summary}
                savedAddresses={summary.savedAddresses}
                selectedAddress={selectedShippingAddress}
                setSelectedAddress={setSelectedShippingAddress}
                showNewAddress={showNewShippingAddress}
                setShowNewAddress={setShowNewShippingAddress}
                formData={shippingForm}
                setFormData={setShippingForm}
                errors={errors}
                onNext={handleNext}
              />
            )}

            {/* Paso 2: Pago */}
            {currentStep === 2 && (
              <PaymentStep
                summary={summary}
                savedAddresses={summary.savedAddresses}
                selectedShippingAddress={selectedShippingAddress}
                selectedBillingAddress={selectedBillingAddress}
                setSelectedBillingAddress={setSelectedBillingAddress}
                sameAsShipping={sameAsShipping}
                setSameAsShipping={setSameAsShipping}
                showNewBillingAddress={showNewBillingAddress}
                setShowNewBillingAddress={setShowNewBillingAddress}
                billingForm={billingForm}
                setBillingForm={setBillingForm}
                paymentMethod={selectedPaymentMethod}
                setPaymentMethod={setSelectedPaymentMethod}
                shippingMethod={selectedShippingMethod}
                setShippingMethod={setSelectedShippingMethod}
                couponCode={couponCode}
                setCouponCode={setCouponCode}
                applyCoupon={applyCoupon}
                errors={errors}
                onBack={handleBack}
                onNext={handleNext}
              />
            )}

            {/* Paso 3: Confirmación */}
            {currentStep === 3 && (
              <ConfirmStep
                summary={summary}
                shippingAddress={selectedShippingAddress || shippingForm}
                billingAddress={sameAsShipping ? (selectedShippingAddress || shippingForm) : (selectedBillingAddress || billingForm)}
                paymentMethod={selectedPaymentMethod}
                shippingMethod={selectedShippingMethod}
                couponCode={couponCode}
                onBack={handleBack}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            )}
          </div>

          {/* Resumen lateral */}
          <div className="lg:col-span-1">
            <OrderSummary
              cart={cart}
              shipping={shipping}
              tax={tax}
              formattedTax={formattedTax}
              coupon={coupon}
              total={total}
              formattedTotal={formattedTotal}
              currentStep={currentStep}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Componentes de pasos
function ShippingStep({
  summary,
  savedAddresses,
  selectedAddress,
  setSelectedAddress,
  showNewAddress,
  setShowNewAddress,
  formData,
  setFormData,
  errors,
  onNext,
}: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Dirección de envío
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Direcciones guardadas */}
        {savedAddresses.filter(a => a.type === 'shipping' || a.type === 'both').length > 0 && (
          <div className="space-y-3">
            <p className="text-body-sm font-medium">Direcciones guardadas</p>
            {savedAddresses
              .filter((a: any) => a.type === 'shipping' || a.type === 'both')
              .map((address: any) => (
                <label
                  key={address.id}
                  className={cn(
                    'relative flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all',
                    selectedAddress?.id === address.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <input
                    type="radio"
                    name="shippingAddress"
                    checked={selectedAddress?.id === address.id}
                    onChange={() => { setSelectedAddress(address); setShowNewAddress(false); }}
                    className="sr-only"
                  />
                  <div className="w-5 h-5 border-2 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                    {selectedAddress?.id === address.id && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{address.firstName} {address.lastName}</span>
                      {address.isDefault && <Badge variant="secondary" className="text-body-xs">Predeterminada</Badge>}
                    </div>
                    <p className="text-body-sm text-muted-foreground mt-1">
                      {address.addressLine1}
                      {address.addressLine2 && `, ${address.addressLine2}`}
                      {address.neighborhood && `, ${address.neighborhood}`}
                      <br />
                      {address.district}, {address.province}, {address.department}
                      {address.postalCode && ` - ${address.postalCode}`}
                      <br />
                      Tel: {address.phone}
                    </p>
                  </div>
                </label>
              ))}
          </div>
        )}

        <Separator />

        {/* Nueva dirección */}
        <div className="flex items-center justify-between">
          <p className="text-body-sm font-medium">¿Nueva dirección?</p>
          <Button
            variant={showNewAddress ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowNewAddress(!showNewAddress)}
          >
            {showNewAddress ? 'Cancelar' : 'Agregar nueva dirección'}
          </Button>
        </div>

        {showNewAddress && (
          <AddressForm
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            prefix="shipping"
            isRequired={!selectedAddress}
          />
        )}

        {/* Método de envío */}
        {summary.shippingMethods.length > 0 && (
          <div className="border-t pt-6">
            <p className="text-body-sm font-medium mb-3">Método de envío</p>
            <div className="space-y-2">
              {summary.shippingMethods.map((method: any) => (
                <label
                  key={method.id}
                  className={cn(
                    'relative flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all',
                    selectedShippingMethod === method.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <input
                    type="radio"
                    name="shippingMethod"
                    checked={selectedShippingMethod === method.id}
                    onChange={() => {}}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{method.carrierName} - {method.name}</span>
                      <span className="font-semibold">
                        {method.basePrice === 0 ? 'Gratis' : formatPEN(method.basePrice)}
                      </span>
                    </div>
                    <p className="text-body-sm text-muted-foreground mt-1">
                      Entrega en {method.estimatedDays} días hábiles
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PaymentStep({
  summary,
  savedAddresses,
  selectedShippingAddress,
  selectedBillingAddress,
  setSelectedBillingAddress,
  sameAsShipping,
  setSameAsShipping,
  showNewBillingAddress,
  setShowNewBillingAddress,
  billingForm,
  setBillingForm,
  paymentMethod,
  setPaymentMethod,
  shippingMethod,
  setShippingMethod,
  couponCode,
  setCouponCode,
  applyCoupon,
  errors,
  onBack,
  onNext,
}: any) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Dirección de facturación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={sameAsShipping}
              onCheckedChange={setSameAsShipping}
            />
            <span className="font-medium">Igual que la dirección de envío</span>
          </label>

          {!sameAsShipping && (
            <>
              <Separator />
              {savedAddresses.filter(a => a.type === 'billing' || a.type === 'both').length > 0 && (
                <div className="space-y-3">
                  <p className="text-body-sm font-medium">Direcciones guardadas</p>
                  {savedAddresses
                    .filter((a: any) => a.type === 'billing' || a.type === 'both')
                    .map((address: any) => (
                      <label
                        key={address.id}
                        className={cn(
                          'relative flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all',
                          selectedBillingAddress?.id === address.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <input
                          type="radio"
                          name="billingAddress"
                          checked={selectedBillingAddress?.id === address.id}
                          onChange={() => { setSelectedBillingAddress(address); setShowNewBillingAddress(false); }}
                          className="sr-only"
                        />
                        <div className="w-5 h-5 border-2 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                          {selectedBillingAddress?.id === address.id && (
                            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{address.firstName} {address.lastName}</span>
                            {address.isDefault && <Badge variant="secondary" className="text-body-xs">Predeterminada</Badge>}
                          </div>
                          <p className="text-body-sm text-muted-foreground mt-1">
                            {address.addressLine1}
                            {address.addressLine2 && `, ${address.addressLine2}`}
                            <br />
                            {address.district}, {address.province}, {address.department}
                          </p>
                        </div>
                      </label>
                    ))}
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <p className="text-body-sm font-medium">¿Nueva dirección de facturación?</p>
                <Button
                  variant={showNewBillingAddress ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowNewBillingAddress(!showNewBillingAddress)}
                >
                  {showNewBillingAddress ? 'Cancelar' : 'Agregar nueva dirección'}
                </Button>
              </div>

              {showNewBillingAddress && (
                <BillingAddressForm
                  formData={billingForm}
                  setFormData={setBillingForm}
                  errors={errors}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Método de pago
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {summary.paymentMethods.map((method: any) => (
              <label
                key={method.id}
                className={cn(
                  'relative flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all',
                  paymentMethod === method.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === method.id}
                  onChange={() => setPaymentMethod(method.id)}
                  className="sr-only"
                />
                <div className="w-5 h-5 border-2 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                  {paymentMethod === method.id && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{method.name}</span>
                  </div>
                  <p className="text-body-sm text-muted-foreground mt-1">{method.description}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Cupón */}
          <div className="border-t pt-4">
            <div className="flex gap-2">
              <Input
                placeholder="Código de cupón"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="flex-1"
              />
              <Button onClick={applyCoupon} disabled={!couponCode.trim()}>
                Aplicar
              </Button>
            </div>
            {couponCode && (
              <p className="text-body-xs text-muted-foreground mt-1">Cupón: {couponCode}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <Button onClick={onNext} size="lg">
          Continuar
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </>
  );
}

function ConfirmStep({
  summary,
  shippingAddress,
  billingAddress,
  paymentMethod,
  shippingMethod,
  couponCode,
  onBack,
  onSubmit,
  isSubmitting,
}: any) {
  const paymentMethodInfo = summary.paymentMethods.find((m: any) => m.id === paymentMethod);
  const shippingMethodInfo = summary.shippingMethods.find((m: any) => m.id === shippingMethod);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-primary" />
            Revisar y confirmar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dirección de envío */}
          <div>
            <p className="text-body-sm font-medium mb-2">Dirección de envío</p>
            <AddressDisplay address={shippingAddress} />
          </div>

          {/* Dirección de facturación */}
          <div>
            <p className="text-body-sm font-medium mb-2">Dirección de facturación</p>
            <AddressDisplay address={billingAddress} />
          </div>

          {/* Método de envío */}
          <div>
            <p className="text-body-sm font-medium mb-2">Envío</p>
            <p>{shippingMethodInfo?.carrierName} - {shippingMethodInfo?.name}</p>
            <p className="text-body-sm text-muted-foreground">
              Entrega en {shippingMethodInfo?.estimatedDays} días
            </p>
          </div>

          {/* Método de pago */}
          <div>
            <p className="text-body-sm font-medium mb-2">Método de pago</p>
            <p>{paymentMethodInfo?.name}</p>
            <p className="text-body-sm text-muted-foreground">{paymentMethodInfo?.description}</p>
          </div>

          {/* Cupón */}
          {couponCode && (
            <div>
              <p className="text-body-sm font-medium mb-2">Cupón aplicado</p>
              <p className="text-success">{couponCode}</p>
            </div>
          )}

          <Separator />

          {/* Términos */}
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
            <input
              type="checkbox"
              id="terms"
              required
              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
            />
            <label htmlFor="terms" className="text-body-sm text-muted-foreground">
              Acepto los <Link href="/terminos-y-condiciones" className="text-primary hover:underline">Términos y Condiciones</Link> y la <Link href="/politica-de-privacidad" className="text-primary hover:underline">Política de Privacidad</Link>. Autorizo el tratamiento de mis datos personales.
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <Button onClick={onSubmit} size="lg" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              Pagar {summary.formattedTotal}
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </>
  );
}

function AddressDisplay({ address }: { address: any }) {
  return (
    <div className="p-4 bg-muted/30 rounded-lg text-body-sm">
      <p className="font-medium">{address.firstName} {address.lastName}</p>
      <p>{address.addressLine1}</p>
      {address.addressLine2 && <p>{address.addressLine2}</p>}
      {address.urbanization && <p>{address.urbanization}</p>}
      <p>{address.district}, {address.province}, {address.department}</p>
      {address.postalCode && <p>C.P. {address.postalCode}</p>}
      <p>Tel: {address.phone}</p>
      {address.email && <p>Email: {address.email}</p>}
    </div>
  );
}

function AddressForm({
  formData,
  setFormData,
  errors,
  prefix,
  isRequired,
}: any) {
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4 mt-4 p-4 bg-muted/30 rounded-lg">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Nombre"
          error={errors[`${prefix}FirstName`]}
          required={isRequired}
        >
          <Input
            value={formData.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            placeholder="Juan"
            autoComplete="given-name"
          />
        </FormField>
        <FormField
          label="Apellido"
          error={errors[`${prefix}LastName`]}
          required={isRequired}
        >
          <Input
            value={formData.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
            placeholder="Pérez"
            autoComplete="family-name"
          />
        </FormField>
      </div>

      <FormField
        label="Teléfono"
        error={errors[`${prefix}Phone`]}
        required={isRequired}
      >
        <Input
          type="tel"
          value={formData.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          placeholder="+51 999 888 777"
          autoComplete="tel"
        />
      </FormField>

      <FormField
        label="Dirección"
        error={errors[`${prefix}AddressLine1`]}
        required={isRequired}
      >
        <Input
          value={formData.addressLine1}
          onChange={(e) => handleChange('addressLine1', e.target.value)}
          placeholder="Av. Principal 123"
          autoComplete="street-address"
        />
      </FormField>

      <FormField label="Referencia / Urbanización">
        <Input
          value={formData.addressLine2 || formData.urbanization || ''}
          onChange={(e) => handleChange('addressLine2', e.target.value)}
          placeholder="Urbanización, referencia, piso, depto."
        />
      </FormField>

      <div className="grid grid-cols-3 gap-4">
        <FormField
          label="Departamento"
          error={errors[`${prefix}Department`]}
          required={isRequired}
        >
          <Select value={formData.department} onValueChange={(v) => handleChange('department', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              {PERU_DEPARTMENTS.map((dept) => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          label="Provincia"
          error={errors[`${prefix}Province`]}
          required={isRequired}
        >
          <Select value={formData.province} onValueChange={(v) => handleChange('province', v))}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Seleccionar provincia</SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          label="Distrito"
          error={errors[`${prefix}District`]}
          required={isRequired}
        >
          <Select value={formData.district} onValueChange={(v) => handleChange('district', v))}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Seleccionar distrito</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>

      {prefix !== 'billing' && (
        <FormField label="Instrucciones de entrega (opcional)">
          <Input
            value={formData.instructions || formData.reference || ''}
            onChange={(e) => handleChange('instructions', e.target.value)}
            placeholder="Puerta color azul, llamar al timbre, etc."
          />
        </FormField>
      )}
    </div>
  );
}

function BillingAddressForm({
  formData,
  setFormData,
  errors,
}: any) {
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4 mt-4 p-4 bg-muted/30 rounded-lg">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Nombre"
          error={errors.billingFirstName}
          required
        >
          <Input
            value={formData.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            placeholder="Juan"
          />
        </FormField>
        <FormField
          label="Apellido"
          error={errors.billingLastName}
          required
        >
          <Input
            value={formData.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
            placeholder="Pérez"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Tipo de documento"
          error={errors.billingDocumentType}
          required
        >
          <Select value={formData.documentType} onValueChange={(v) => handleChange('documentType', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField
          label="Número de documento"
          error={errors.billingDocumentNumber}
          required
        >
          <Input
            value={formData.documentNumber}
            onChange={(e) => handleChange('documentNumber', e.target.value)}
            placeholder={formData.documentType === 'DNI' ? '12345678' : '12345678901'}
            maxLength={formData.documentType === 'DNI' ? 8 : 11}
          />
        </FormField>
      </div>

      <FormField label="Razón social (para RUC)">
        <Input
          value={formData.businessName}
          onChange={(e) => handleChange('businessName', e.target.value)}
          placeholder="Empresa SAC"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Teléfono"
          error={errors.billingPhone}
          required
        >
          <Input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+51 999 888 777"
          />
        </FormField>
        <FormField
          label="Email"
          error={errors.billingEmail}
          required
        >
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="factura@empresa.com"
          />
        </FormField>
      </div>

      <FormField
        label="Dirección"
        error={errors.billingAddressLine1}
        required
      >
        <Input
          value={formData.addressLine1}
          onChange={(e) => handleChange('addressLine1', e.target.value)}
          placeholder="Av. Principal 123"
        />
      </FormField>

      <FormField label="Referencia (opcional)">
        <Input
          value={formData.addressLine2}
          onChange={(e) => handleChange('addressLine2', e.target.value)}
          placeholder="Urbanización, piso, depto."
        />
      </FormField>

      <div className="grid grid-cols-3 gap-4">
        <FormField
          label="Departamento"
          error={errors.billingDepartment}
          required
        >
          <Select value={formData.department} onValueChange={(v) => handleChange('department', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              {PERU_DEPARTMENTS.map((dept) => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField
          label="Provincia"
          error={errors.billingProvince}
          required
        >
          <Select value={formData.province} onValueChange={(v) => handleChange('province', v))}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Seleccionar</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField
          label="Distrito"
          error={errors.billingDistrict}
          required
        >
          <Select value={formData.district} onValueChange={(v) => handleChange('district', v))}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Seleccionar</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>
    </div>
  );
}

function FormField({ label, error, required, children }: any) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-body-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}

function OrderSummary({
  cart,
  shipping,
  tax,
  formattedTax,
  coupon,
  total,
  formattedTotal,
  currentStep,
}: any) {
  return (
    <div className="sticky top-24">
      <Card>
        <CardHeader>
          <CardTitle className="text-heading-md">Resumen del pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Items */}
          <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
            {cart.items.map((item: any) => (
              <div key={item.id} className="flex gap-3">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {item.image ? (
                    <Image src={item.image.url} alt={item.image.alt} fill className="object-cover" sizes="64px" />
                  ) : (
                    <ShoppingBag className="h-6 w-6 text-muted-foreground/50 mx-auto my-auto" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-medium line-clamp-1">{item.name}</p>
                  <p className="text-body-xs text-muted-foreground">Cant: {item.quantity}</p>
                  <p className="text-body-sm font-medium">{item.formattedSubtotal}</p>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Totales */}
          <div className="space-y-2 text-body-sm">
            <div className="flex justify-between">
              <span>Subtotal ({cart.itemCount} art.)</span>
              <span className="font-medium">{cart.formattedSubtotal}</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1">
                <Truck className="h-3.5 w-3.5" />
                Envío
              </span>
              <span className="font-medium">
                {shipping.freeShipping ? (
                  <span className="text-success">Gratis</span>
                ) : (
                  formatPEN(shipping.cost)
                )}
              </span>
            </div>
            {coupon && (
              <div className="flex justify-between text-success">
                <span>Descuento ({coupon.code})</span>
                <span className="font-medium">-{coupon.formattedDiscount}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="flex items-center gap-1">
                <Lock className="h-3.5 w-3.5" />
                IGV (18%)
              </span>
              <span className="font-medium">{formattedTax}</span>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between text-display-sm font-heading font-semibold">
            <span>Total</span>
            <span>{formattedTotal}</span>
          </div>

          <p className="text-body-xs text-muted-foreground text-center">
            Incluye IGV. Pago seguro.
          </div>

          {/* Beneficios */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-2 text-body-xs text-muted-foreground">
              <Lock className="h-4 w-4 text-primary" />
              <span>Pago 100% seguro</span>
            </div>
            <div className="flex items-center gap-2 text-body-xs text-muted-foreground">
              <Truck className="h-4 w-4 text-primary" />
              <span>Envío a todo el Perú</span>
            </div>
            <div className="flex items-center gap-2 text-body-xs text-muted-foreground">
              <RotateCcw className="h-4 w-4 text-primary" />
              <span>Devoluciones fáciles</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="lg:col-span-1">
        <Card className="sticky top-24">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-6 w-1/4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-16 h-16 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              ))}
            </div>
            <Skeleton className="h-1 w-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
            </div>
            <Skeleton className="h-1 w-full" />
            <Skeleton className="h-7 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}