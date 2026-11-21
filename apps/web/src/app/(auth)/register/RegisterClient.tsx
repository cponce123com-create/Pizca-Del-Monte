'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Lock, User, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    acceptTerms: false,
    newsletter: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  const validateField = (name: string, value: string | boolean) => {
    const newErrors = { ...errors };
    const textValue = typeof value === 'string' ? value : '';

    switch (name) {
      case 'firstName':
      case 'lastName':
        if (!textValue.trim()) newErrors[name] = 'Este campo es obligatorio';
        else if (textValue.length < 2) newErrors[name] = 'Mínimo 2 caracteres';
        else delete newErrors[name];
        break;
      case 'email':
        if (!textValue.trim()) newErrors[name] = 'El correo es obligatorio';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(textValue)) newErrors[name] = 'Correo inválido';
        else delete newErrors[name];
        break;
      case 'phone':
        if (value && !/^\+?51\s?9\d{8}$/.test(textValue.replace(/\s/g, ''))) {
          newErrors[name] = 'Formato: +51 999 888 777';
        } else {
          delete newErrors[name];
        }
        break;
      case 'password':
        if (!value) newErrors[name] = 'La contraseña es obligatoria';
        else if (textValue.length < 8) newErrors[name] = 'Mínimo 8 caracteres';
        else if (!/[A-Z]/.test(textValue)) newErrors[name] = 'Debe tener una mayúscula';
        else if (!/[a-z]/.test(textValue)) newErrors[name] = 'Debe tener una minúscula';
        else if (!/[0-9]/.test(textValue)) newErrors[name] = 'Debe tener un número';
        else delete newErrors[name];
        break;
      case 'confirmPassword':
        if (value !== formData.password) newErrors[name] = 'Las contraseñas no coinciden';
        else delete newErrors[name];
        break;
      case 'acceptTerms':
        if (!value) newErrors[name] = 'Debes aceptar los términos';
        else delete newErrors[name];
        break;
    }

    setErrors(newErrors);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setFormData((prev) => ({ ...prev, [name]: newValue }));
    validateField(name, newValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    // Validar todos los campos
    Object.keys(formData).forEach((key) => {
      validateField(key, formData[key as keyof typeof formData]);
    });

    if (Object.keys(errors).length > 0 || !formData.acceptTerms) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          newsletter: formData.newsletter,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al registrar');
      }

      // Redirigir a login con mensaje de éxito
      router.push('/login?registered=true');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Error al crear la cuenta');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordRequirements = [
    { label: 'Mínimo 8 caracteres', test: (p: string) => p.length >= 8 },
    { label: 'Una mayúscula', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'Una minúscula', test: (p: string) => /[a-z]/.test(p) },
    { label: 'Un número', test: (p: string) => /[0-9]/.test(p) },
  ];

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
          <h1 className="text-display-sm font-heading font-medium">Crear cuenta</h1>
          <p className="text-muted-foreground mt-2">
            Únete a nuestra comunidad gourmet
          </p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-heading-md">Regístrate</CardTitle>
            <CardDescription>
              Completa el formulario para crear tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {submitError && (
              <div
                className="p-3 rounded-lg text-sm text-destructive bg-destructive/10 border border-destructive/20"
                role="alert"
              >
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">Nombre</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="Juan"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="pl-10"
                      required
                      autoComplete="given-name"
                      disabled={isLoading}
                      aria-invalid={!!errors.firstName}
                    />
                  </div>
                  {errors.firstName && <p className="text-body-sm text-destructive" role="alert">{errors.firstName}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Pérez"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    autoComplete="family-name"
                    disabled={isLoading}
                    aria-invalid={!!errors.lastName}
                  />
                  {errors.lastName && <p className="text-body-sm text-destructive" role="alert">{errors.lastName}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10"
                    required
                    autoComplete="email"
                    disabled={isLoading}
                    aria-invalid={!!errors.email}
                  />
                </div>
                {errors.email && <p className="text-body-sm text-destructive" role="alert">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Teléfono (opcional)</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+51 999 888 777"
                  value={formData.phone}
                  onChange={handleChange}
                  autoComplete="tel"
                  disabled={isLoading}
                  aria-invalid={!!errors.phone}
                />
                {errors.phone && <p className="text-body-sm text-destructive" role="alert">{errors.phone}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10 pr-10"
                    required
                    autoComplete="new-password"
                    disabled={isLoading}
                    aria-invalid={!!errors.password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <Lock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-body-sm text-destructive" role="alert">{errors.password}</p>}

                {formData.password && (
                  <div className="space-y-1">
                    {passwordRequirements.map((req) => (
                      <div
                        key={req.label}
                        className={cn(
                          'flex items-center gap-2 text-body-xs',
                          req.test(formData.password) ? 'text-success' : 'text-muted-foreground'
                        )}
                      >
                        <CheckCircle2 className={cn('h-3.5 w-3.5', req.test(formData.password) ? 'text-success' : 'text-muted-foreground')} />
                        {req.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  disabled={isLoading}
                  aria-invalid={!!errors.confirmPassword}
                />
                {errors.confirmPassword && <p className="text-body-sm text-destructive" role="alert">{errors.confirmPassword}</p>}
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    name="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                    required
                    className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                    disabled={isLoading}
                  />
                  <Label htmlFor="acceptTerms" className="text-body-sm cursor-pointer">
                    Acepto los <Link href="/terminos-y-condiciones" className="text-primary hover:underline">Términos y Condiciones</Link> y la <Link href="/politica-de-privacidad" className="text-primary hover:underline">Política de Privacidad</Link>
                  </Label>
                </div>
                {errors.acceptTerms && <p className="text-body-sm text-destructive ml-7" role="alert">{errors.acceptTerms}</p>}

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="newsletter"
                    name="newsletter"
                    checked={formData.newsletter}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                    disabled={isLoading}
                  />
                  <Label htmlFor="newsletter" className="text-body-sm cursor-pointer">
                    Recibir novedades, recetas y ofertas exclusivas (10% descuento en tu primera compra)
                  </Label>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  'Crear cuenta'
                )}
              </Button>
            </form>

            <p className="text-center text-body-sm text-muted-foreground mt-6">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Inicia sesión
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}