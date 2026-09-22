import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { LedgerManager } from './src/lib/nansen/ledger';
import { CANONICAL_CASES, computeOrganismVitals } from './src/lib/forensic/taxonomy';
import { NansenForensicClient } from './src/lib/nansen/client';

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// API: Get audit ledger entries
app.get('/api/audit-ledger', async (_req, res) => {
  try {
    await LedgerManager.initialize();
    const entries = LedgerManager.getEntries();
    res.json({
      total: entries.length,
      creditsUsed: LedgerManager.getTotalCreditsUsed(),
      entries,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read audit ledger', details: String(err) });
  }
});

// API: Get case data with computed vitals
app.get('/api/cases/:id', async (req, res) => {
  const caseId = req.params.id;
  const canonicalMeta = CANONICAL_CASES[caseId] || CANONICAL_CASES.CASE_NOMAD_01;

  let fixtureFilename = 'nomad-bridge.json';
  if (caseId === 'CASE_EULER_02') fixtureFilename = 'euler-finance.json';
  if (caseId === 'CASE_TRANSIT_03') fixtureFilename = 'transit-swap.json';

  try {
    const fixturePath = path.join(process.cwd(), 'fixtures', fixtureFilename);
    const content = await fs.readFile(fixturePath, 'utf-8');
    const parsed = JSON.parse(content);
    const vitals = computeOrganismVitals(
      canonicalMeta,
      parsed.transactions?.data,
      parsed.counterparties?.data,
      parsed.balances
    );

    res.json({
      ...parsed,
      metadata: canonicalMeta,
      vitals,
    });
  } catch (err) {
    const vitals = computeOrganismVitals(canonicalMeta);
    res.json({
      metadata: canonicalMeta,
      vitals,
      counterparties: { data: [] },
      transactions: { data: [] },
      fallback: true,
    });
  }
});

// API: Run live Nansen probe (Strict - No demo/simulated fallback)
app.post('/api/probe', async (req, res) => {
  const { caseId, apiKey } = req.body;
  const targetCase = CANONICAL_CASES[caseId] || CANONICAL_CASES.CASE_NOMAD_01;
  const keyToUse = apiKey || process.env.NANSEN_API_KEY;

  if (!keyToUse) {
    res.status(401).json({
      success: false,
      error: 'MISSING_NANSEN_API_KEY: A valid Nansen API key is required to query Nansen. Please configure NANSEN_API_KEY in .env or enter your key in the console.',
    });
    return;
  }

  try {
    const client = new NansenForensicClient(keyToUse);
    const counterparties = await client.post(
      '/profiler/address/counterparties',
      { address: targetCase.address, chain: targetCase.chain, limit: 10 },
      { caseId: targetCase.caseId, purpose: 'COUNTERPARTY_ANALYSIS', estimatedCredits: 5 }
    );

    res.json({
      success: true,
      mode: 'LIVE_NANSEN_API',
      data: counterparties,
    });
  } catch (err) {
    res.status(502).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// API: Real On-Chain RPC Query (Queries live Ethereum Mainnet RPC directly)
app.get('/api/chain/query/:address', async (req, res) => {
  const address = req.params.address;
  try {
    const rpcUrl = 'https://cloudflare-eth.com';
    // 1. Get balance
    const balanceRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: 1,
      }),
    });
    const balanceJson = await balanceRes.json();
    const balanceWei = BigInt(balanceJson.result || '0x0');
    const balanceEth = Number(balanceWei) / 1e18;

    // 2. Get latest block
    const blockRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 2,
      }),
    });
    const blockJson = await blockRes.json();
    const latestBlock = parseInt(blockJson.result || '0x0', 16);

    // 3. Get contract code existence
    const codeRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getCode',
        params: [address, 'latest'],
        id: 3,
      }),
    });
    const codeJson = await codeRes.json();
    const bytecodeLength = (codeJson.result?.length || 2) / 2 - 1;

    res.json({
      success: true,
      address,
      liveEthereumRpc: 'https://cloudflare-eth.com',
      currentBlock: latestBlock,
      balanceEth: balanceEth.toFixed(6),
      isContract: bytecodeLength > 0,
      bytecodeBytes: bytecodeLength,
      queriedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to query live Ethereum RPC node',
      details: String(err),
    });
  }
});

async function start() {
  await LedgerManager.initialize();

  // Vite development middleware
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(port, '0.0.0.0', () => {
    console.log(`[Chainling] Forensic Server active at http://0.0.0.0:${port}`);
  });
}

start().catch((err) => {
  console.error('[Chainling] Failed to launch server:', err);
  process.exit(1);
});
