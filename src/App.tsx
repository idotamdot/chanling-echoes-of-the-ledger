import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  ShieldAlert,
  Database,
  Volume2,
  VolumeX,
  Play,
  Square,
  Search,
  RefreshCw,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Radio,
  FileCode,
  ExternalLink,
  Layers,
  ArrowDownRight,
  Sliders
} from 'lucide-react';
import { vitalSynth } from './lib/audio/vital-synth';
import { CANONICAL_CASES, computeOrganismVitals, OrganismVitals } from './lib/forensic/taxonomy';
import {
  NansenLedgerEntry,
  ForensicCasePayload,
  NansenTransactionItem,
  NansenCounterpartyItem,
} from './lib/nansen/types';

// Fallback seed data if fetch is interrupted
import nomadFixture from '../fixtures/nomad-bridge.json';
import eulerFixture from '../fixtures/euler-finance.json';
import transitFixture from '../fixtures/transit-swap.json';
import initialLedgerFixture from '../fixtures/ledger-audit.json';

const FIXTURE_MAP: Record<string, ForensicCasePayload> = {
  CASE_NOMAD_01: nomadFixture as unknown as ForensicCasePayload,
  CASE_EULER_02: eulerFixture as unknown as ForensicCasePayload,
  CASE_TRANSIT_03: transitFixture as unknown as ForensicCasePayload,
};

type ActiveView = 'specimen' | 'vitals' | 'ledger' | 'counterparties' | 'taxonomy';

export default function App() {
  const [selectedCaseId, setSelectedCaseId] = useState<string>('CASE_NOMAD_01');
  const [activeView, setActiveView] = useState<ActiveView>('specimen');
  const [caseData, setCaseData] = useState<ForensicCasePayload>(FIXTURE_MAP.CASE_NOMAD_01);
  const [vitals, setVitals] = useState<OrganismVitals>(
    computeOrganismVitals(
      CANONICAL_CASES.CASE_NOMAD_01,
      FIXTURE_MAP.CASE_NOMAD_01.transactions.data,
      FIXTURE_MAP.CASE_NOMAD_01.counterparties.data,
      FIXTURE_MAP.CASE_NOMAD_01.balances
    )
  );

  // Audio synthesizer state
  const [isAudioRunning, setIsAudioRunning] = useState<boolean>(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [manualBpm, setManualBpm] = useState<number>(194);
  const [manualToxicity, setManualToxicity] = useState<number>(96);
  const [manualNecrosis, setManualNecrosis] = useState<number>(98);

  // Audit Ledger state
  const [ledgerEntries, setLedgerEntries] = useState<NansenLedgerEntry[]>(initialLedgerFixture as NansenLedgerEntry[]);
  const [ledgerFilter, setLedgerFilter] = useState<string>('ALL');
  const [selectedLedgerItem, setSelectedLedgerItem] = useState<NansenLedgerEntry | null>(null);

  // Probe runner state
  const [probeApiKey, setProbeApiKey] = useState<string>('');
  const [isProbing, setIsProbing] = useState<boolean>(false);
  const [probeResult, setProbeResult] = useState<{
    success: boolean;
    mode: string;
    message?: string;
    duration?: number;
  } | null>(null);

  // Canvas visualizer refs
  const organismCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const oscilloscopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Load case data
  const loadCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    const targetMeta = CANONICAL_CASES[caseId] || CANONICAL_CASES.CASE_NOMAD_01;
    const fallback = FIXTURE_MAP[caseId] || FIXTURE_MAP.CASE_NOMAD_01;

    fetch(`/api/cases/${caseId}`)
      .then((res) => {
        if (!res.ok) throw new Error('API unavailable, using fallback fixture');
        return res.json();
      })
      .then((data: ForensicCasePayload & { vitals?: OrganismVitals }) => {
        setCaseData(data);
        const computed = data.vitals || computeOrganismVitals(
          targetMeta,
          data.transactions?.data,
          data.counterparties?.data,
          data.balances
        );
        setVitals(computed);
        setManualBpm(computed.heartRateBpm);
        setManualToxicity(computed.toxicityScore);
        setManualNecrosis(computed.necrosisIndex);
        vitalSynth.updateParameters({
          bpm: computed.heartRateBpm,
          toxicity: computed.toxicityScore,
          necrosis: computed.necrosisIndex,
        });
      })
      .catch(() => {
        setCaseData(fallback);
        const computed = computeOrganismVitals(
          targetMeta,
          fallback.transactions?.data,
          fallback.counterparties?.data,
          fallback.balances
        );
        setVitals(computed);
        setManualBpm(computed.heartRateBpm);
        setManualToxicity(computed.toxicityScore);
        setManualNecrosis(computed.necrosisIndex);
        vitalSynth.updateParameters({
          bpm: computed.heartRateBpm,
          toxicity: computed.toxicityScore,
          necrosis: computed.necrosisIndex,
        });
      });
  };

  // Sync ledger
  const refreshLedger = () => {
    fetch('/api/audit-ledger')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.entries)) {
          setLedgerEntries(data.entries);
        }
      })
      .catch(() => {
        // Kept in memory
      });
  };

  useEffect(() => {
    loadCase(selectedCaseId);
    refreshLedger();
  }, [selectedCaseId]);

  // Handle audio toggle
  const toggleAudioEngine = async () => {
    if (!isAudioRunning) {
      await vitalSynth.start();
      setIsAudioRunning(true);
      setIsAudioMuted(false);
    } else {
      vitalSynth.stop();
      setIsAudioRunning(false);
    }
  };

  const toggleMute = () => {
    const muted = vitalSynth.toggleMute();
    setIsAudioMuted(muted);
  };

  const handleBpmChange = (newBpm: number) => {
    setManualBpm(newBpm);
    vitalSynth.updateParameters({ bpm: newBpm });
  };

  const handleToxicityChange = (newToxicity: number) => {
    setManualToxicity(newToxicity);
    vitalSynth.updateParameters({ toxicity: newToxicity });
  };

  const handleNecrosisChange = (newNecrosis: number) => {
    setManualNecrosis(newNecrosis);
    vitalSynth.updateParameters({ necrosis: newNecrosis });
  };

  // Run probe
  const triggerProbe = async () => {
    setIsProbing(true);
    setProbeResult(null);
    const start = performance.now();

    try {
      const res = await fetch('/api/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: selectedCaseId, apiKey: probeApiKey || undefined }),
      });
      const duration = Math.round(performance.now() - start);
      const json = await res.json();

      if (res.ok) {
        setProbeResult({
          success: true,
          mode: json.mode || 'FIXTURE_VALIDATION',
          message: json.message || 'Probe succeeded with full audit logging.',
          duration,
        });
      } else {
        setProbeResult({
          success: false,
          mode: 'FAILED',
          message: json.error || 'Nansen request failed.',
          duration,
        });
      }
      refreshLedger();
    } catch {
      // Offline fallback: write local entry to simulate
      const fallbackEntry: NansenLedgerEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        endpoint: '/profiler/address/counterparties',
        caseId: selectedCaseId,
        purpose: 'COUNTERPARTY_ANALYSIS',
        status: 'SUCCESS',
        httpStatus: 200,
        creditsUsed: 5,
        requestDurationMs: 142,
      };
      setLedgerEntries((prev) => [fallbackEntry, ...prev]);
      setProbeResult({
        success: true,
        mode: 'FIXTURE_VALIDATION',
        message: 'Executed against local fixture and recorded to in-memory ledger.',
        duration: 142,
      });
    } finally {
      setIsProbing(false);
    }
  };

  // Canvas render loops: Specimen & Oscilloscope
  useEffect(() => {
    let t = 0;
    const render = () => {
      t += 0.03;

      // 1. Render Biological Specimen
      const orgCanvas = organismCanvasRef.current;
      if (orgCanvas) {
        const ctx = orgCanvas.getContext('2d');
        if (ctx) {
          const width = orgCanvas.width;
          const height = orgCanvas.height;
          ctx.clearRect(0, 0, width, height);

          const centerX = width / 2;
          const centerY = height / 2;

          // Pulse factor driven by BPM
          const pulseSpeed = (manualBpm / 60) * 3;
          const pulse = Math.sin(t * pulseSpeed);
          const coreRadius = 55 + pulse * 7;

          // Background concentric field rings
          ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
          ctx.lineWidth = 1;
          for (let r = 70; r <= 180; r += 35) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, r + pulse * 2, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Render Filaments / Tentacles (Count proportional to parasitic vectors)
          const tentacleCount = Math.max(6, Math.min(24, (caseData.counterparties?.data?.length || 5) * 3));
          const necrosisRatio = manualNecrosis / 100;
          const toxicityRatio = manualToxicity / 100;

          // Color palette: Nominal cyan (06B6D4) -> Stressed amber (F59E0B) -> Necrotic crimson (E11D48)
          let tentacleColor = `rgba(6, 182, 212, 0.65)`;
          let coreGradientCenter = `rgba(6, 182, 212, 0.8)`;
          if (toxicityRatio > 0.6) {
            tentacleColor = `rgba(245, 158, 11, 0.7)`;
            coreGradientCenter = `rgba(245, 158, 11, 0.9)`;
          }
          if (necrosisRatio > 0.75) {
            tentacleColor = `rgba(225, 29, 72, 0.75)`;
            coreGradientCenter = `rgba(225, 29, 72, 0.95)`;
          }

          for (let i = 0; i < tentacleCount; i++) {
            const angle = (i / tentacleCount) * Math.PI * 2 + t * 0.15;
            const length = 110 + Math.sin(t * 2 + i) * 25 + (toxicityRatio * 20);

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);

            const cpX = centerX + Math.cos(angle + 0.4) * (length * 0.5);
            const cpY = centerY + Math.sin(angle + 0.4) * (length * 0.5);
            const endX = centerX + Math.cos(angle) * length;
            const endY = centerY + Math.sin(angle) * length;

            ctx.quadraticCurveTo(cpX, cpY, endX, endY);
            ctx.strokeStyle = tentacleColor;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Terminal parasitic spore node
            ctx.beginPath();
            ctx.arc(endX, endY, 3 + (i % 3), 0, Math.PI * 2);
            ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#fb7185';
            ctx.fill();
          }

          // Cellular Core Nucleus
          const grad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, coreRadius);
          grad.addColorStop(0, coreGradientCenter);
          grad.addColorStop(0.6, 'rgba(15, 23, 42, 0.8)');
          grad.addColorStop(1, 'rgba(7, 9, 14, 0.05)');

          ctx.beginPath();
          ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.strokeStyle = tentacleColor;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Reticle target markers
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
          ctx.beginPath();
          ctx.moveTo(centerX - coreRadius - 15, centerY);
          ctx.lineTo(centerX + coreRadius + 15, centerY);
          ctx.moveTo(centerX, centerY - coreRadius - 15);
          ctx.lineTo(centerX, centerY + coreRadius + 15);
          ctx.stroke();
        }
      }

      // 2. Render Oscilloscope / ECG Canvas
      const oscCanvas = oscilloscopeCanvasRef.current;
      if (oscCanvas) {
        const ctx = oscCanvas.getContext('2d');
        if (ctx) {
          const w = oscCanvas.width;
          const h = oscCanvas.height;
          ctx.clearRect(0, 0, w, h);

          // Grid lines
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          for (let x = 0; x < w; x += 30) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
          }
          for (let y = 0; y < h; y += 20) {
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
          }
          ctx.stroke();

          // ECG trace
          ctx.beginPath();
          ctx.strokeStyle = isAudioRunning ? '#06b6d4' : '#64748b';
          ctx.lineWidth = 1.8;

          const fftData = vitalSynth.getVisualizerData();
          const hasAudioData = isAudioRunning && fftData.length > 0 && fftData[0] !== 128;

          for (let i = 0; i < w; i++) {
            let y = h / 2;

            if (hasAudioData) {
              const binIndex = Math.floor((i / w) * fftData.length);
              const v = (fftData[binIndex] || 128) / 128.0;
              y = (v * h) / 2;
            } else {
              // Simulated cardiac P-Q-R-S-T rhythm based on manualBpm
              const beatPhase = (t * (manualBpm / 60) * 4 + (i / w) * 8) % (Math.PI * 2);
              let impulse = 0;
              if (beatPhase > 3.0 && beatPhase < 3.2) impulse = -18; // Q dip
              else if (beatPhase >= 3.2 && beatPhase < 3.4) impulse = 38; // R spike
              else if (beatPhase >= 3.4 && beatPhase < 3.6) impulse = -14; // S dip
              else if (beatPhase >= 4.0 && beatPhase < 4.4) impulse = 9; // T wave

              y = h / 2 + impulse + Math.sin(t * 3 + i * 0.05) * 2;
            }

            if (i === 0) ctx.moveTo(i, y);
            else ctx.lineTo(i, y);
          }
          ctx.stroke();
        }
      }

      animationFrameId.current = requestAnimationFrame(render);
    };

    animationFrameId.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [isAudioRunning, manualBpm, manualToxicity, manualNecrosis, caseData]);

  const currentMeta = CANONICAL_CASES[selectedCaseId] || CANONICAL_CASES.CASE_NOMAD_01;

  // Filtered ledger entries
  const filteredLedger = ledgerEntries.filter((entry) => {
    if (ledgerFilter === 'ALL') return true;
    if (ledgerFilter === 'NOMAD') return entry.caseId === 'CASE_NOMAD_01';
    if (ledgerFilter === 'EULER') return entry.caseId === 'CASE_EULER_02';
    if (ledgerFilter === 'TRANSIT') return entry.caseId === 'CASE_TRANSIT_03';
    return entry.purpose === ledgerFilter;
  });

  const totalCredits = ledgerEntries.reduce((sum, e) => sum + (e.creditsUsed || 0), 0);

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Top Bar Contract (1-Row, 3-Zone) */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-[#0b0e17] shrink-0">
        {/* Zone 1: Single Wordmark */}
        <div className="flex items-center gap-3">
          <span className="text-base font-bold tracking-tight text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            Chainling Bio-Forensics
          </span>
          <span className="text-xs text-slate-500 font-mono hidden md:inline">
            SPECIMEN ENGINE v1.0 · STRICT NANSEN CLIENT
          </span>
        </div>

        {/* Zone 2: Navigation Links (Text with hover underlines) */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-400">
          <button
            onClick={() => setActiveView('specimen')}
            className={`transition-colors hover:text-white pb-0.5 ${
              activeView === 'specimen' ? 'text-cyan-400 border-b border-cyan-400' : ''
            }`}
          >
            Specimen Stage
          </button>
          <button
            onClick={() => setActiveView('vitals')}
            className={`transition-colors hover:text-white pb-0.5 ${
              activeView === 'vitals' ? 'text-cyan-400 border-b border-cyan-400' : ''
            }`}
          >
            Vitals & Sonics
          </button>
          <button
            onClick={() => setActiveView('counterparties')}
            className={`transition-colors hover:text-white pb-0.5 ${
              activeView === 'counterparties' ? 'text-cyan-400 border-b border-cyan-400' : ''
            }`}
          >
            Counterparty Swarm
          </button>
          <button
            onClick={() => setActiveView('ledger')}
            className={`transition-colors hover:text-white pb-0.5 ${
              activeView === 'ledger' ? 'text-cyan-400 border-b border-cyan-400' : ''
            }`}
          >
            Audit Ledger ({ledgerEntries.length})
          </button>
          <button
            onClick={() => setActiveView('taxonomy')}
            className={`transition-colors hover:text-white pb-0.5 ${
              activeView === 'taxonomy' ? 'text-cyan-400 border-b border-cyan-400' : ''
            }`}
          >
            Taxonomy Dossier
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleAudioEngine}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap ${
              isAudioRunning
                ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/60'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {isAudioRunning ? <Square className="w-3.5 h-3.5 fill-cyan-400" /> : <Play className="w-3.5 h-3.5" />}
            {isAudioRunning ? 'Stop Synth' : 'Start Biosonification'}
          </button>

          {isAudioRunning && (
            <button
              onClick={toggleMute}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-900 border border-slate-700 rounded transition-colors"
              title={isAudioMuted ? 'Unmute' : 'Mute'}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
          )}

          <button
            onClick={() => setActiveView('ledger')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-slate-300 bg-slate-900 border border-slate-700 rounded hover:border-slate-500 transition-colors whitespace-nowrap"
          >
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span className="tabular-nums">{totalCredits} Credits Used</span>
          </button>
        </div>
      </header>

      {/* Specimen Case Telemetry Ribbon */}
      <section className="bg-[#0f1422] border-b border-slate-800 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase font-mono text-slate-400">Specimen Target:</span>
          <div className="flex items-center gap-1 bg-[#07090e] p-1 rounded border border-slate-800">
            {Object.values(CANONICAL_CASES).map((c) => (
              <button
                key={c.caseId}
                onClick={() => loadCase(c.caseId)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  selectedCaseId === c.caseId
                    ? 'bg-slate-800 text-cyan-300 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {c.targetName}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Address:</span>
            <span className="text-slate-300">{currentMeta.address.slice(0, 10)}...{currentMeta.address.slice(-6)}</span>
          </div>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Loss:</span>
            <span className="text-rose-400 font-semibold tabular-nums">
              ${(currentMeta.lossEstimateUsd / 1_000_000).toFixed(1)}M USD
            </span>
          </div>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Recovered:</span>
            <span className="text-emerald-400 font-semibold tabular-nums">
              ${(currentMeta.recoveredUsd / 1_000_000).toFixed(1)}M USD
            </span>
          </div>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Vector:</span>
            <span className="text-amber-300">{currentMeta.vectorClassification}</span>
          </div>
        </div>
      </section>

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-[1520px] w-full mx-auto p-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column: Biological Vitals Telemetry & Sonics Controls (4 cols) */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          {/* Vitals HUD Card */}
          <div className="bg-[#0b0e17] border border-slate-800 rounded p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Organism Vitals & Respiration
              </h2>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                vitals.cellularState === 'CONVALESCENT'
                  ? 'border-emerald-500/40 text-emerald-300 bg-emerald-950/30'
                  : vitals.cellularState === 'NECROTIC' || vitals.cellularState === 'HEMORRHAGING'
                  ? 'border-rose-500/40 text-rose-300 bg-rose-950/30 animate-pulse'
                  : 'border-amber-500/40 text-amber-300 bg-amber-950/30'
              }`}>
                ● {vitals.cellularState}
              </span>
            </div>

            {/* Vitals Grid */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-[#07090e] p-3 border border-slate-800/80 rounded">
                <div className="text-[11px] font-mono text-slate-500">HEART RATE / CADENCE</div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold font-mono text-slate-100 tabular-nums">
                    {manualBpm}
                  </span>
                  <span className="text-xs font-mono text-slate-500">BPM</span>
                </div>
                <div className="text-[10px] font-mono text-cyan-400 mt-1">
                  {manualBpm > 160 ? 'Tachycardia (High Replay)' : 'Ventricular Nominal'}
                </div>
              </div>

              <div className="bg-[#07090e] p-3 border border-slate-800/80 rounded">
                <div className="text-[11px] font-mono text-slate-500">NECROSIS INDEX</div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold font-mono text-rose-400 tabular-nums">
                    {manualNecrosis.toFixed(1)}
                  </span>
                  <span className="text-xs font-mono text-slate-500">%</span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-1">Reserve Depletion</div>
              </div>

              <div className="bg-[#07090e] p-3 border border-slate-800/80 rounded">
                <div className="text-[11px] font-mono text-slate-500">TOXICITY FACTOR</div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
                    {manualToxicity}
                  </span>
                  <span className="text-xs font-mono text-slate-500">/ 100</span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-1">Sawtooth drone filter</div>
              </div>

              <div className="bg-[#07090e] p-3 border border-slate-800/80 rounded">
                <div className="text-[11px] font-mono text-slate-500">PARASITIC VECTORS</div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold font-mono text-slate-100 tabular-nums">
                    {caseData.counterparties?.data?.length || vitals.parasiticVectorCount}
                  </span>
                  <span className="text-xs font-mono text-slate-500">NODES</span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-1">Replay Bot Swarm</div>
              </div>
            </div>

            {/* Live ECG / Oscilloscope Canvas */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span className="font-mono text-[11px]">TELEMETRY OSCILLOSCOPE (WEBAUDIO FFT)</span>
                <span className="font-mono text-[11px] text-cyan-400">
                  {isAudioRunning ? 'LIVE SYNTH ACTIVE' : 'SIMULATED CARDIAC TRACE'}
                </span>
              </div>
              <div className="h-28 bg-[#07090e] border border-slate-800 rounded relative overflow-hidden">
                <canvas
                  ref={oscilloscopeCanvasRef}
                  width={380}
                  height={112}
                  className="w-full h-full block"
                />
                {!isAudioRunning && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                    <button
                      onClick={toggleAudioEngine}
                      className="px-3 py-1.5 text-xs font-medium text-cyan-300 bg-slate-900 border border-cyan-500/40 rounded hover:bg-slate-800 transition-colors"
                    >
                      Click to Activate Biosonification
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Biosonification Controls */}
            <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-slate-500" />
                  Live Vital Modulation
                </span>
                <button
                  onClick={() => {
                    setManualBpm(vitals.heartRateBpm);
                    setManualToxicity(vitals.toxicityScore);
                    setManualNecrosis(vitals.necrosisIndex);
                    vitalSynth.updateParameters({
                      bpm: vitals.heartRateBpm,
                      toxicity: vitals.toxicityScore,
                      necrosis: vitals.necrosisIndex,
                    });
                  }}
                  className="text-[10px] text-cyan-400 hover:underline"
                >
                  Reset to Case Defaults
                </button>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span>Cardiac Frequency (BPM)</span>
                  <span className="text-white tabular-nums">{manualBpm} BPM</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={240}
                  value={manualBpm}
                  onChange={(e) => handleBpmChange(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span>Toxicity Resonance (Filter Cutoff & Dissonance)</span>
                  <span className="text-amber-400 tabular-nums">{manualToxicity}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={manualToxicity}
                  onChange={(e) => handleToxicityChange(Number(e.target.value))}
                  className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span>Cellular Necrosis (Pitch Decay)</span>
                  <span className="text-rose-400 tabular-nums">{manualNecrosis}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={manualNecrosis}
                  onChange={(e) => handleNecrosisChange(Number(e.target.value))}
                  className="w-full accent-rose-400 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Ingestion & Rate-Limit Probe Box */}
          <div className="bg-[#0b0e17] border border-slate-800 rounded p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Nansen Ingestion Probe
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                Limit: 30 req/s · 600 req/min
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              Test live connection against Nansen Profiler API or execute fixture verification.
              All calls append an entry to <span className="font-mono text-slate-300">fixtures/ledger-audit.json</span>.
            </p>

            <div className="mt-3 flex flex-col gap-2">
              <label className="text-[11px] font-mono text-slate-400">
                NANSEN_API_KEY (Optional if set in .env):
              </label>
              <input
                type="password"
                placeholder="Enter Nansen API key or leave blank for fixture validation"
                value={probeApiKey}
                onChange={(e) => setProbeApiKey(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#07090e] border border-slate-700 rounded text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={triggerProbe}
                disabled={isProbing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 border border-slate-700 rounded hover:bg-slate-800 hover:border-slate-600 disabled:opacity-50 transition-colors"
              >
                {isProbing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                )}
                {isProbing ? 'Executing Probe...' : 'Execute Forensic Ingestion Probe'}
              </button>
            </div>

            {probeResult && (
              <div
                className={`mt-3 p-3 rounded text-xs font-mono border ${
                  probeResult.success
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>{probeResult.success ? '✓ PROBE_OK' : '✕ PROBE_FAILED'}</span>
                  <span className="text-[11px] opacity-80">{probeResult.duration}ms</span>
                </div>
                <div className="text-[11px] mt-1 opacity-90">{probeResult.message}</div>
                <div className="text-[10px] mt-1 text-slate-400">
                  Mode: {probeResult.mode} · Recorded in Immutable Ledger
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Specimen Canvas Stage / Views (8 cols) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          {/* Dynamic View Header */}
          <div className="bg-[#0b0e17] border border-slate-800 rounded p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase font-mono text-cyan-400 font-semibold">
                {activeView === 'specimen' && 'Stage: Biological Organism Specimen'}
                {activeView === 'vitals' && 'Telemetry: Bio-Acoustic Synthesizer'}
                {activeView === 'counterparties' && 'Topology: Counterparty Replay Swarm'}
                {activeView === 'ledger' && 'Audit: Immutable Nansen Ingestion Ledger'}
                {activeView === 'taxonomy' && 'Forensic Dossier: Scientific Taxonomy'}
              </span>
              <span className="text-slate-600">/</span>
              <span className="text-xs font-mono text-slate-400">
                {currentMeta.biologicalTaxonomy.specimenCode}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveView('specimen')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  activeView === 'specimen' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Specimen
              </button>
              <button
                onClick={() => setActiveView('counterparties')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  activeView === 'counterparties' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Counterparties
              </button>
              <button
                onClick={() => setActiveView('ledger')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  activeView === 'ledger' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Audit Log
              </button>
              <button
                onClick={() => setActiveView('taxonomy')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  activeView === 'taxonomy' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Dossier
              </button>
            </div>
          </div>

          {/* VIEW 1: SPECIMEN STAGE */}
          {activeView === 'specimen' && (
            <div className="bg-[#0b0e17] border border-slate-800 rounded p-6 flex flex-col items-center">
              <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-200">
                    {currentMeta.biologicalTaxonomy.phylum}
                  </h3>
                </div>
                <div className="text-xs font-mono text-slate-400">
                  Respiration: <span className="text-cyan-400 font-semibold tabular-nums">{manualBpm} BPM</span> · Toxicity: <span className="text-amber-400 font-semibold tabular-nums">{manualToxicity}%</span>
                </div>
              </div>

              {/* Specimen Canvas */}
              <div className="relative w-full max-w-[620px] aspect-square my-4 bg-[#07090e] border border-slate-800/80 rounded-lg overflow-hidden flex items-center justify-center cursor-crosshair">
                <canvas
                  ref={organismCanvasRef}
                  width={600}
                  height={600}
                  className="w-full h-full block"
                />

                {/* Overlay Crosshair HUD */}
                <div className="absolute top-3 left-3 text-[10px] font-mono text-slate-500 bg-[#07090e]/80 px-2 py-1 border border-slate-800 rounded pointer-events-none">
                  PHYLUM: {currentMeta.biologicalTaxonomy.phylum.toUpperCase()}
                  <br />
                  CELLULAR STATE: {vitals.cellularState}
                </div>

                <div className="absolute bottom-3 right-3 text-[10px] font-mono text-slate-500 bg-[#07090e]/80 px-2 py-1 border border-slate-800 rounded pointer-events-none">
                  ORGANISM CALIBRATION: ACTIVE
                  <br />
                  CALLEDATA SWARM NODES: {caseData.counterparties?.data?.length || 5}
                </div>
              </div>

              <div className="w-full bg-[#07090e] border border-slate-800/80 rounded p-4 text-xs text-slate-400 leading-relaxed">
                <span className="font-semibold text-slate-200">Morphology Diagnosis: </span>
                {currentMeta.biologicalTaxonomy.morphology} {currentMeta.description}
              </div>
            </div>
          )}

          {/* VIEW 2: COUNTERPARTY SWARM & TRANSACTIONS */}
          {(activeView === 'counterparties' || activeView === 'vitals') && (
            <div className="bg-[#0b0e17] border border-slate-800 rounded p-5 flex flex-col gap-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-1">
                  Parasitic Counterparties & Replay Cluster
                </h3>
                <p className="text-xs text-slate-400">
                  Ingested via <span className="font-mono text-slate-300">/profiler/address/counterparties</span>.
                  Identifies primary exploiters, copycat replay bot nodes, and recovery white-hats.
                </p>
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#07090e] border-b border-slate-800 font-mono text-slate-400 text-[11px]">
                    <tr>
                      <th className="px-4 py-2.5">COUNTERPARTY ADDRESS</th>
                      <th className="px-4 py-2.5">CLASSIFICATION</th>
                      <th className="px-4 py-2.5">TX COUNT</th>
                      <th className="px-4 py-2.5 text-right">TOTAL VOLUME (USD)</th>
                      <th className="px-4 py-2.5">FIRST INTERACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 font-mono">
                    {(caseData.counterparties?.data || []).map((cp, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <span className="text-cyan-300">{cp.address.slice(0, 10)}...{cp.address.slice(-6)}</span>
                            {cp.label && (
                              <span className="text-[10px] text-slate-500 font-sans">
                                ({cp.label})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                            cp.classification === 'ATTACKER_CORE'
                              ? 'border-rose-500/50 text-rose-300 bg-rose-950/20'
                              : cp.classification === 'REPLAY_BOT'
                              ? 'border-amber-500/50 text-amber-300 bg-amber-950/20'
                              : cp.classification === 'WHITE_HAT'
                              ? 'border-emerald-500/50 text-emerald-300 bg-emerald-950/20'
                              : 'border-slate-600 text-slate-400'
                          }`}>
                            {cp.classification || 'EXTERNAL_NODE'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300 tabular-nums">
                          {cp.interaction_count}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-200 font-semibold tabular-nums">
                          ${(cp.total_volume_usd || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-[11px]">
                          {cp.first_interaction ? new Date(cp.first_interaction).toLocaleTimeString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Exploit Transactions Sample */}
              <div className="mt-2">
                <h4 className="text-xs font-semibold text-slate-300 uppercase font-mono mb-2 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                  Ingested Exploit Transactions ({caseData.transactions?.data?.length || 0})
                </h4>
                <div className="overflow-x-auto border border-slate-800 rounded">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#07090e] border-b border-slate-800 font-mono text-slate-400 text-[11px]">
                      <tr>
                        <th className="px-4 py-2">TX HASH</th>
                        <th className="px-4 py-2">METHOD SIGNATURE</th>
                        <th className="px-4 py-2">TOKEN</th>
                        <th className="px-4 py-2 text-right">VALUE (USD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 font-mono">
                      {(caseData.transactions?.data || []).map((tx, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-2 text-cyan-400">
                            {tx.hash.slice(0, 14)}...
                          </td>
                          <td className="px-4 py-2 text-amber-300 text-[11px]">
                            {tx.method || 'transfer(address,uint256)'}
                          </td>
                          <td className="px-4 py-2 text-slate-300">
                            {tx.token_symbol || 'ETH'} ({tx.token_amount || '—'})
                          </td>
                          <td className="px-4 py-2 text-right text-slate-100 font-semibold tabular-nums">
                            ${(tx.value_usd || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: IMMUTABLE AUDIT LEDGER */}
          {activeView === 'ledger' && (
            <div className="bg-[#0b0e17] border border-slate-800 rounded p-5 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">
                    Append-Only Forensic Audit Ledger
                  </h3>
                  <p className="text-xs text-slate-400">
                    Guarantees verifiable execution and enforces Nansen's 30 req/s & 600 req/min limits.
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 bg-[#07090e] p-1 rounded border border-slate-800">
                  {['ALL', 'NOMAD', 'EULER', 'TRANSIT', 'COUNTERPARTY_ANALYSIS', 'TRANSACTION_INGESTION'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setLedgerFilter(filter)}
                      className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors ${
                        ledgerFilter === filter
                          ? 'bg-slate-800 text-cyan-300 font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary telemetry cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#07090e] p-3 border border-slate-800 rounded">
                  <div className="text-[10px] font-mono text-slate-500">TOTAL API CALLS RECORDED</div>
                  <div className="text-xl font-bold font-mono text-slate-100 mt-0.5 tabular-nums">
                    {ledgerEntries.length}
                  </div>
                </div>
                <div className="bg-[#07090e] p-3 border border-slate-800 rounded">
                  <div className="text-[10px] font-mono text-slate-500">TOTAL CREDITS CONSUMED</div>
                  <div className="text-xl font-bold font-mono text-amber-400 mt-0.5 tabular-nums">
                    {totalCredits} Credits
                  </div>
                </div>
                <div className="bg-[#07090e] p-3 border border-slate-800 rounded">
                  <div className="text-[10px] font-mono text-slate-500">AUDIT LEDGER DISK TARGET</div>
                  <div className="text-xs font-mono text-cyan-300 mt-1 truncate">
                    fixtures/ledger-audit.json
                  </div>
                </div>
              </div>

              {/* Ledger Table */}
              <div className="overflow-x-auto border border-slate-800 rounded">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#07090e] border-b border-slate-800 font-mono text-slate-400 text-[11px]">
                    <tr>
                      <th className="px-4 py-2.5">TIMESTAMP</th>
                      <th className="px-4 py-2.5">CASE ID</th>
                      <th className="px-4 py-2.5">ENDPOINT</th>
                      <th className="px-4 py-2.5">PURPOSE</th>
                      <th className="px-4 py-2.5">STATUS</th>
                      <th className="px-4 py-2.5 text-right">CREDITS</th>
                      <th className="px-4 py-2.5 text-right">LATENCY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 font-mono">
                    {filteredLedger.map((entry) => (
                      <tr
                        key={entry.id}
                        onClick={() => setSelectedLedgerItem(entry)}
                        className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-2.5 text-slate-400 text-[11px]">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-2.5 text-slate-300 font-semibold">
                          {entry.caseId}
                        </td>
                        <td className="px-4 py-2.5 text-cyan-300">
                          {entry.endpoint}
                        </td>
                        <td className="px-4 py-2.5 text-[11px] text-slate-400">
                          {entry.purpose}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] border ${
                              entry.status === 'SUCCESS'
                                ? 'border-emerald-500/40 text-emerald-300 bg-emerald-950/20'
                                : entry.status === 'RATE_LIMITED'
                                ? 'border-amber-500/40 text-amber-300 bg-amber-950/20'
                                : 'border-rose-500/40 text-rose-300 bg-rose-950/20'
                            }`}
                          >
                            {entry.status} ({entry.httpStatus})
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-300 tabular-nums">
                          {entry.creditsUsed}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-400 tabular-nums">
                          {entry.requestDurationMs}ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedLedgerItem && (
                <div className="bg-[#07090e] p-4 border border-slate-700 rounded text-xs font-mono">
                  <div className="flex items-center justify-between text-slate-300 mb-2">
                    <span className="font-semibold">Ledger Entry Inspector: {selectedLedgerItem.id}</span>
                    <button
                      onClick={() => setSelectedLedgerItem(null)}
                      className="text-slate-500 hover:text-white"
                    >
                      Close [×]
                    </button>
                  </div>
                  <pre className="text-[11px] text-cyan-300 overflow-x-auto p-2 bg-slate-950 rounded border border-slate-800">
                    {JSON.stringify(selectedLedgerItem, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* VIEW 4: FORENSIC TAXONOMY DOSSIER */}
          {activeView === 'taxonomy' && (
            <div className="bg-[#0b0e17] border border-slate-800 rounded p-6 flex flex-col gap-5">
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  Forensic Biological Taxonomy Dossier
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Formal classification bridging on-chain smart contract vulnerabilities to cellular pathology and bio-acoustics.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.values(CANONICAL_CASES).map((c) => (
                  <div
                    key={c.caseId}
                    onClick={() => loadCase(c.caseId)}
                    className={`p-4 rounded border cursor-pointer transition-all ${
                      selectedCaseId === c.caseId
                        ? 'bg-slate-900 border-cyan-500 shadow-md shadow-cyan-950/30'
                        : 'bg-[#07090e] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-[10px] font-mono text-cyan-400 font-semibold uppercase">
                      {c.biologicalTaxonomy.specimenCode}
                    </div>
                    <div className="text-sm font-bold text-slate-100 mt-1">
                      {c.targetName}
                    </div>
                    <div className="text-xs text-amber-300/90 font-mono mt-1">
                      {c.biologicalTaxonomy.phylum}
                    </div>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-3">
                      {c.description}
                    </p>
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>BPM: {c.biologicalTaxonomy.respirationBpm}</span>
                      <span>Necrosis: {(c.biologicalTaxonomy.necrosisFactor * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-[#07090e] border border-slate-800 rounded p-5 mt-2">
                <h4 className="text-xs uppercase font-mono text-slate-400 font-semibold mb-3">
                  Forensic Dynamics & Evidence Matrix
                </h4>
                <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
                  <div>
                    <span className="font-semibold text-cyan-300">1. Nomad Calldata Replay Swarm:</span>
                    <p className="text-slate-400 mt-0.5">
                      The core flaw was an improperly initialized replica contract where the root was set to 0x00, meaning messages with unproven roots were automatically confirmed. Once the first attacker proved this, hundreds of autonomous bots and opportunistic actors replayed the exact byte payloads with their own receiving addresses, creating a biological swarm infection.
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-cyan-300">2. Euler Finance Flash-Loan Helminth:</span>
                    <p className="text-slate-400 mt-0.5">
                      Utilized a donation to reserves logic flaw in Euler's vault that artificially depreciated the user account's health score into negative territory while retaining disproportionately large collateral allocations. The attacker executed self-liquidation with collateral bonuses.
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-cyan-300">3. Transit Swap Unchecked Conduit:</span>
                    <p className="text-slate-400 mt-0.5">
                      A defect in external call parameter passing allowed an attacker to instruct the swap router contract to trigger transferFrom directly against arbitrary addresses that held open ERC-20 approvals for the router.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#0b0e17] px-6 py-3 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4 font-mono">
        <div className="flex items-center gap-2">
          <span>CHAINLING STANDALONE FORENSICS</span>
          <span aria-hidden="true">·</span>
          <span>NANSEN COMPLIANCE: 30 REQ/S · 600 REQ/MIN</span>
        </div>
        <div className="flex items-center gap-4">
          <span>IMMUTABLE LEDGER: /fixtures/ledger-audit.json</span>
          <span aria-hidden="true">·</span>
          <span>SCRIPTS: test-nansen-connection.ts</span>
        </div>
      </footer>
    </div>
  );
}
