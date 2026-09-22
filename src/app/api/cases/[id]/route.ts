import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { CANONICAL_CASES, computeOrganismVitals } from '@/src/lib/forensic/taxonomy';
import { ForensicCasePayload } from '@/src/lib/nansen/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const canonicalMeta = CANONICAL_CASES[id] || CANONICAL_CASES.CASE_NOMAD_01;

  let fixtureFilename = 'nomad-bridge.json';
  if (id === 'CASE_EULER_02') fixtureFilename = 'euler-finance.json';
  if (id === 'CASE_TRANSIT_03') fixtureFilename = 'transit-swap.json';

  try {
    const fixturePath = path.join(process.cwd(), 'fixtures', fixtureFilename);
    const content = await fs.readFile(fixturePath, 'utf-8');
    const parsed: ForensicCasePayload = JSON.parse(content);
    const vitals = computeOrganismVitals(
      canonicalMeta,
      parsed.transactions?.data,
      parsed.counterparties?.data,
      parsed.balances
    );

    return NextResponse.json({
      ...parsed,
      metadata: canonicalMeta,
      vitals,
    });
  } catch (err) {
    const vitals = computeOrganismVitals(canonicalMeta);
    return NextResponse.json({
      metadata: canonicalMeta,
      vitals,
      counterparties: { data: [] },
      transactions: { data: [] },
      error: 'FIXTURE_NOT_LOADED_USING_METADATA',
    });
  }
}
