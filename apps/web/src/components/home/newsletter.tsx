'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Sparkles, Check } from 'lucide-react';

export function Newsletter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (email.includes('@')) {
      setStatus('success');
      setMessage('¡Gracias por suscribirte! Revisa tu correo para confirmar.');
      setEmail('');
    } else {
      setStatus('error');
      setMessage('Por favor ingresa un correo válido.');
    }
  };

  return (
    <section className="py-20 bg-primary relative overflow-hidden" aria-labelledby="newsletter-heading">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-secondary/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
      </div>
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 bg-primary-foreground/10 text-primary-foreground px-4 py-2 rounded-full mb-6">
            <Sparkles className="h-4 w-4" />
            <span className="font-medium">Únete a la comunidad Pizca del Monte</span>
          </div>
          <h2 id="newsletter-heading" className="text-display-md font-heading font-medium text-primary-foreground mb-4">
            Recibe recetas, ofertas y novedades
          </h2>
          <p className="text-primary-foreground/80 text-body-lg mb-8">
            Suscríbete a nuestro boletín y obtén 10% de descuento en tu primera compra.
            Sin spam, solo lo mejor de la cocina peruana.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <div className="flex-1">
              <Input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === 'loading' || status === 'success'}
                className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 focus:border-primary-foreground focus:ring-primary-foreground/30"
                aria-label="Correo electrónico"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={status === 'loading' || status === 'success'}
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 whitespace-nowrap"
            >
              {status === 'loading' ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Suscribiendo...
                </>
              ) : status === 'success' ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  ¡Suscrito!
                </>
              ) : (
                <>
                  Suscribirme
                  <Mail className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {message && (
            <p className={`mt-4 text-body-sm ${
              status === 'success' ? 'text-green-300' : 'text-red-300'
            }`} role="alert">
              {message}
            </p>
          )}

          <p className="mt-6 text-body-sm text-primary-foreground/60">
            Al suscribirte aceptas nuestra{' '}
            <a href="/politica-de-privacidad" className="underline hover:text-primary-foreground">
              Política de Privacidad
            </a>
            . Puedes darte de baja en cualquier momento.
          </p>
        </div>
      </div>
    </section>
  );
}