'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Facebook, Instagram, Tiktok, Whatsapp, Youtube, Mail, MapPin, Phone, Truck, Shield, RotateCcw, Heart } from 'lucide-react';

const footerLinks = {
  empresa: [
    { name: 'Nuestra Historia', href: '/nuestra-historia' },
    { name: 'Contacto', href: '/contacto' },
    { name: 'Trabaja con nosotros', href: '/trabaja-con-nosotros' },
    { name: 'Prensa', href: '/prensa' },
    { name: 'Sostenibilidad', href: '/sostenibilidad' },
  ],
  ayuda: [
    { name: 'Preguntas Frecuentes', href: '/preguntas-frecuentes' },
    { name: 'Envíos y Cobertura', href: '/envios-y-cobertura' },
    { name: 'Cambios y Devoluciones', href: '/cambios-y-devoluciones' },
    { name: 'Medios de Pago', href: '/medios-de-pago' },
    { name: 'Facturación Electrónica', href: '/facturacion-electronica' },
  ],
  legal: [
    { name: 'Términos y Condiciones', href: '/terminos-y-condiciones' },
    { name: 'Política de Privacidad', href: '/politica-de-privacidad' },
    { name: 'Política de Cookies', href: '/politica-de-cookies' },
    { name: 'Libro de Reclamaciones', href: '/libro-de-reclamaciones' },
  ],
  cuenta: [
    { name: 'Mi Cuenta', href: '/mi-cuenta' },
    { name: 'Mis Pedidos', href: '/mis-pedidos' },
    { name: 'Mis Direcciones', href: '/mis-direcciones' },
    { name: 'Mis Favoritos', href: '/favoritos' },
    { name: 'Lista de Deseos', href: '/lista-deseos' },
  ],
};

const socialLinks = [
  { name: 'Facebook', href: 'https://facebook.com/pizcadelmonte', icon: Facebook },
  { name: 'Instagram', href: 'https://instagram.com/pizcadelmonte', icon: Instagram },
  { name: 'TikTok', href: 'https://tiktok.com/@pizcadelmonte', icon: Tiktok },
  { name: 'WhatsApp', href: 'https://wa.me/51999888777', icon: Whatsapp },
  { name: 'YouTube', href: 'https://youtube.com/@pizcadelmonte', icon: Youtube },
];

const paymentMethods = [
  { name: 'Mercado Pago', icon: Shield },
  { name: 'Yape', icon: Phone },
  { name: 'Plin', icon: Phone },
  { name: 'Transferencia', icon: RotateCcw },
  { name: 'Visa', icon: Shield },
  { name: 'Mastercard', icon: Shield },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30" role="contentinfo">
      <div className="container py-16 lg:py-24">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4" aria-label="Pizca del Monte - Inicio">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                <span className="text-primary-foreground font-heading font-bold text-xl">P</span>
              </div>
              <span className="font-heading font-semibold text-heading-sm text-foreground">
                Pizca del Monte
              </span>
            </Link>
            <p className="text-body-md text-muted-foreground mb-6 max-w-xs">
              Especias, sales y aceites gourmet peruanos seleccionados con amor.
              Llevamos la despensa andina y costeña a tu mesa.
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              <Badge variant="outline">100% Peruano</Badge>
              <Badge variant="outline">Origen Certificado</Badge>
              <Badge variant="outline">Sin Aditivos</Badge>
              <Badge variant="outline">Comercio Justo</Badge>
            </div>
            <div className="flex items-center gap-6">
              <a
                href="https://facebook.com/pizcadelmonte"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://instagram.com/pizcadelmonte"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://tiktok.com/@pizcadelmonte"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="TikTok"
              >
                <Tiktok className="h-5 w-5" />
              </a>
              <a
                href="https://wa.me/51999888777"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="WhatsApp"
              >
                <Whatsapp className="h-5 w-5" />
              </a>
              <a
                href="https://youtube.com/@pizcadelmonte"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Empresa */}
          <nav aria-label="Empresa">
            <h3 className="font-semibold text-foreground mb-4">Empresa</h3>
            <ul className="space-y-2">
              {footerLinks.empresa.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-body-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Ayuda */}
          <nav aria-label="Ayuda">
            <h3 className="font-semibold text-foreground mb-4">Ayuda</h3>
            <ul className="space-y-2">
              {footerLinks.ayuda.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-body-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Legal */}
          <nav aria-label="Legal">
            <h3 className="font-semibold text-foreground mb-4">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-body-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Cuenta */}
          <nav aria-label="Mi Cuenta">
            <h3 className="font-semibold text-foreground mb-4">Mi Cuenta</h3>
            <ul className="space-y-2">
              {footerLinks.cuenta.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-body-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Benefits & Payment */}
        <div className="border-t border-border pt-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Envío Nacional</h4>
                <p className="text-body-sm text-muted-foreground">Con Shalom a todo el Perú</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Pago Seguro</h4>
                <p className="text-body-sm text-muted-foreground">Mercado Pago, Yape, Plin</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Devoluciones Fáciles</h4>
                <p className="text-body-sm text-muted-foreground">30 días para cambios</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Calidad Garantizada</h4>
                <p className="text-body-sm text-muted-foreground">Productos 100% peruanos</p>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-8 border-b border-border">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-body-sm text-muted-foreground">Métodos de pago:</span>
              <div className="flex items-center gap-3">
                {paymentMethods.map((method) => (
                  <span key={method.name} className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
                    <method.icon className="h-4 w-4" />
                    {method.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-body-sm text-muted-foreground">Envíos por:</span>
              <div className="flex items-center gap-3">
                <Badge variant="outline">Shalom</Badge>
                <Badge variant="outline">Olva Courier</Badge>
                <Badge variant="outline">Serpost</Badge>
                <Badge variant="outline">Recojo en tienda</Badge>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8">
            <p className="text-body-sm text-muted-foreground text-center md:text-left">
              © {new Date().getFullYear()} Pizca del Monte SAC. Todos los derechos reservados.
              RUC: 20123456789
            </p>
            <div className="flex items-center gap-6 text-body-xs text-muted-foreground flex-wrap justify-center md:justify-end">
              <span>Hecho con amor en Perú 🇵🇪</span>
              <span>·</span>
              <Link href="/terminos-y-condiciones" className="hover:text-foreground transition-colors">
                Términos
              </Link>
              <span>·</span>
              <Link href="/politica-de-privacidad" className="hover:text-foreground transition-colors">
                Privacidad
              </Link>
              <span>·</span>
              <Link href="/libro-de-reclamaciones" className="hover:text-foreground transition-colors">
                Libro de Reclamaciones
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}