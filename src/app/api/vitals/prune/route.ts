import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';


export async function GET(req: NextRequest) {
  // Verify Vercel Cron authorization header in production
  const authHeader = req.headers.get('authorization');
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const deleteResult = await db.webVitalsLog.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: deleteResult.count,
    });
  } catch (error) {
    console.error('Error pruning Web Vitals:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
