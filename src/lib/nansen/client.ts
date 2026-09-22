import { LedgerManager } from './ledger';
import { NansenLedgerEntry } from './types';

const NANSEN_BASE_URL = 'https://api.nansen.ai/api/v1';

export class NansenForensicClient {
  private apiKey: string;

  constructor(customKey?: string) {
    const key = customKey || process.env.NANSEN_API_KEY;
    if (!key) {
      throw new Error('MISSING_NANSEN_API_KEY: Server client requires valid key in environment.');
    }
    this.apiKey = key;
  }

  async post<TRequest extends object, TResponse>(
    endpoint: string,
    body: TRequest,
    meta: { caseId: string; purpose: NansenLedgerEntry['purpose']; estimatedCredits: number }
  ): Promise<TResponse> {
    const start = performance.now();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${NANSEN_BASE_URL}${cleanEndpoint}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
        },
        body: JSON.stringify(body),
      });

      const duration = Math.round(performance.now() - start);

      await LedgerManager.record({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        endpoint: cleanEndpoint,
        caseId: meta.caseId,
        purpose: meta.purpose,
        status: response.ok ? 'SUCCESS' : response.status === 429 ? 'RATE_LIMITED' : 'FAILED',
        httpStatus: response.status,
        creditsUsed: response.ok ? meta.estimatedCredits : 0,
        requestDurationMs: duration,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`NANSEN_API_ERROR [${response.status}] at ${endpoint}: ${errorText}`);
      }

      return (await response.json()) as TResponse;
    } catch (error) {
      if (!(error instanceof Error && error.message.startsWith('NANSEN_API_ERROR'))) {
        await LedgerManager.record({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          endpoint: cleanEndpoint,
          caseId: meta.caseId,
          purpose: meta.purpose,
          status: 'FAILED',
          httpStatus: 0,
          creditsUsed: 0,
          requestDurationMs: Math.round(performance.now() - start),
        });
      }
      throw error;
    }
  }
}
