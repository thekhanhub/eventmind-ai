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
  HelpCircle,
  Download,
  History,
  LayoutDashboard,
  Search,
  Check,
  AlertCircle
} from 'lucide-react';
import { 
  getHealth, 
  getPlan, 
  getTrace, 
  getRejected, 
  getEvidence,
  getHistory,
  runInitialProcess, 
  appendMessageAndProcess
} from './services/api.js';

export default function App() {
  const [health, setHealth] = useState(null);
  const [plan, setPlan] = useState(null);
  const [traceData, setTraceData] = useState({ totalCalls: 0, totalTokens: 0, trace: [] });
  const [rejectedData, setRejectedData] = useState({ count: 0, rejected: [] });
  const [evidenceData, setEvidenceData] = useState({ totalClaims: 0, claims: [], messages: [] });
  const [historyData, setHistoryData] = useState({ lastProcessedAt: null, messageCount: 0 });
  const [loading, setLoading] = useState(false);
  const [activeNav, setActiveNav] = useState('overview');
  const [expandedTraceId, setExpandedTraceId] = useState(null);
  const [newMessageText, setNewMessageText] = useState('');
  const [processStatus, setProcessStatus] = useState(null);
  const [evidenceFilter, setEvidenceFilter] = useState('all');

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
        setPlan(null);
      }

      try {
        const t = await getTrace();
        setTraceData(t);
      } catch (err) {}

      try {
        const r = await getRejected();
        setRejectedData(r);
      } catch (err) {}

      try {
        const e = await getEvidence();
        setEvidenceData(e);
      } catch (err) {}

      try {
        const hist = await getHistory();
        setHistoryData(hist);
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
      setNewMessageText('');
      await refreshAll();
      setActiveNav('plan');
    } catch (err) {
      setProcessStatus({ type: 'error', message: err.response?.data?.error || err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAppendAndUpdate = async () => {
    if (!newMessageText.trim()) {
      setProcessStatus({ type: 'warning', message: 'Please enter a message to append to data/messages.txt.' });
      return;
    }
    setLoading(true);
    setProcessStatus({ type: 'info', message: 'Appending message to data/messages.txt and predicting affected areas...' });
    try {
      const res = await appendMessageAndProcess(newMessageText);
      const prediction = res.result?.plan?.prediction;
      const aiAreas = prediction?.aiAffectedAreas?.join(', ') || 'None';
      setProcessStatus({ 
        type: 'success', 
        message: `Incremental update applied! Predicted affected areas: [${aiAreas}]. Mode: ${res.result?.mode || 'APPLIED'}` 
      });
      setNewMessageText('');
      await refreshAll();
      setActiveNav('plan');
    } catch (err) {
      setProcessStatus({ type: 'error', message: err.response?.data?.error || err.message });
    } finally {
      setLoading(false);
    }
  };

  // Download utilities
  const downloadJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadText = (text, filename) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadHumanReadableTrace = () => {
    let report = `====================================================\n`;
    report += `  EventMind AI — Truthful Model Call Trace Report  \n`;
    report += `  Mind to Machine Hackathon (Islamabad Event Plan) \n`;
    report += `====================================================\n\n`;
    report += `Run ID: ${traceData.runId || 'N/A'}\n`;
    report += `Total Model Calls: ${traceData.totalCalls || 0}\n`;
    report += `Total Input Tokens: ${(traceData.totalInputTokens || 0).toLocaleString()}\n`;
    report += `Total Output Tokens: ${(traceData.totalOutputTokens || 0).toLocaleString()}\n`;
    report += `Grand Total Tokens: ${(traceData.totalTokens || 0).toLocaleString()}\n\n`;
    report += `----------------------------------------------------\n`;

    (traceData.trace || []).forEach((c) => {
      report += `[Call #${c.callNumber}] [${c.area.toUpperCase()}] Model: ${c.model}\n`;
      report += `Timestamp: ${c.timestamp} | Status: ${c.status}\n`;
      report += `Tokens: In=${c.inputTokens ?? 'N/A'}, Out=${c.outputTokens ?? 'N/A'}, Total=${c.totalTokens ?? 'N/A'}\n`;
      report += `--- SUBMITTED INPUT ---\n${c.input}\n`;
      report += `--- MODEL OUTPUT ---\n${c.output}\n`;
      if (c.warning) report += `--- WARNING: ${c.warning} ---\n`;
      report += `----------------------------------------------------\n\n`;
    });

    downloadText(report, `eventmind-trace-report-${Date.now()}.txt`);
  };

  const areaColor = (area) => {
    switch (area) {
      case 'reading': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'venue': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'schedule': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'food': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'judging': return 'bg-pink-500/10 text-pink-400 border-pink-500/30';
      case 'budget': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const statusBadge = (status) => {
    switch (status) {
      case 'accepted': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'superseded': return 'bg-slate-700 text-slate-300 border-slate-600';
      case 'rejected': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'uncertain': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'irrelevant': return 'bg-slate-800 text-slate-500 border-slate-700';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const filteredEvidence = (evidenceData.claims || []).filter(c => {
    if (evidenceFilter === 'all') return true;
    return c.status === evidenceFilter;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 rounded-xl text-indigo-400 shadow-sm">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">EventMind AI</h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Mind to Machine
                </span>
                {plan?.status === 'VALID' ? (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Plan Valid
                  </span>
                ) : plan ? (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Plan Invalid
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    Awaiting Ingestion
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">Constraint-Aware Event Planning Agent · Islamabad Physical Gathering</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            {/* System Status */}
            <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${health?.status === 'healthy' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-slate-400">System:</span>
              <strong className="text-white uppercase">{health?.status || 'Connecting...'}</strong>
            </div>

            {/* Model Badge */}
            <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1.5">
              <span className="text-slate-400">Model:</span>
              <span className="font-semibold text-indigo-300 font-mono">{health?.model || 'gemini-3.8-flash'}</span>
            </div>

            {/* Token Counter */}
            <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Tokens:</span>
              <strong className="text-white font-mono">{(traceData.totalTokens || 0).toLocaleString()}</strong>
            </div>

            {/* Refresh */}
            <button
              onClick={refreshAll}
              disabled={loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body with Sidebar Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row gap-6 px-6 py-6">
        {/* Left Sidebar */}
        <aside className="w-full md:w-60 shrink-0 space-y-4">
          <nav className="bg-slate-900/60 border border-slate-800 rounded-xl p-2 space-y-1 text-sm font-medium">
            <button
              onClick={() => setActiveNav('overview')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition ${
                activeNav === 'overview' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveNav('plan')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition ${
                activeNav === 'plan' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Event Plan</span>
            </button>

            <button
              onClick={() => setActiveNav('evidence')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition ${
                activeNav === 'evidence' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <FileText className="w-4 h-4" />
                <span>Evidence</span>
              </div>
              <span className="text-[11px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {evidenceData.claims?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveNav('trace')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition ${
                activeNav === 'trace' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Activity className="w-4 h-4" />
                <span>Model Trace</span>
              </div>
              <span className="text-[11px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                {traceData.trace?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveNav('rejected')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition ${
                activeNav === 'rejected' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Rejected Claims</span>
              </div>
              <span className="text-[11px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {rejectedData.rejected?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveNav('history')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition ${
                activeNav === 'history' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Update History</span>
            </button>

            <button
              onClick={() => setActiveNav('updates')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition ${
                activeNav === 'updates' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Incremental Studio</span>
            </button>
          </nav>

          {/* Quick Downloads Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
            <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">Export Artifacts</span>
            
            <button
              onClick={() => plan && downloadJSON(plan, 'final-plan.json')}
              disabled={!plan}
              className="w-full py-1.5 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 flex items-center justify-between transition"
            >
              <span>Final Plan JSON</span>
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => traceData && downloadJSON(traceData, 'model-trace.json')}
              disabled={!traceData.trace || traceData.trace.length === 0}
              className="w-full py-1.5 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 flex items-center justify-between transition"
            >
              <span>Full Trace JSON</span>
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleDownloadHumanReadableTrace}
              disabled={!traceData.trace || traceData.trace.length === 0}
              className="w-full py-1.5 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 flex items-center justify-between transition"
            >
              <span>Trace Report (.txt)</span>
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => rejectedData && downloadJSON(rejectedData, 'rejected-claims.json')}
              disabled={!rejectedData.rejected || rejectedData.rejected.length === 0}
              className="w-full py-1.5 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 flex items-center justify-between transition"
            >
              <span>Rejected Claims</span>
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>

        {/* Center Main Panel */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* Notification banner */}
          {processStatus && (
            <div className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
              processStatus.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-300' :
              processStatus.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' :
              processStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
              'bg-blue-500/10 border-blue-500/30 text-blue-300'
            }`}>
              <div className="flex items-center gap-2">
                {processStatus.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                {processStatus.type === 'error' && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                {processStatus.type === 'info' && <RefreshCw className="w-4 h-4 text-blue-400 animate-spin shrink-0" />}
                <span>{processStatus.message}</span>
              </div>
              <button onClick={() => setProcessStatus(null)} className="text-xs opacity-70 hover:opacity-100 ml-4">
                Dismiss
              </button>
            </div>
          )}

          {/* 1. OVERVIEW SECTION */}
          {activeNav === 'overview' && (
            <div className="space-y-6">
              {!plan ? (
                <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-12 text-center space-y-3">
                  <BrainCircuit className="w-10 h-10 text-slate-600 mx-auto" />
                  <h3 className="text-base font-semibold text-slate-300">No Event Plan Generated Yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Copy the organizer's original messages into <code className="text-indigo-400">data/messages.txt</code> and run <code className="text-indigo-400">npm run process</code>, or use the Incremental Studio.
                  </p>
                  <button
                    onClick={() => setActiveNav('updates')}
                    className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                  >
                    Open Incremental Studio
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                      <span className="text-slate-400 text-xs block mb-1">Event Duration</span>
                      <strong className="text-white text-lg font-bold">
                        {plan.areas.schedule?.totalDurationMinutes || 240} Mins
                      </strong>
                      <span className="text-[11px] text-emerald-400 block mt-0.5">Strict 4-Hour Rule</span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                      <span className="text-slate-400 text-xs block mb-1">Attendees & Teams</span>
                      <strong className="text-white text-lg font-bold">
                        {plan.areas.food?.orderHeadcount || 120} Attendees
                      </strong>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {plan.areas.judging?.teamCount || 10} Hackathon Teams
                      </span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                      <span className="text-slate-400 text-xs block mb-1">Budget Allocated</span>
                      <strong className="text-white text-lg font-bold">
                        {(plan.areas.budget?.totalAllocated || 0).toLocaleString()} PKR
                      </strong>
                      <span className="text-[11px] text-emerald-400 block mt-0.5">
                        Buffer: {(plan.areas.budget?.remainingBuffer || 0).toLocaleString()} PKR
                      </span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                      <span className="text-slate-400 text-xs block mb-1">Validation Status</span>
                      <strong className="text-emerald-400 text-lg font-bold">
                        {plan.status === 'VALID' ? '12/12 Passed' : 'Validation Failed'}
                      </strong>
                      <span className="text-[11px] text-slate-400 block mt-0.5">Authoritative JS Engine</span>
                    </div>
                  </div>

                  {/* Operational Summary Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
                      <div className="flex items-center space-x-2 text-indigo-400 border-b border-slate-800 pb-2">
                        <MapPin className="w-4 h-4" />
                        <h4 className="font-semibold text-sm">Venue Summary</h4>
                      </div>
                      <div className="text-xs space-y-1.5 text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Selected Venue:</span>
                          <strong className="text-white">{plan.areas.venue?.name}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Location:</span>
                          <span>{plan.areas.venue?.city} ({plan.areas.venue?.address})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Capacity:</span>
                          <span>{plan.areas.venue?.capacity} attendees (Verified &ge; headcount)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Rental Rate:</span>
                          <span>{(plan.areas.venue?.cost || 0).toLocaleString()} PKR</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
                      <div className="flex items-center space-x-2 text-amber-400 border-b border-slate-800 pb-2">
                        <Utensils className="w-4 h-4" />
                        <h4 className="font-semibold text-sm">Catering & Food Summary</h4>
                      </div>
                      <div className="text-xs space-y-1.5 text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Menu Style:</span>
                          <strong className="text-white">{plan.areas.food?.menuType}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Dietary Certification:</span>
                          <span className="text-emerald-400 font-medium">{plan.areas.food?.dietary}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Order Quantity:</span>
                          <span>{plan.areas.food?.orderHeadcount} heads @ {plan.areas.food?.costPerHead} PKR</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Total Catering:</span>
                          <strong className="text-white">{(plan.areas.food?.totalFoodCost || 0).toLocaleString()} PKR</strong>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
                      <div className="flex items-center space-x-2 text-pink-400 border-b border-slate-800 pb-2">
                        <Award className="w-4 h-4" />
                        <h4 className="font-semibold text-sm">Judging Panel Summary</h4>
                      </div>
                      <div className="text-xs space-y-1.5 text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Judges Count:</span>
                          <strong className="text-white">{plan.areas.judging?.judges?.length} Judges</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Evaluation Window:</span>
                          <span>{plan.areas.judging?.totalJudgingMinutes} mins ({plan.areas.judging?.minutesPerTeam + plan.areas.judging?.qaMinutesPerTeam} mins/team)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Panel Members:</span>
                          <span className="text-slate-300">{plan.areas.judging?.judges?.map(j => j.name).join(', ')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
                      <div className="flex items-center space-x-2 text-blue-400 border-b border-slate-800 pb-2">
                        <Calendar className="w-4 h-4" />
                        <h4 className="font-semibold text-sm">Schedule Summary</h4>
                      </div>
                      <div className="text-xs space-y-1.5 text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Event Window:</span>
                          <strong className="text-white">{plan.areas.schedule?.startTime} — {plan.areas.schedule?.endTime}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Total Blocks:</span>
                          <span>{plan.areas.schedule?.items?.length} sequential sessions (0 gaps)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Prayer / Break:</span>
                          <span className="text-emerald-400">Dedicated 15+ Min Break Allocated</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. FIVE PLANNING AREAS */}
          {activeNav === 'plan' && (
            <div className="space-y-6">
              {!plan ? (
                <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-12 text-center text-slate-400">
                  No plan generated yet.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Pillar 1: Venue */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center space-x-2 text-indigo-400">
                        <MapPin className="w-5 h-5" />
                        <h3 className="font-semibold text-base">Pillar 1: Venue</h3>
                      </div>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                        {plan.areas.venue?.city}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="md:col-span-2 space-y-2">
                        <h4 className="text-base font-bold text-white">{plan.areas.venue?.name}</h4>
                        <p className="text-slate-400">{plan.areas.venue?.address}</p>
                        <div className="pt-2">
                          <span className="text-slate-500 block mb-1">Decision Rationale:</span>
                          <p className="text-slate-300 italic bg-slate-950/60 p-2.5 rounded border border-slate-800">
                            "{plan.areas.venue?.decisionRationale}"
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Capacity:</span>
                          <strong className="text-white">{plan.areas.venue?.capacity} attendees</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Rental Fee:</span>
                          <strong className="text-emerald-400">{(plan.areas.venue?.cost || 0).toLocaleString()} PKR</strong>
                        </div>
                        <div className="pt-2">
                          <span className="text-slate-400 block mb-1">Facilities:</span>
                          <div className="flex flex-wrap gap-1">
                            {plan.areas.venue?.facilities?.map((f, i) => (
                              <span key={i} className="text-[11px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pillar 2: Schedule */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center space-x-2 text-blue-400">
                        <Calendar className="w-5 h-5" />
                        <h3 className="font-semibold text-base">Pillar 2: Schedule (Strictly 240 Minutes)</h3>
                      </div>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-mono">
                        {plan.areas.schedule?.startTime} — {plan.areas.schedule?.endTime}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
                        {plan.areas.schedule?.items?.map((it, idx) => (
                          <div key={idx} className="p-3.5 bg-slate-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex items-center space-x-3">
                              <span className="font-mono text-indigo-400 bg-slate-800 px-2 py-1 rounded font-semibold whitespace-nowrap">
                                {it.time}
                              </span>
                              <div>
                                <strong className="text-white text-sm block">{it.title}</strong>
                                <span className="text-slate-400">{it.details}</span>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                              {it.durationMinutes} mins
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Pillar 3: Food */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center space-x-2 text-amber-400">
                        <Utensils className="w-5 h-5" />
                        <h3 className="font-semibold text-base">Pillar 3: Food & Catering</h3>
                      </div>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {plan.areas.food?.dietary}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="md:col-span-2 space-y-3">
                        <div>
                          <h4 className="text-base font-bold text-white">{plan.areas.food?.menuType}</h4>
                          <span className="text-slate-400">Caterer: {plan.areas.food?.caterer}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-1">Approved Menu Items:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {plan.areas.food?.items?.map((item, i) => (
                              <span key={i} className="px-2.5 py-1 rounded bg-slate-800/80 text-slate-200 border border-slate-700">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Order Quantity:</span>
                          <strong className="text-white">{plan.areas.food?.orderHeadcount} heads</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Rate / Head:</span>
                          <strong className="text-white">{plan.areas.food?.costPerHead} PKR</strong>
                        </div>
                        <div className="flex justify-between border-t border-slate-700 pt-2">
                          <span className="text-slate-400">Total Food Cost:</span>
                          <strong className="text-emerald-400 text-sm">{(plan.areas.food?.totalFoodCost || 0).toLocaleString()} PKR</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pillar 4: Judging */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center space-x-2 text-pink-400">
                        <Award className="w-5 h-5" />
                        <h3 className="font-semibold text-base">Pillar 4: Judging & Evaluation</h3>
                      </div>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/30">
                        {plan.areas.judging?.judges?.length} Judges · {plan.areas.judging?.teamCount} Teams
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold block mb-2">Judge Panel Allocation:</span>
                        <div className="space-y-2">
                          {plan.areas.judging?.judges?.map((j, i) => (
                            <div key={i} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 flex justify-between items-center">
                              <div>
                                <strong className="text-white block">{j.name}</strong>
                                <span className="text-slate-400 text-[11px]">{j.domain}</span>
                              </div>
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                {j.organization}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold block mb-2">100-Point Scoring Rubric:</span>
                        <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden">
                          {plan.areas.judging?.rubric?.map((r, i) => (
                            <div key={i} className="p-2.5 bg-slate-900/40 flex justify-between items-center text-xs">
                              <span className="text-slate-300">{r.criterion}</span>
                              <strong className="text-indigo-400 font-mono text-sm">{r.weight} pts</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pillar 5: Budget */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center space-x-2 text-emerald-400">
                        <Wallet className="w-5 h-5" />
                        <h3 className="font-semibold text-base">Pillar 5: Budget (Deterministic JavaScript)</h3>
                      </div>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        plan.areas.budget?.isWithinBudget ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                      }`}>
                        {plan.areas.budget?.isWithinBudget ? 'WITHIN BUDGET CAP' : 'EXCEEDS BUDGET CAP'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/50">
                        <span className="text-slate-400 block mb-1">Approved Budget Cap</span>
                        <strong className="text-white text-lg font-mono">{(plan.areas.budget?.budgetCap || 0).toLocaleString()} PKR</strong>
                      </div>
                      <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/50">
                        <span className="text-slate-400 block mb-1">Total Allocated</span>
                        <strong className="text-emerald-400 text-lg font-mono">{(plan.areas.budget?.totalAllocated || 0).toLocaleString()} PKR</strong>
                      </div>
                      <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/50">
                        <span className="text-slate-400 block mb-1">Remaining Buffer</span>
                        <strong className="text-white text-lg font-mono">{(plan.areas.budget?.remainingBuffer || 0).toLocaleString()} PKR</strong>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 text-xs">
                      <span className="text-slate-400 font-semibold block">Itemized Expense Ledger:</span>
                      <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
                        {plan.areas.budget?.breakdown?.map((item, idx) => (
                          <div key={idx} className="p-3 bg-slate-900/40 flex justify-between items-center text-xs">
                            <div>
                              <strong className="text-white block">{item.item}</strong>
                              <span className="text-slate-500 text-[11px]">{item.calculation}</span>
                            </div>
                            <strong className="text-emerald-300 font-mono text-sm">{item.amount.toLocaleString()} PKR</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. EVIDENCE PANEL */}
          {activeNav === 'evidence' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-semibold text-white">Evidence Ledger</h2>
                  <p className="text-xs text-slate-400">Structured facts and constraints extracted from raw messages with source provenance</p>
                </div>

                {/* Filter buttons */}
                <div className="flex items-center space-x-1.5 text-xs bg-slate-800/60 p-1 rounded-lg border border-slate-700">
                  {['all', 'accepted', 'superseded', 'rejected', 'uncertain', 'irrelevant'].map(status => (
                    <button
                      key={status}
                      onClick={() => setEvidenceFilter(status)}
                      className={`px-2.5 py-1 rounded text-xs capitalize transition ${
                        evidenceFilter === status ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {filteredEvidence.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-12">No evidence claims match the selected filter.</p>
              ) : (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
                  {filteredEvidence.map((claim, idx) => (
                    <div key={idx} className="p-4 bg-slate-900/40 space-y-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${areaColor(claim.area)}`}>
                            {claim.area}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase ${statusBadge(claim.status)}`}>
                            {claim.status}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">{claim.id}</span>
                        </div>
                        <span className="text-slate-400 text-[11px]">Source: <strong className="text-slate-200">{claim.source}</strong> ({claim.messageId})</span>
                      </div>

                      <div className="text-white text-sm font-medium">
                        "{claim.claim}"
                      </div>

                      {claim.reason && (
                        <div className="text-[11px] text-slate-400 italic bg-slate-950 p-2 rounded border border-slate-800">
                          <strong>Note / Reason:</strong> {claim.reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. MODEL TRACE */}
          {activeNav === 'trace' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-semibold text-white">Truthful Model Call Trace</h2>
                  <p className="text-xs text-slate-400">Verifiable sequential telemetry of all actual Gemini model calls with exact provider-reported tokens</p>
                </div>
                <div className="flex items-center space-x-3 text-xs">
                  <span className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300">
                    Input: <strong className="text-white">{(traceData.totalInputTokens || 0).toLocaleString()}</strong>
                  </span>
                  <span className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300">
                    Output: <strong className="text-white">{(traceData.totalOutputTokens || 0).toLocaleString()}</strong>
                  </span>
                  <span className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-emerald-400 font-bold">
                    Total: {(traceData.totalTokens || 0).toLocaleString()} tok
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
                            <span className="text-emerald-400 font-bold">Total: {entry.totalTokens ?? 'N/A'}</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-slate-800 p-4 bg-slate-950/80 space-y-4 text-xs font-mono">
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

          {/* 5. REJECTED MESSAGES */}
          {activeNav === 'rejected' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-base font-semibold text-white">Rejected & Contradictory Claims</h2>
                <p className="text-xs text-slate-400">Messages detected as violating hard constraints, outdated, or off-topic with explanations</p>
              </div>

              {(!rejectedData.rejected || rejectedData.rejected.length === 0) ? (
                <p className="text-sm text-slate-400 text-center py-12">No rejected claims recorded. All accepted claims passed constraints.</p>
              ) : (
                <div className="space-y-3">
                  {rejectedData.rejected.map((r, i) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-900/80 border border-red-500/20 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-semibold uppercase text-[10px]">
                          {r.area || 'Constraint Violation'}
                        </span>
                        <span className="text-slate-400">Source: {r.source || 'Incoming Message'}</span>
                      </div>
                      <div className="text-white text-sm">
                        <strong>Claim:</strong> "{r.claim}"
                      </div>
                      <div className="text-red-300 bg-red-950/40 p-2.5 rounded border border-red-900/40">
                        <strong>Rejection Reason:</strong> {r.reason}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 6. UPDATE HISTORY */}
          {activeNav === 'history' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-base font-semibold text-white">Message Processing & Update History</h2>
                <p className="text-xs text-slate-400">Chronological provenance of all processed messages and run identifiers</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Total Processed Messages</span>
                  <strong className="text-white text-lg font-mono">{historyData.messageCount || 0}</strong>
                </div>
                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Last Processing Timestamp</span>
                  <strong className="text-indigo-400 text-sm font-mono">{historyData.lastProcessedAt || 'Not processed yet'}</strong>
                </div>
              </div>

              {plan?.decisions && (
                <div className="space-y-2 pt-2 text-xs">
                  <span className="text-slate-400 font-semibold block">Key Decisions Recorded:</span>
                  <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
                    {plan.decisions.map((d, i) => (
                      <div key={i} className="p-3 bg-slate-900/40 flex justify-between items-center text-xs">
                        <div>
                          <strong className="text-white capitalize block">{d.area}: {d.decision}</strong>
                          <span className="text-slate-500 text-[11px]">{d.rationale}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 7. INCREMENTAL STUDIO */}
          {activeNav === 'updates' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
              <div>
                <h2 className="text-base font-semibold text-white">Interactive Ingestion & Incremental Update Studio</h2>
                <p className="text-xs text-slate-400">Append incoming messages to data/messages.txt and execute the exact same shared processing engine</p>
              </div>

              <div className="space-y-4">
                <textarea
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder="Paste incoming WhatsApp chat, email, or circular message here... Example:
[15/10/2026, 15:30] Lead: Asr Namaz break add karni hai 16:15 pe 15 minutes ki, aur headcount 140 ho gayi hai."
                  rows={8}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500/50"
                />

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <span className="text-xs text-slate-500">
                    Strict five-call limit enforced. Recalculates only affected areas.
                  </span>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleRunInitial}
                      disabled={loading}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
                    >
                      Run Full Initial Processing
                    </button>

                    <button
                      onClick={handleAppendAndUpdate}
                      disabled={loading || !newMessageText.trim()}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Append & Update Plan (Max 5 Calls)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-6 py-4 text-center text-xs text-slate-500">
        EventMind AI · Mind to Machine Hackathon · Single Repository Architecture · Islamabad Event Plan
      </footer>
    </div>
  );
}
