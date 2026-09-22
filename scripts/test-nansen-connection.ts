import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { NansenForensicClient } from '../src/lib/nansen/client';

dotenv.config();

async function probe() {
  const nomadAddress = '0x88a69b4e698a4b090df6cf5bd7b2d47325ad30a3'; // Nomad ERC20 Bridge
  console.log('======================================================');
  console.log('Chainling Forensic Ingestion: Nansen Probe');
  console.log(`Target: Nomad ERC20 Bridge (${nomadAddress})`);
  console.log('======================================================');

  const client = new NansenForensicClient();

  console.log('Step 1/2: Ingesting Counterparties from /profiler/address/counterparties...');
  const counterparties = await client.post(
    '/profiler/address/counterparties',
    { address: nomadAddress, chain: 'ethereum', limit: 20 },
    { caseId: 'CASE_NOMAD_01', purpose: 'COUNTERPARTY_ANALYSIS', estimatedCredits: 5 }
  );

  console.log('Step 2/2: Ingesting Transactions from /profiler/address/transactions...');
  const transactions = await client.post(
    '/profiler/address/transactions',
    { address: nomadAddress, chain: 'ethereum', limit: 50 },
    { caseId: 'CASE_NOMAD_01', purpose: 'TRANSACTION_INGESTION', estimatedCredits: 1 }
  );

  const fixturePayload = {
    metadata: {
      caseId: 'CASE_NOMAD_01',
      targetName: 'Nomad ERC20 Bridge',
      address: nomadAddress,
      chain: 'ethereum',
      recordedAt: new Date().toISOString(),
    },
    counterparties,
    transactions,
  };

  const fixturePath = path.join(process.cwd(), 'fixtures', 'nomad-bridge.json');
  await fs.writeFile(fixturePath, JSON.stringify(fixturePayload, null, 2), 'utf-8');

  console.log(`[SUCCESS] Saved verified probe fixture to ${fixturePath}`);
}

probe().catch((err) => {
  console.error('[PROBE_FAILED]:', err);
  process.exit(1);
});
