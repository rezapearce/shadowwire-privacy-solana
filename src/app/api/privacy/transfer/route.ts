/**
 * API Route for ShadowWire Privacy Transfer
 * Handles client-side requests for privacy operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrivacyService } from '@/lib/server/privacy-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, amount } = body;

    if (!walletAddress || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters: walletAddress, amount' },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount: must be a positive number' },
        { status: 400 }
      );
    }

    // Execute privacy transfer
    const privacyService = PrivacyService.getInstance();
    const result = await privacyService.executePrivacyTransfer({
      walletAddress,
      amount,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        txSignature: result.txSignature,
        proofPda: result.proofPda,
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Privacy transfer failed' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Privacy transfer API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Missing walletAddress parameter' },
        { status: 400 }
      );
    }

    // Get wallet balance
    const privacyService = PrivacyService.getInstance();
    const balance = await privacyService.getWalletBalance(walletAddress);

    return NextResponse.json({
      success: true,
      balance: {
        available: balance.available,
        deposited: balance.deposited,
      },
      error: balance.error,
    });

  } catch (error) {
    console.error('Privacy balance API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
