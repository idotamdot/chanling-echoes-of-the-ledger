export interface NansenLedgerEntry {
  id: string;
  timestamp: string;
  endpoint: string;
  caseId: string;
  purpose: 'CASE_DISCOVERY' | 'TRANSACTION_INGESTION' | 'BALANCE_RECONSTRUCTION' | 'COUNTERPARTY_ANALYSIS' | 'FIXTURE_VALIDATION';
  status: 'SUCCESS' | 'RATE_LIMITED' | 'FAILED';
  httpStatus: number;
  creditsUsed: number;
  requestDurationMs: number;
}

export interface NansenBalanceSnapshot {
  token_address: string;
  token_symbol: string;
  balance: string;
  balance_usd: number;
  date: string;
}

export interface NansenTransactionItem {
  hash: string;
  block_timestamp: string;
  from_address: string;
  to_address: string;
  value_usd: number;
  method?: string;
  token_symbol?: string;
  token_amount?: string;
  gas_usd?: number;
  is_exploit_vector?: boolean;
}

export interface NansenCounterpartyItem {
  address: string;
  interaction_count: number;
  total_volume_usd: number;
  first_interaction: string;
  last_interaction: string;
  classification?: 'REPLAY_BOT' | 'ATTACKER_CORE' | 'ARBITRAGEUR' | 'WHITE_HAT' | 'VICTIM' | 'MIXER_ROUTER';
  label?: string;
}

export interface ForensicCaseMetadata {
  caseId: string;
  targetName: string;
  address: string;
  chain: string;
  incidentDate: string;
  exploitBlock: number;
  lossEstimateUsd: number;
  recoveredUsd: number;
  vectorClassification: 'CALLDATA_REPLAY_SWARM' | 'FLASH_LOAN_MANIPULATION' | 'ROUTING_LEAK_DEFECT';
  description: string;
  biologicalTaxonomy: {
    phylum: string;
    specimenCode: string;
    morphology: string;
    necrosisFactor: number; // 0.0 - 1.0 (reserve collapse severity)
    parasiteDensity: number; // 0.0 - 1.0 (number of distinct replay exploiters)
    respirationBpm: number; // calculated from tx frequency peak
    toxicityLevel: number; // 0.0 - 1.0
  };
}

export interface ForensicCasePayload {
  metadata: ForensicCaseMetadata;
  balances?: NansenBalanceSnapshot[];
  counterparties: {
    data: NansenCounterpartyItem[];
    pagination?: { total: number; limit: number };
  };
  transactions: {
    data: NansenTransactionItem[];
    pagination?: { total: number; limit: number };
  };
}
