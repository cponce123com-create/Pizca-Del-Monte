import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const pages: Record<string, { title: string; intro: string; sections: { heading: string; text: string }[]; cta?: { label: string; href: string } }> = {
  ofertas: { title: 'Ofertas', intro: 'Explora productos con precios especiales cuando estén disponibles.', sections: [{ heading: 'Promociones del catálogo', text: 'Consulta la tienda para conocer los productos y precios publicados. Los descuentos se aplican únicamente cuando aparecen en la ficha del producto.' }], cta: { label: 'Ver productos', href: '/tienda?onSale=true' } },
  packs: { title: 'Packs gourmet', intro: 'Descubre combinaciones de especias, sales y aceites para cocinar o regalar.', sections: [{ heading: 'Elige tu pack', text: 'Los packs disponibles, sus presentaciones y precios se muestran en el catálogo. La disponibilidad depende del inventario registrado.' }], cta: { label: 'Explorar packs', href: '/tienda?category=packs-gourmet' } },
  recetas: { title: 'Recetas e inspiración', intro: 'Ideas para descubrir nuevos sabores con ingredientes de nuestra despensa.', sections: [{ heading: 'Cocina con especias', text: 'Prueba combinaciones de hierbas, ajíes, sales y aceites. Estamos preparando el recetario completo con instrucciones y códigos QR.' }, { heading: 'Encuentra ingredientes', text: 'Mientras incorporamos nuevas recetas, puedes explorar los productos por categoría y presentación.' }], cta: { label: 'Ver ingredientes', href: '/tienda' } },
  'nuestra-historia': { title: 'Nuestra historia', intro: 'Pizca del Monte nace como una propuesta de tienda de especias, sales y aceites gourmet.', sections: [{ heading: 'Sabores que inspiran', text: 'Buscamos acercar ingredientes y combinaciones para la cocina cotidiana. Nuestra historia institucional y los datos de origen se publicarán cuando estén confirmados.' }] },
  contacto: { title: 'Contacto', intro: '¿Tienes consultas sobre productos, presentaciones o pedidos?', sections: [{ heading: 'Atención al cliente', text: 'Estamos preparando los canales oficiales de atención. Para proteger tus datos, no mostramos números, direcciones ni correos de ejemplo como si fueran reales.' }, { heading: 'Consultas sobre pedidos', text: 'Cuando los canales de atención estén habilitados, podrás comunicarte indicando tu número de pedido.' }] },
  'trabaja-con-nosotros': { title: 'Trabaja con nosotros', intro: 'Conoce esta sección de oportunidades.', sections: [{ heading: 'Convocatorias', text: 'Por ahora no hay convocatorias publicadas en esta página. Las oportunidades se anunciarán aquí cuando estén disponibles.' }] },
  prensa: { title: 'Prensa', intro: 'Información institucional y novedades de Pizca del Monte.', sections: [{ heading: 'Comunicados', text: 'Todavía no hay comunicados oficiales publicados.' }] },
  sostenibilidad: { title: 'Sostenibilidad', intro: 'Nuestro espacio para informar sobre prácticas y compromisos verificables.', sections: [{ heading: 'Información en preparación', text: 'Publicaremos información concreta sobre proveedores, envases y prácticas cuando pueda ser respaldada. No presentamos certificaciones o compromisos no verificados.' }] },
  'preguntas-frecuentes': { title: 'Preguntas frecuentes', intro: 'Respuestas a las consultas más habituales de la tienda.', sections: [{ heading: '¿Dónde veo los precios?', text: 'En cada ficha del catálogo. El importe y las presentaciones pueden variar por producto.' }, { heading: '¿Cómo conozco la disponibilidad?', text: 'La ficha del producto indica las presentaciones disponibles según el inventario registrado.' }, { heading: '¿Cómo compro?', text: 'Puedes añadir productos al carrito. Los métodos de pago y entrega solo estarán disponibles cuando sus integraciones estén habilitadas y verificadas.' }] },
  'envios-y-cobertura': { title: 'Envíos y cobertura', intro: 'Información sobre las opciones de entrega.', sections: [{ heading: 'Cobertura', text: 'La disponibilidad, transportista, costo y plazo deben confirmarse durante el proceso de compra. Todavía no se publican tarifas ni tiempos garantizados.' }, { heading: 'Seguimiento', text: 'El seguimiento de envíos estará disponible cuando la integración con el transportista se encuentre configurada y probada.' }] },
  'cambios-y-devoluciones': { title: 'Cambios y devoluciones', intro: 'Información para solicitar atención después de la compra.', sections: [{ heading: 'Condiciones pendientes de publicación', text: 'La política definitiva de cambios y devoluciones está pendiente de aprobación. No se anuncian plazos o excepciones que aún no estén confirmados.' }] },
  'medios-de-pago': { title: 'Medios de pago', intro: 'Consulta los métodos de pago de la tienda.', sections: [{ heading: 'Disponibilidad', text: 'Las opciones efectivamente habilitadas se mostrarán al finalizar el pedido. Mercado Pago, Yape, Plin y transferencias requieren configuración y validación antes de anunciarse como operativas.' }] },
  'facturacion-electronica': { title: 'Facturación electrónica', intro: 'Información sobre comprobantes de pago.', sections: [{ heading: 'Emisión de comprobantes', text: 'La información de emisión electrónica y los datos tributarios oficiales se publicarán cuando la integración correspondiente esté configurada y validada.' }] },
  'terminos-y-condiciones': { title: 'Términos y condiciones', intro: 'Información legal de la tienda en preparación.', sections: [{ heading: 'Documento pendiente', text: 'Los términos comerciales definitivos requieren los datos reales del titular de la tienda y revisión legal antes de su publicación. Este contenido no constituye condiciones contractuales.' }] },
  'politica-de-privacidad': { title: 'Política de privacidad', intro: 'Información sobre el tratamiento de datos personales.', sections: [{ heading: 'Documento pendiente', text: 'La política definitiva debe identificar al responsable, finalidades, proveedores y canales para ejercer derechos. Se publicará antes de operar con datos reales de clientes.' }] },
  'politica-de-cookies': { title: 'Política de cookies', intro: 'Información sobre tecnologías de almacenamiento y seguimiento.', sections: [{ heading: 'Documento pendiente', text: 'La política se completará tras auditar las cookies y servicios efectivamente utilizados por la tienda.' }] },
  'libro-de-reclamaciones': { title: 'Libro de reclamaciones', intro: 'Canal de reclamaciones en preparación.', sections: [{ heading: 'Implementación pendiente', text: 'El Libro de Reclamaciones virtual debe incorporar el formulario y los datos exigibles del proveedor. No presentamos este texto como sustituto de un libro operativo.' }] },
  'mi-cuenta': { title: 'Mi cuenta', intro: 'Estamos preparando un espacio seguro para administrar tu perfil.', sections: [{ heading: 'Acceso seguro', text: 'El panel de clientes estará disponible cuando el inicio de sesión y la verificación de cuentas estén completos.' }] },
  'mis-pedidos': { title: 'Mis pedidos', intro: 'Consulta tus compras desde tu cuenta cuando el acceso esté habilitado.', sections: [{ heading: 'Historial protegido', text: 'Por seguridad, no mostramos pedidos sin autenticar al titular de la cuenta.' }] },
  'mis-direcciones': { title: 'Mis direcciones', intro: 'Administra direcciones de entrega desde tu cuenta.', sections: [{ heading: 'Datos personales', text: 'Esta función requiere inicio de sesión seguro y todavía está en preparación.' }] },
  favoritos: { title: 'Mis favoritos', intro: 'Guarda los productos que más te gustan.', sections: [{ heading: 'Explorar productos', text: 'Puedes marcar productos como favoritos desde sus fichas. La gestión de una lista completa estará disponible próximamente.' }], cta: { label: 'Ir a la tienda', href: '/tienda' } },
  'lista-deseos': { title: 'Lista de deseos', intro: 'Organiza tus productos preferidos.', sections: [{ heading: 'En preparación', text: 'La sincronización de listas entre dispositivos estará disponible cuando se complete el sistema de cuentas.' }], cta: { label: 'Explorar productos', href: '/tienda' } },
  login: { title: 'Iniciar sesión', intro: 'Acceso a la cuenta de cliente en preparación.', sections: [{ heading: 'Protección de tu cuenta', text: 'El acceso estará disponible cuando se hayan validado los flujos de autenticación y recuperación de contraseña.' }] },
  register: { title: 'Crear cuenta', intro: 'El registro seguro de clientes está en preparación.', sections: [{ heading: 'Verificación', text: 'Antes de habilitar el registro público completaremos la confirmación de correo y las medidas de seguridad.' }] },
};

export function generateStaticParams() {
  return Object.keys(pages).map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = pages[slug];
  return { title: page ? `${page.title} | Pizca del Monte` : 'Página no encontrada', description: page?.intro, robots: page && ['terminos-y-condiciones', 'politica-de-privacidad', 'politica-de-cookies', 'libro-de-reclamaciones'].includes(slug) ? { index: false, follow: false } : undefined };
}

export default async function StorefrontInformationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) notFound();
  return (
    <main className="mx-auto min-h-[65vh] max-w-5xl px-4 py-12 sm:py-20">
      <nav className="mb-8 text-sm text-muted-foreground"><Link href="/" className="hover:text-primary">Inicio</Link> / {page.title}</nav>
      <div className="rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-700 p-8 text-white sm:p-14">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-200">Pizca del Monte</span>
        <h1 className="mt-4 font-heading text-3xl font-bold sm:text-5xl">{page.title}</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-emerald-50">{page.intro}</p>
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {page.sections.map(section => (
          <section key={section.heading} className="rounded-2xl border border-border bg-card p-7 shadow-sm">
            <h2 className="font-heading text-xl font-semibold">{section.heading}</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{section.text}</p>
          </section>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap gap-4">
        {page.cta && <Link href={page.cta.href} className="rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90">{page.cta.label}</Link>}
        <Link href="/tienda" className="rounded-xl border px-6 py-3 font-medium hover:bg-muted">Explorar tienda</Link>
      </div>
    </main>
  );
}
