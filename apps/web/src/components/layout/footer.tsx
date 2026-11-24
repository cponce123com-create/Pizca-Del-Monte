import Link from 'next/link';
import { Facebook, Instagram, Music2, Youtube, Mail, MapPin, BookOpen, ShoppingBag, Leaf, ArrowUpRight } from 'lucide-react';
import { siteConfig } from '@/lib/site-config';

const groups = [
  { title: 'Empresa', links: [['Nuestra historia', '/nuestra-historia'], ['Contacto', '/contacto'], ['Sostenibilidad', '/sostenibilidad'], ['Prensa', '/prensa'], ['Trabaja con nosotros', '/trabaja-con-nosotros']] },
  { title: 'Ayuda', links: [['Preguntas frecuentes', '/preguntas-frecuentes'], ['Envíos y cobertura', '/envios-y-cobertura'], ['Cambios y devoluciones', '/cambios-y-devoluciones'], ['Medios de pago', '/medios-de-pago'], ['Facturación electrónica', '/facturacion-electronica']] },
  { title: 'Información legal', links: [['Términos y condiciones', '/terminos-y-condiciones'], ['Privacidad', '/politica-de-privacidad'], ['Cookies', '/politica-de-cookies'], ['Libro de Reclamaciones', '/libro-de-reclamaciones']] },
  { title: 'Mi cuenta', links: [['Mi cuenta', '/mi-cuenta'], ['Mis pedidos', '/mis-pedidos'], ['Mis direcciones', '/mis-direcciones'], ['Favoritos', '/favoritos']] },
] as const;

const social = [
  { name: 'Facebook', href: siteConfig.social.facebook, Icon: Facebook },
  { name: 'Instagram', href: siteConfig.social.instagram, Icon: Instagram },
  { name: 'TikTok', href: siteConfig.social.tiktok, Icon: Music2 },
  { name: 'YouTube', href: siteConfig.social.youtube, Icon: Youtube },
].filter((item): item is typeof item & { href: string } => Boolean(item.href));

export function Footer() {
  return (
    <footer className="border-t border-border bg-ivory-50" role="contentinfo">
      <div className="container py-12 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.35fr_2fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3" aria-label="Pizca del Monte - Inicio">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm"><Leaf className="h-5 w-5" /></span>
              <span className="flex flex-col font-heading leading-none"><span className="text-xl font-semibold text-foreground">Pizca</span><span className="text-sm italic text-primary">del Monte</span></span>
            </Link>
            <p className="mt-5 max-w-sm font-heading text-xl leading-snug text-foreground">Pequeñas maravillas, gran origen.</p>
            <p className="mt-3 max-w-sm text-sm leading-7 text-muted-foreground">Especias, sales y aceites gourmet para descubrir nuevas formas de cocinar con identidad peruana.</p>
            {siteConfig.email && <a href={`mailto:${siteConfig.email}`} className="mt-5 flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary"><Mail className="h-4 w-4 text-primary" />{siteConfig.email}</a>}
            {siteConfig.address && <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{siteConfig.address}</p>}
            {social.length > 0 && <div className="mt-6 flex flex-wrap gap-2">{social.map(({ name, href, Icon }) => <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={name} className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"><Icon className="h-4 w-4" /></a>)}</div>}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {groups.map(group => <nav key={group.title} aria-label={group.title}><h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-primary">{group.title}</h2><ul className="space-y-3">{group.links.map(([name, href]) => <li key={href}><Link href={href} className="text-sm text-muted-foreground transition-colors hover:text-primary">{name}</Link></li>)}</ul></nav>)}
          </div>
        </div>
        <div className="mt-12 grid gap-4 border-t border-border pt-8 sm:grid-cols-2">
          <Link href="/tienda" className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"><span className="flex items-center gap-3"><ShoppingBag className="h-5 w-5 text-primary" /><span><strong className="block text-sm">Explora la tienda</strong><span className="text-xs text-muted-foreground">Productos y presentaciones disponibles</span></span></span><ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>
          <Link href="/recetas" className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"><span className="flex items-center gap-3"><BookOpen className="h-5 w-5 text-primary" /><span><strong className="block text-sm">Ideas para cocinar</strong><span className="text-xs text-muted-foreground">Recetas e inspiración</span></span></span><ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>
        </div>
        <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} {siteConfig.legalName ?? siteConfig.name}. Todos los derechos reservados.{siteConfig.ruc ? ` RUC: ${siteConfig.ruc}` : ''}</span><span>Los medios de pago, tarifas y condiciones se confirman antes de comprar.</span></div>
      </div>
    </footer>
  );
}
