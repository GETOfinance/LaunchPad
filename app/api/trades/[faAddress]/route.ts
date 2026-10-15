import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { boundedInt } from '@/lib/api';

// GET /api/trades/:faAddress - Trades for specific token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ faAddress: string }> }
) {
  try {
    const { faAddress } = await params;
    const { searchParams } = new URL(request.url);
    const limit = boundedInt(searchParams.get('limit'), 50, 100);
    const offset = boundedInt(searchParams.get('offset'), 0, 10_000);

    const trades = await prisma.trade.findMany({
      where: { fa_address: faAddress },
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

    const totalTrades = await prisma.trade.count({
      where: { fa_address: faAddress }
    });

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
    console.error('Error fetching trades for token:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch trades for token'
    }, { status: 500 });
  }
}
