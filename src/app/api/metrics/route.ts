// src/app/api/metrics/route.ts
import { NextResponse } from 'next/server';
import { prometheusRegistry } from '@/services/infra/metrics';

export async function GET() {
  try {
    const metrics = await prometheusRegistry.metrics();
    return new NextResponse(metrics, {
      headers: {
        'Content-Type': prometheusRegistry.contentType
      }
    });
  } catch (err: any) {
    return new NextResponse(`Failed to scrape metrics: ${err.message}`, { status: 500 });
  }
}

