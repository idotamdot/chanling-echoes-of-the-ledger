# Chainling: On-Chain Forensic Specimen & Audit Engine

Chainling maps on-chain forensic exploit telemetry (transactions, historical balance collapses, and counterparty graphs) into a biological specimen visualization paired with Web Audio biosonification, backed by an append-only Nansen audit ledger.

---

## 1. Repository Layout

```text
chainling/
├── .env.example
├── README.md
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── fixtures/
│   ├── nomad-bridge.json
│   ├── euler-finance.json
│   ├── transit-swap.json
│   └── ledger-audit.json
├── scripts/
│   ├── test-nansen-connection.ts
│   └── run-case-ingestion.ts
└── src/
    ├── app/
    │   ├── api/
    │   │   ├── audit-ledger/route.ts
    │   │   └── cases/[id]/route.ts
    │   ├── layout.tsx
    │   └── page.tsx
    └── lib/
        ├── nansen/
        │   ├── client.ts
        │   ├── ledger.ts
        │   └── types.ts
        ├── forensic/
        │   └── taxonomy.ts
        └── audio/
            └── vital-synth.ts
```

---

## 2. Canonical Exploits & Forensic Dynamics

1. **Nomad Bridge** (`0x88a69b4e698a4b090df6cf5bd7b2d47325ad30a3`)
   - *Phylum:* Viral Calldata Bloom (`SPEC-NOMAD-88A6`)
   - *Forensic Dynamic:* 0x00 message root vulnerability triggering a 300+ address copycat calldata replay swarm. Drained $190.3M within 3 hours.
   - *Biological Trait:* High-frequency fibrillation (194 BPM), 98% cellular necrosis.

2. **Euler Finance** (`0x27182842E098f60e3D5767947124971bac70ce82`)
   - *Phylum:* Endoparasitic Hyper-Leverage Helminth (`SPEC-EULER-2718`)
   - *Forensic Dynamic:* Flash-loan liquidation manipulation via `donateToReserves`, draining $197M followed by 100% white-hat restitution.
   - *Biological Trait:* Oscillatory dilation during flash injection, convalescent recovery state.

3. **Transit Swap** (`0xed1e73742279feab4020935f7375990349381aa6`)
   - *Phylum:* Vascular Siphon Leech (`SPEC-TRANSIT-ED1E`)
   - *Forensic Dynamic:* Unchecked external `transferFrom` callBytes vulnerability draining approved user balances.
   - *Biological Trait:* Localized vascular siphon puncture nodes.

---

## 3. Rate Limit Enforcement & Immutable Audit Ledger

Nansen's API enforces strict limits:
- **30 requests/second**
- **600 requests/minute**

All outbound requests pass through `NansenForensicClient` (`src/lib/nansen/client.ts`), which automatically writes every interaction to `fixtures/ledger-audit.json` with:
- Unique UUID
- High-precision timestamp
- Target Endpoint
- Case ID
- Purpose (`COUNTERPARTY_ANALYSIS`, `TRANSACTION_INGESTION`, `BALANCE_RECONSTRUCTION`, `FIXTURE_VALIDATION`)
- HTTP Status & Execution Duration (ms)
- Estimated credits consumed

---

## 4. Web Audio Vital Synthesizer

The `VitalSynthesizer` (`src/lib/audio/vital-synth.ts`) translates on-chain parameters into live audio:
- **Dual-transient Heartbeat ("lub-dub"):** Pulsed according to the exploit transaction cadence (60 to 220 BPM).
- **Toxic Drone:** 55Hz low-frequency sawtooth drone passing through a dynamic biquad filter with Q resonance that opens from 120Hz to 1,800Hz as the toxicity score rises.
- **Parasitic Artifacts:** Micro-clicks and pitch chirps triggered during high replay density.
- **Oscilloscope / ECG Analyser:** Built-in Web Audio `AnalyserNode` rendering a real-time cardiac trace on canvas.

---

## 5. Running the Probe Script

Set your Nansen API key in `.env`:
```bash
NANSEN_API_KEY="your-nansen-api-key"
```

Execute the single probe:
```bash
pnpm tsx scripts/test-nansen-connection.ts
```

Execute the full 3-case pipeline:
```bash
pnpm tsx scripts/run-case-ingestion.ts
```

Launch the interactive forensic workstation:
```bash
pnpm dev
# Opens at http://localhost:3000
```
