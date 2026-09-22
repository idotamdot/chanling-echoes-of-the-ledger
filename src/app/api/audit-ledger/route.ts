import { NextResponse } from 'next/server';
import { LedgerManager } from '@/src/lib/nansen/ledger';

export async function GET() {
  await LedgerManager.initialize();
  const entries = LedgerManager.getEntries();
  return NextResponse.json({
    total: entries.length,
    creditsUsed: LedgerManager.getTotalCreditsUsed(),
    entries,
  });
}
