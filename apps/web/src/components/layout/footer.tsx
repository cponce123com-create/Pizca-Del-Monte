import Link from 'next/link';
import { Facebook, Instagram, Music2, Youtube, Mail, MapPin, BookOpen, ShoppingBag } from 'lucide-react';
import { siteConfig } from '@/lib/site-config';

const groups = [
  { title: 'Empresa', links: [
    ['Nuestra historia', '/nuestra-historia'], ['Contacto', '/contacto'],
    ['Sostenibilidad', '/sostenibilidad'], ['Prensa', '/prensa'],
    ['Trabaja con nosotros', '/trabaja-con-nosotros'],
  ] },
  { title: 'Ayuda', links: [
    ['Preguntas frecuentes', '/preguntas-frecuentes'], ['Envíos y cobertura', '/envios-y-cobertura'],
    ['Cambios y devoluciones', '/cambios-y-devoluciones'], ['Medios de pago', '/medios-de-pago'],
    ['Facturación electrónica', '/facturacion-electronica'],
  ] },
  { title: 'Información legal', links: [
    ['Términos y condiciones', '/terminos-y-condiciones'], ['Privacidad', '/politica-de-privacidad'],
    ['Cookies', '/politica-de-cookies'], ['Libro de Reclamaciones', '/libro-de-reclamaciones'],
  ] },
  { title: 'Mi cuenta', links: [
    ['Mi cuenta', '/mi-cuenta'], ['Mis pedidos', '/mis-pedidos'],
    ['Mis direcciones', '/mis-direcciones'], ['Favoritos', '/favoritos'],
  ] },
] as const;

const social = [
  { name: 'Facebook', href: siteConfig.social.facebook, Icon: Facebook },
  { name: 'Instagram', href: siteConfig.social.instagram, Icon: Instagram },
  { name: 'TikTok', href: siteConfig.social.tiktok, Icon: Music2 },
  { name: 'YouTube', href: siteConfig.social.youtube, Icon: Youtube },
].filter((item): item is typeof item & { href: string } => Boolean(item.href));

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30" role="contentinfo">
      <div className="container py-12 lg:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-6">
          <div className="col-span-2">
            <Link href="/" className="inline-flex items-center gap-3 font-heading text-xl font-bold">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">P</span>
              {siteConfig.name}
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-7 text-muted-foreground">
              Explora especias, sales y aceites gourmet para descubrir nuevas formas de cocinar.
            </p>
            {siteConfig.email && <a href={`mailto:${siteConfig.email}`} className="mt-4 flex items-center gap-2 text-sm hover:text-primary"><Mail className="h-4 w-4" />{siteConfig.email}</a>}
            {siteConfig.address && <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{siteConfig.address}</p>}
            {social.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-4">
                {social.map(({ name, href, Icon }) => <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={name} className="text-muted-foreground hover:text-primary"><Icon className="h-5 w-5" /></a>)}
              </div>
            )}
          </div>
          {groups.map(group => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="mb-4 text-sm font-semibold">{group.title}</h2>
              <ul className="space-y-3">
                {group.links.map(([name, href]) => <li key={href}><Link href={href} className="text-sm text-muted-foreground hover:text-primary">{name}</Link></li>)}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-10 grid gap-4 border-t border-border pt-8 sm:grid-cols-2">
          <Link href="/tienda" className="flex items-center gap-3 rounded-xl border border-border p-4 hover:bg-muted">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <span><strong className="block text-sm">Explora la tienda</strong><span className="text-xs text-muted-foreground">Productos y presentaciones disponibles</span></span>
          </Link>
          <Link href="/recetas" className="flex items-center gap-3 rounded-xl border border-border p-4 hover:bg-muted">
            <BookOpen className="h-5 w-5 text-primary" />
            <span><strong className="block text-sm">Ideas para cocinar</strong><span className="text-xs text-muted-foreground">Recetas e inspiración</span></span>
          </Link>
        </div>
        <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} {siteConfig.legalName ?? siteConfig.name}. Todos los derechos reservados.{siteConfig.ruc ? ` RUC: ${siteConfig.ruc}` : ''}</span>
          <span>Los medios de pago, tarifas y condiciones se confirman antes de comprar.</span>
        </div>
      </div>
    </footer>
  );
}
