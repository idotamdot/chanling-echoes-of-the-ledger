import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { NansenForensicClient } from '../src/lib/nansen/client';
import { LedgerManager } from '../src/lib/nansen/ledger';

dotenv.config();

interface CaseDefinition {
  caseId: string;
  name: string;
  address: string;
  chain: string;
  fixtureFile: string;
}

const CASES: CaseDefinition[] = [
  {
    caseId: 'CASE_NOMAD_01',
    name: 'Nomad ERC20 Bridge',
    address: '0x88a69b4e698a4b090df6cf5bd7b2d47325ad30a3',
    chain: 'ethereum',
    fixtureFile: 'nomad-bridge.json',
  },
  {
    caseId: 'CASE_EULER_02',
    name: 'Euler Finance Vault',
    address: '0x27182842E098f60e3D5767947124971bac70ce82',
    chain: 'ethereum',
    fixtureFile: 'euler-finance.json',
  },
  {
    caseId: 'CASE_TRANSIT_03',
    name: 'Transit Swap Router',
    address: '0xed1e73742279feab4020935f7375990349381aa6',
    chain: 'ethereum',
    fixtureFile: 'transit-swap.json',
  },
];

async function runFullIngestion() {
  console.log('===========================================================');
  console.log('Chainling: Multi-Case Ingestion Pipeline');
  console.log(`Cases scheduled: ${CASES.length}`);
  console.log('===========================================================');

  const client = new NansenForensicClient();

  for (const c of CASES) {
    console.log(`\nProcessing ${c.name} [${c.address}]...`);

    try {
      console.log(`  -> Fetching counterparties...`);
      const counterparties = await client.post(
        '/profiler/address/counterparties',
        { address: c.address, chain: c.chain, limit: 20 },
        { caseId: c.caseId, purpose: 'COUNTERPARTY_ANALYSIS', estimatedCredits: 5 }
      );

      console.log(`  -> Fetching transactions...`);
      const transactions = await client.post(
        '/profiler/address/transactions',
        { address: c.address, chain: c.chain, limit: 50 },
        { caseId: c.caseId, purpose: 'TRANSACTION_INGESTION', estimatedCredits: 1 }
      );

      console.log(`  -> Fetching historical balances...`);
      const balances = await client.post(
        '/profiler/address/historical-balances',
        { address: c.address, chain: c.chain },
        { caseId: c.caseId, purpose: 'BALANCE_RECONSTRUCTION', estimatedCredits: 10 }
      );

      const fixturePayload = {
        metadata: {
          caseId: c.caseId,
          targetName: c.name,
          address: c.address,
          chain: c.chain,
          updatedAt: new Date().toISOString(),
        },
        balances,
        counterparties,
        transactions,
      };

      const outPath = path.join(process.cwd(), 'fixtures', c.fixtureFile);
      await fs.writeFile(outPath, JSON.stringify(fixturePayload, null, 2), 'utf-8');
      console.log(`  [OK] Saved to ${outPath}`);
    } catch (err) {
      console.error(`  [WARN] Failed to ingest ${c.caseId}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log('\n===========================================================');
  console.log(`Ingestion run completed. Total audit entries: ${LedgerManager.getTotalCalls()}`);
  console.log('===========================================================');
}

runFullIngestion().catch((e) => {
  console.error('Fatal error running case ingestion:', e);
  process.exit(1);
});
