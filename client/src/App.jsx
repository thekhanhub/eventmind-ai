import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Activity, 
  Clock, 
  Coins, 
  RefreshCw,
  MapPin,
  Calendar,
  Utensils,
  Award,
  Wallet,
  Send,
  ChevronDown,
  ChevronUp,
  FileText,
  ShieldCheck,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { 
  getHealth, 
  getPlan, 
  getTrace, 
  getRejected, 
  runInitialProcess, 
  runUpdateProcess 
} from './services/api.js';

export default function App() {
  const [health, setHealth] = useState(null);
  const [plan, setPlan] = useState(null);
  const [traceData, setTraceData] = useState({ totalCalls: 0, totalTokens: 0, trace: [] });
  const [rejectedData, setRejectedData] = useState({ count: 0, rejected: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('plan');
  const [expandedTraceId, setExpandedTraceId] = useState(null);
  const [newMessageText, setNewMessageText] = useState('');
  const [processStatus, setProcessStatus] = useState(null);

  useEffect(() => {
    refreshAll();
  }, []);

  const refreshAll = async () => {
    setLoading(true);
    try {
      const h = await getHealth();
      setHealth(h);

      try {
        const p = await getPlan();
        setPlan(p);
      } catch (err) {
        // Plan might not exist yet
      }

      try {
        const t = await getTrace();
        setTraceData(t);
      } catch (err) {}

      try {
        const r = await getRejected();
        setRejectedData(r);
      } catch (err) {}
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunInitial = async () => {
    setLoading(true);
    setProcessStatus({ type: 'info', message: 'Running initial plan generation...' });
    try {
      const res = await runInitialProcess(newMessageText ? { rawText: newMessageText } : {});
      setProcessStatus({ type: 'success', message: 'Initial plan processed successfully!' });
      await refreshAll();
      setActiveTab('plan');
    } catch (err) {
      setProcessStatus({ type: 'error', message: err.response?.data?.error || err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRunUpdate = async () => {
    if (!newMessageText.trim()) {
      setProcessStatus({ type: 'warning', message: 'Please enter one or more new messages to update the plan.' });
      return;
    }
    setLoading(true);
    setProcessStatus({ type: 'info', message: 'Analyzing new messages and predicting affected areas...' });
    try {
      const res = await runUpdateProcess({ rawText: newMessageText });
      setProcessStatus({ 
        type: 'success', 
        message: `Incremental update completed! Mode: ${res.result?.mode || 'APPLIED'}` 
      });
      setNewMessageText('');
      await refreshAll();
      setActiveTab('plan');
    } catch (err) {
      setProcessStatus({ type: 'error', message: err.response?.data?.error || err.message });
    } finally {
      setLoading(false);
    }
  };

  const areaColor = (area) => {
    switch (area) {
      case 'reading': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'venue': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'schedule': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'food': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'judging': return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      case 'budget': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                EventMind AI
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Mind to Machine
                </span>
                {plan?.status === 'VALID' && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Plan Valid
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400">Constraint-Aware Event Planning Agent · Islamabad Physical Event (4 Hours)</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            {/* Model Badge */}
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5">
              <span className="text-slate-400">Model:</span>
              <span className="font-semibold text-emerald-400">{health?.model || 'gemini-2.0-flash'}</span>
            </div>

            {/* Total Tokens Counter */}
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400">Tokens:</span>
              <span className="font-semibold text-white">{(traceData.totalTokens || 0).toLocaleString()}</span>
            </div>

            {/* Total Calls Counter */}
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-slate-400">Calls:</span>
              <span className="font-semibold text-white">{traceData.totalCalls || 0}</span>
            </div>

            {/* Refresh button */}
            <button
              onClick={refreshAll}
              disabled={loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Refresh dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* Status notification */}
        {processStatus && (
          <div className={`mb-6 p-4 rounded-xl border flex items-center justify-between text-sm ${
            processStatus.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-300' :
            processStatus.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' :
            processStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
            'bg-blue-500/10 border-blue-500/30 text-blue-300'
          }`}>
            <span>{processStatus.message}</span>
            <button onClick={() => setProcessStatus(null)} className="text-xs opacity-70 hover:opacity-100">Dismiss</button>
          </div>
        )}

        {/* Prediction Banner (if available) */}
        {plan?.prediction && (
          <div className="mb-6 p-4 rounded-xl bg-slate-900 border border-slate-800 text-sm">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-2">
              <Activity className="w-4 h-4" />
              <span>Last Run Dependency Prediction ({plan.runId}):</span>
            </div>
            <div className="text-xs text-slate-300 space-y-1">
              <div>
                <strong>AI Affected Areas: </strong>
                {plan.prediction.aiAffectedAreas?.length > 0 ? (
                  plan.prediction.aiAffectedAreas.map(a => (
                    <span key={a} className="inline-block px-2 py-0.5 mr-1.5 rounded bg-slate-800 border border-slate-700 font-medium text-emerald-300">
                      {a}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500">None (All areas preserved)</span>
                )}
              </div>
              <div>
                <strong>Deterministic JS Calculations: </strong>
                <span className="text-slate-400">{plan.prediction.jsAffectedAreas?.join(', ') || 'budget'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-2 border-b border-slate-800 mb-6 pb-2">
          <button
            onClick={() => setActiveTab('plan')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'plan' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Event Plan (5 Pillars)</span>
          </button>

          <button
            onClick={() => setActiveTab('trace')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'trace' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Truthful Model Trace ({traceData.trace?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('rejected')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'rejected' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Rejected Claims ({rejectedData.rejected?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('studio')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'studio' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Message Ingestion & Updates</span>
          </button>
        </div>

        {/* Tab 1: 5 Pillars Plan */}
        {activeTab === 'plan' && (
          <div>
            {!plan ? (
              <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-12 text-center space-y-4">
                <BrainCircuit className="w-10 h-10 text-slate-500 mx-auto" />
                <h3 className="text-base font-semibold text-slate-200">No Plan Generated Yet</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  Run initial processing using the CLI (<code className="text-emerald-400">npm run process</code>) or through the Ingestion Studio tab.
                </p>
                <button
                  onClick={() => setActiveTab('studio')}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition"
                >
                  Open Ingestion Studio
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 5 Pillar Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Pillar 1: Venue */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center space-x-2 text-indigo-400">
                        <MapPin className="w-5 h-5" />
                        <h3 className="font-semibold text-base">1. Venue</h3>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {plan.areas.venue?.city || 'Islamabad'}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">{plan.areas.venue?.name}</h4>
                      <p className="text-xs text-slate-400 mt-1">{plan.areas.venue?.address}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50">
                        <span className="text-slate-400 block">Capacity</span>
                        <strong className="text-white text-sm">{plan.areas.venue?.capacity} attendees</strong>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50">
                        <span className="text-slate-400 block">Hall Rent</span>
                        <strong className="text-white text-sm">{(plan.areas.venue?.cost || 0).toLocaleString()} PKR</strong>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-medium block mb-1.5">Facilities:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {plan.areas.venue?.facilities?.map((f, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Pillar 2: Schedule */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center space-x-2 text-blue-400">
                        <Calendar className="w-5 h-5" />
                        <h3 className="font-semibold text-base">2. Schedule</h3>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                        {plan.areas.schedule?.totalDurationMinutes} Mins (Strict 4h)
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 flex items-center justify-between bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50">
                      <span>Event Window:</span>
                      <strong className="text-white font-mono">{plan.areas.schedule?.startTime} — {plan.areas.schedule?.endTime}</strong>
                    </div>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {plan.areas.schedule?.items?.map((item, idx) => (
                        <div key={idx} className="p-2 rounded bg-slate-800/40 border border-slate-800 text-xs flex justify-between items-start gap-2">
                          <div>
                            <span className="font-semibold text-white block">{item.title}</span>
                            <span className="text-slate-400 text-[11px]">{item.details}</span>
                          </div>
                          <span className="text-slate-400 font-mono whitespace-nowrap">{item.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pillar 3: Food */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center space-x-2 text-amber-400">
                        <Utensils className="w-5 h-5" />
                        <h3 className="font-semibold text-base">3. Food</h3>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                        100% Halal
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">{plan.areas.food?.menuType}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Caterer: {plan.areas.food?.caterer}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50">
                        <span className="text-slate-400 block">Headcount</span>
                        <strong className="text-white text-sm">{plan.areas.food?.orderHeadcount} heads</strong>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50">
                        <span className="text-slate-400 block">Rate / Head</span>
                        <strong className="text-white text-sm">{plan.areas.food?.costPerHead} PKR</strong>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-medium block mb-1.5">Menu Items:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {plan.areas.food?.items?.map((item, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Pillar 4: Judging */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center space-x-2 text-pink-400">
                        <Award className="w-5 h-5" />
                        <h3 className="font-semibold text-base">4. Judging</h3>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 font-medium">
                        {plan.areas.judging?.judges?.length} Judges
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <span className="text-slate-400 block font-medium">Evaluation Panel:</span>
                      {plan.areas.judging?.judges?.map((j, i) => (
                        <div key={i} className="p-2 rounded bg-slate-800/50 border border-slate-700/50 flex justify-between items-center">
                          <strong className="text-white">{j.name}</strong>
                          <span className="text-slate-400 text-[11px]">{j.domain} ({j.organization})</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block font-medium mb-1.5">Scoring Rubric:</span>
                      <div className="space-y-1">
                        {plan.areas.judging?.rubric?.map((r, i) => (
                          <div key={i} className="flex justify-between text-xs text-slate-300">
                            <span>{r.criterion}</span>
                            <strong className="text-emerald-400">{r.weight}%</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Pillar 5: Budget */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4 md:col-span-2">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center space-x-2 text-emerald-400">
                        <Wallet className="w-5 h-5" />
                        <h3 className="font-semibold text-base">5. Budget (Deterministic JS)</h3>
                      </div>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        plan.areas.budget?.isWithinBudget 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}>
                        {plan.areas.budget?.isWithinBudget ? 'WITHIN BUDGET' : 'OVER BUDGET'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                        <span className="text-slate-400 block">Budget Ceiling</span>
                        <strong className="text-white text-base">{(plan.areas.budget?.budgetCap || 0).toLocaleString()} PKR</strong>
                      </div>
                      <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                        <span className="text-slate-400 block">Total Allocated</span>
                        <strong className="text-emerald-400 text-base">{(plan.areas.budget?.totalAllocated || 0).toLocaleString()} PKR</strong>
                      </div>
                      <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                        <span className="text-slate-400 block">Remaining Buffer</span>
                        <strong className="text-white text-base">{(plan.areas.budget?.remainingBuffer || 0).toLocaleString()} PKR</strong>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs pt-2">
                      <span className="text-slate-400 font-medium block">Itemized Expense Breakdown:</span>
                      <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden">
                        {plan.areas.budget?.breakdown?.map((b, i) => (
                          <div key={i} className="p-2.5 bg-slate-900/40 flex justify-between items-center text-xs">
                            <div>
                              <span className="font-semibold text-slate-200">{b.item}</span>
                              <span className="text-slate-500 block text-[11px]">{b.calculation}</span>
                            </div>
                            <strong className="text-white font-mono">{b.amount.toLocaleString()} PKR</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Validation Results Card */}
                {plan.validation && (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        <h3 className="font-semibold text-base text-white">Authoritative JavaScript Validation Engine (12 Rules)</h3>
                      </div>
                      <span className="text-xs text-slate-400">
                        {plan.validation.passedChecks} / {plan.validation.checks?.length || 12} Checks Passed
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {plan.validation.checks?.map((c, i) => (
                        <div key={i} className={`p-2.5 rounded-lg border flex items-center gap-2.5 ${
                          c.passed ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-200' : 'bg-red-500/10 border-red-500/20 text-red-300'
                        }`}>
                          {c.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                          )}
                          <div>
                            <strong className="block text-[11px] uppercase tracking-wider text-slate-400">{c.name.replace(/_/g, ' ')}</strong>
                            <span>{c.message}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Truthful Trace */}
        {activeTab === 'trace' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-200">Truthful Model Call Trace</h2>
                <p className="text-xs text-slate-400">Verifiable sequential telemetry of all actual Gemini model calls with exact provider-reported tokens</p>
              </div>
              <div className="flex items-center space-x-3 text-xs">
                <span className="flex items-center gap-1.5 text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                  <Coins className="w-4 h-4 text-amber-400" />
                  In: <strong className="text-white">{(traceData.totalInputTokens || 0).toLocaleString()}</strong> | Out: <strong className="text-white">{(traceData.totalOutputTokens || 0).toLocaleString()}</strong>
                </span>
                <span className="flex items-center gap-1.5 text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                  Total Tokens: <strong className="text-emerald-400 font-bold">{(traceData.totalTokens || 0).toLocaleString()}</strong>
                </span>
              </div>
            </div>

            {(!traceData.trace || traceData.trace.length === 0) ? (
              <p className="text-sm text-slate-400 text-center py-12">No model calls recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {traceData.trace.map((entry, idx) => {
                  const isExpanded = expandedTraceId === entry.callNumber;
                  return (
                    <div key={idx} className="border border-slate-800 rounded-xl bg-slate-900/40 overflow-hidden">
                      <div 
                        onClick={() => setExpandedTraceId(isExpanded ? null : entry.callNumber)}
                        className="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/40 transition"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="font-mono text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                            #{entry.callNumber}
                          </span>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold uppercase ${areaColor(entry.area)}`}>
                            {entry.area}
                          </span>
                          <span className="text-xs font-mono text-slate-300">{entry.model}</span>
                        </div>

                        <div className="flex items-center space-x-4 text-xs font-mono">
                          <span className="text-slate-400">In: <strong className="text-white">{entry.inputTokens ?? 'N/A'}</strong></span>
                          <span className="text-slate-400">Out: <strong className="text-white">{entry.outputTokens ?? 'N/A'}</strong></span>
                          <span className="text-emerald-400 font-bold">Total: {entry.totalTokens ?? 'N/A'} tok</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-slate-800 p-4 bg-slate-950/60 space-y-4 text-xs font-mono">
                          <div>
                            <span className="text-slate-400 font-semibold block mb-1">Exact Submitted Input:</span>
                            <pre className="p-3 bg-slate-900 rounded-lg overflow-x-auto text-slate-300 whitespace-pre-wrap max-h-60">
                              {entry.input}
                            </pre>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block mb-1">Actual Model Output:</span>
                            <pre className="p-3 bg-slate-900 rounded-lg overflow-x-auto text-emerald-300 whitespace-pre-wrap max-h-60">
                              {entry.output}
                            </pre>
                          </div>
                          {entry.warning && (
                            <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300">
                              Warning: {entry.warning}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Rejected Claims */}
        {activeTab === 'rejected' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-base font-semibold text-slate-200">Rejected & Contradictory Claims</h2>
              <p className="text-xs text-slate-400">Messages detected as conflicting with hard constraints, outdated, or irrelevant</p>
            </div>

            {(!rejectedData.rejected || rejectedData.rejected.length === 0) ? (
              <p className="text-sm text-slate-400 text-center py-12">No rejected or contradictory claims recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {rejectedData.rejected.map((r, i) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-900/80 border border-red-500/20 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-semibold uppercase">
                        {r.area || 'Constraint Violation'}
                      </span>
                      <span className="text-slate-400">Source: {r.source || 'Incoming Message'}</span>
                    </div>
                    <div className="text-xs text-white">
                      <strong>Claim:</strong> "{r.claim}"
                    </div>
                    <div className="text-xs text-red-300 bg-red-950/40 p-2.5 rounded border border-red-900/40">
                      <strong>Rejection Reason:</strong> {r.reason}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Ingestion & Updates Studio */}
        {activeTab === 'studio' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-slate-200">Message Ingestion & Incremental Update Studio</h2>
              <p className="text-xs text-slate-400">Paste raw messages (English and Roman Urdu) to run initial plan generation or trigger selective replanning</p>
            </div>

            <div className="space-y-3">
              <textarea
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder="Paste incoming WhatsApp chats, emails, or circulars here... Example:
[15/10/2026, 15:30] Asif: Namaz break add karni hai 16:15 pe 15 minutes ki, aur headcount 140 ho gayi hai."
                rows={8}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500/50"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  Tip: CLI command <code className="text-emerald-400">npm run process</code> runs the exact same shared engine.
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleRunInitial}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                  >
                    Run Full Initial Processing
                  </button>

                  <button
                    onClick={handleRunUpdate}
                    disabled={loading || !newMessageText.trim()}
                    className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Apply Incremental Update (Max 5 Calls)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-6 py-4 text-center text-xs text-slate-500">
        EventMind AI · Mind to Machine Hackathon · Single Repository & Shared Processing Engine
      </footer>
    </div>
  );
}
