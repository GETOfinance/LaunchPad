import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { boundedInt } from '@/lib/api';

// GET /api/trades/recent - Recent 50 trades across all tokens
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = boundedInt(searchParams.get('limit'), 50, 100);
    const offset = boundedInt(searchParams.get('offset'), 0, 10_000);

    const trades = await prisma.trade.findMany({
      take: limit,
      skip: offset,
      orderBy: { created_at: 'desc' },
      include: {
        fa: {
          select: {
            name: true,
            symbol: true
          }
        }
      }
    });

    const totalTrades = await prisma.trade.count();

    return NextResponse.json({
      success: true,
      data: {
        trades,
        pagination: {
          total: totalTrades,
          limit,
          offset,
          hasMore: offset + limit < totalTrades
        }
      }
    });
  } catch (error) {
    console.error('Error fetching recent trades:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch recent trades'
    }, { status: 500 });
  }
}
