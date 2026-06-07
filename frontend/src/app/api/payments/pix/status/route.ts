import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MP_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN!;

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${MP_TOKEN}` },
  });
  if (!res.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const data = await res.json();
  return NextResponse.json({ status: data.status });
}
