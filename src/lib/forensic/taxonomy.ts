import { NansenTransactionItem, NansenCounterpartyItem, NansenBalanceSnapshot, ForensicCaseMetadata } from '../nansen/types';

export interface OrganismVitals {
  heartRateBpm: number;
  toxicityScore: number; // 0 - 100
  necrosisIndex: number; // 0 - 100%
  parasiticVectorCount: number;
  outflowVelocityUsdPerMin: number;
  cellularState: 'HOMEOSTATIC' | 'ACUTE_PARASITIC' | 'HEMORRHAGING' | 'NECROTIC' | 'CONVALESCENT';
  primaryVector: string;
  morphologyDescription: string;
}

export interface ForensicSpecimenClassification {
  code: string;
  latinName: string;
  commonName: string;
  phylum: string;
  vectorType: string;
  symptoms: string[];
  vitals: OrganismVitals;
}

export const CANONICAL_CASES: Record<string, ForensicCaseMetadata> = {
  CASE_NOMAD_01: {
    caseId: 'CASE_NOMAD_01',
    targetName: 'Nomad ERC20 Bridge',
    address: '0x88a69b4e698a4b090df6cf5bd7b2d47325ad30a3',
    chain: 'ethereum',
    incidentDate: '2022-08-01T21:32:00Z',
    exploitBlock: 15259101,
    lossEstimateUsd: 190300000,
    recoveredUsd: 36000000,
    vectorClassification: 'CALLDATA_REPLAY_SWARM',
    description: 'A faulty initialization allowed 0x00 message root confirmation. Over 300 distinct copycat addresses replayed identical calldata with their own addresses substituted, draining ~$190M within 3 hours.',
    biologicalTaxonomy: {
      phylum: 'Viral Calldata Bloom (Swarm Replicans)',
      specimenCode: 'SPEC-NOMAD-88A6',
      morphology: 'Radial filamentous swarm with multi-tentacle decentralized calldata replication.',
      necrosisFactor: 0.98,
      parasiteDensity: 0.92,
      respirationBpm: 194,
      toxicityLevel: 0.96,
    },
  },
  CASE_EULER_02: {
    caseId: 'CASE_EULER_02',
    targetName: 'Euler Finance Vault',
    address: '0x27182842E098f60e3D5767947124971bac70ce82',
    chain: 'ethereum',
    incidentDate: '2023-03-13T08:50:00Z',
    exploitBlock: 16817996,
    lossEstimateUsd: 197000000,
    recoveredUsd: 197000000,
    vectorClassification: 'FLASH_LOAN_MANIPULATION',
    description: 'Flash-loan powered donation to eToken balance created artificial insolvent health states triggering self-liquidation with collateral bonuses. Full restitution was negotiated and returned.',
    biologicalTaxonomy: {
      phylum: 'Endoparasitic Hyper-Leverage Helminth',
      specimenCode: 'SPEC-EULER-2718',
      morphology: 'Coiled segmented macro-organism displaying dramatic oscillatory dilation during flash injection.',
      necrosisFactor: 0.89,
      parasiteDensity: 0.35,
      respirationBpm: 142,
      toxicityLevel: 0.45,
    },
  },
  CASE_TRANSIT_03: {
    caseId: 'CASE_TRANSIT_03',
    targetName: 'Transit Swap Router',
    address: '0xed1e73742279feab4020935f7375990349381aa6',
    chain: 'ethereum',
    incidentDate: '2022-10-01T18:14:00Z',
    exploitBlock: 15654000,
    lossEstimateUsd: 28900000,
    recoveredUsd: 18900000,
    vectorClassification: 'ROUTING_LEAK_DEFECT',
    description: 'Arbitrary external transfer routing flaw that allowed calling transferFrom on approved user wallets directly to an unverified recipient sink.',
    biologicalTaxonomy: {
      phylum: 'Vascular Siphon Leech',
      specimenCode: 'SPEC-TRANSIT-ED1E',
      morphology: 'Asymmetric siphon funnel exhibiting targeted puncture nodes across approved allowance conduits.',
      necrosisFactor: 0.74,
      parasiteDensity: 0.48,
      respirationBpm: 118,
      toxicityLevel: 0.81,
    },
  },
};

export function computeOrganismVitals(
  metadata: ForensicCaseMetadata,
  transactions: NansenTransactionItem[] = [],
  counterparties: NansenCounterpartyItem[] = [],
  balances: NansenBalanceSnapshot[] = []
): OrganismVitals {
  const txCount = transactions.length;
  const totalVolume = transactions.reduce((sum, tx) => sum + (tx.value_usd || 0), 0);
  
  // Calculate BPM based on transaction cadence
  let computedBpm = metadata.biologicalTaxonomy.respirationBpm;
  if (txCount > 0) {
    const replayCount = transactions.filter((t) => t.is_exploit_vector || (t.value_usd > 10000)).length;
    computedBpm = Math.min(220, Math.max(55, Math.round(70 + (replayCount / txCount) * 110 + (txCount / 2))));
  }

  // Calculate necrosis based on initial vs remaining balance or metadata
  let necrosisIndex = Math.round(metadata.biologicalTaxonomy.necrosisFactor * 100);
  if (balances.length >= 2) {
    const initial = balances[0].balance_usd;
    const finalVal = balances[balances.length - 1].balance_usd;
    if (initial > 0) {
      necrosisIndex = Math.min(100, Math.max(0, Math.round(((initial - finalVal) / initial) * 100)));
    }
  }

  // Count parasitic vectors
  const parasiticVectors = counterparties.filter((c) => 
    c.classification === 'REPLAY_BOT' || c.classification === 'ATTACKER_CORE'
  ).length || Math.round(counterparties.length * metadata.biologicalTaxonomy.parasiteDensity);

  // Outflow velocity
  const outflowVelocity = Math.round(totalVolume / Math.max(1, txCount > 0 ? txCount * 1.5 : 30));

  // Determine biological cellular state
  let cellularState: OrganismVitals['cellularState'] = 'HOMEOSTATIC';
  if (metadata.recoveredUsd >= metadata.lossEstimateUsd * 0.9) {
    cellularState = 'CONVALESCENT';
  } else if (necrosisIndex >= 90) {
    cellularState = 'NECROTIC';
  } else if (computedBpm > 160 || outflowVelocity > 500000) {
    cellularState = 'HEMORRHAGING';
  } else if (parasiticVectors > 3) {
    cellularState = 'ACUTE_PARASITIC';
  }

  return {
    heartRateBpm: computedBpm,
    toxicityScore: Math.round(metadata.biologicalTaxonomy.toxicityLevel * 100),
    necrosisIndex,
    parasiticVectorCount: Math.max(parasiticVectors, 1),
    outflowVelocityUsdPerMin: outflowVelocity,
    cellularState,
    primaryVector: metadata.vectorClassification.replace(/_/g, ' '),
    morphologyDescription: metadata.biologicalTaxonomy.morphology,
  };
}
