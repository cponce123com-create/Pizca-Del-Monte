import { NextResponse } from 'next/server';

// El cobro, las tarifas y la gestión de pedidos aún no están operativos.
// Mantener el bloqueo en el servidor, incluso para solicitudes directas a la API.
function unavailable() {
  return NextResponse.json(
    { error: 'Las compras en línea aún no están disponibles. Estamos preparando la tienda.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}

export const GET = unavailable;
export const POST = unavailable;
