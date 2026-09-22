import fs from 'node:fs/promises';
import path from 'node:path';
import { NansenLedgerEntry } from './types';

const LEDGER_PATH = path.join(process.cwd(), 'fixtures', 'ledger-audit.json');

export class LedgerManager {
  private static entries: NansenLedgerEntry[] = [];
  private static isInitialized = false;

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;
    try {
      const data = await fs.readFile(LEDGER_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        this.entries = parsed;
      }
    } catch {
      // Fall back to empty or in-memory
    }
    this.isInitialized = true;
  }

  static async record(entry: NansenLedgerEntry): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    this.entries.unshift(entry); // most recent first
    try {
      await fs.writeFile(LEDGER_PATH, JSON.stringify(this.entries, null, 2), 'utf-8');
    } catch {
      // In-memory fallback if disk write fails during edge execution
    }
  }

  static getEntries(): readonly NansenLedgerEntry[] {
    return this.entries;
  }

  static setInitialEntries(entries: NansenLedgerEntry[]): void {
    this.entries = entries;
    this.isInitialized = true;
  }

  static getTotalCalls(): number {
    return this.entries.length;
  }

  static getTotalCreditsUsed(): number {
    return this.entries.reduce((acc, entry) => acc + (entry.creditsUsed || 0), 0);
  }

  static getEntriesByCase(caseId: string): NansenLedgerEntry[] {
    return this.entries.filter((e) => e.caseId === caseId);
  }
}
