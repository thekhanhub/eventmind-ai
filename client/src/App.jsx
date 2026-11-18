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
  Wallet
} from 'lucide-react';
import { getHealth } from './services/api.js';

export default function App() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('plan');

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      setLoading(true);
      const data = await getHealth();
      setHealth(data);
    } catch (err) {
      console.error('Failed to connect to backend:', err);
      setHealth({ status: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
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
              </h1>
              <p className="text-xs text-slate-400">Constraint-Aware Event Planning Agent · Islamabad Physical Event</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Backend Health Badge */}
            <div className="flex items-center space-x-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className={`w-2 h-2 rounded-full ${health?.status === 'healthy' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-slate-300">Backend:</span>
              <span className="font-semibold text-white uppercase">{health?.status || 'Connecting...'}</span>
              {health?.model && (
                <span className="text-slate-400 border-l border-slate-700 pl-2">Model: {health.model}</span>
              )}
            </div>

            {/* Refresh button */}
            <button
              onClick={checkHealth}
              disabled={loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* Navigation Tabs */}
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
            <span>Truthful Model Trace</span>
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
            <span>Rejected Claims</span>
          </button>
        </div>

        {/* Tab 1: Event Plan 5 Pillars Shell */}
        {activeTab === 'plan' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Venue Card */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
                <div className="flex items-center space-x-2 text-indigo-400 mb-3">
                  <MapPin className="w-5 h-5" />
                  <h3 className="font-semibold text-sm">1. Venue</h3>
                </div>
                <p className="text-xs text-slate-400 mb-2">Islamabad Physical Location</p>
                <div className="text-sm font-medium text-slate-200">Awaiting processing...</div>
              </div>

              {/* Schedule Card */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
                <div className="flex items-center space-x-2 text-blue-400 mb-3">
                  <Calendar className="w-5 h-5" />
                  <h3 className="font-semibold text-sm">2. Schedule</h3>
                </div>
                <p className="text-xs text-slate-400 mb-2">Strictly 4 Hours (240 Mins)</p>
                <div className="text-sm font-medium text-slate-200">Awaiting processing...</div>
              </div>

              {/* Food Card */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
                <div className="flex items-center space-x-2 text-amber-400 mb-3">
                  <Utensils className="w-5 h-5" />
                  <h3 className="font-semibold text-sm">3. Food</h3>
                </div>
                <p className="text-xs text-slate-400 mb-2">100% Halal Catering</p>
                <div className="text-sm font-medium text-slate-200">Awaiting processing...</div>
              </div>

              {/* Judging Card */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
                <div className="flex items-center space-x-2 text-purple-400 mb-3">
                  <Award className="w-5 h-5" />
                  <h3 className="font-semibold text-sm">4. Judging</h3>
                </div>
                <p className="text-xs text-slate-400 mb-2">Rubric & Team Slots</p>
                <div className="text-sm font-medium text-slate-200">Awaiting processing...</div>
              </div>

              {/* Budget Card */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
                <div className="flex items-center space-x-2 text-emerald-400 mb-3">
                  <Wallet className="w-5 h-5" />
                  <h3 className="font-semibold text-sm">5. Budget</h3>
                </div>
                <p className="text-xs text-slate-400 mb-2">Deterministic JS Math</p>
                <div className="text-sm font-medium text-slate-200">Awaiting processing...</div>
              </div>
            </div>

            {/* Ingestion notice */}
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-8 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <h2 className="text-base font-semibold text-slate-200">Phase 1 Infrastructure Ready</h2>
              <p className="text-sm text-slate-400 max-w-lg mx-auto">
                Place the organizer's raw messages file at <code className="px-1.5 py-0.5 bg-slate-800 text-emerald-400 rounded">data/messages.txt</code> and execute <code className="px-1.5 py-0.5 bg-slate-800 text-emerald-400 rounded">npm run process</code> to run the shared processing engine.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Truthful Trace Shell */}
        {activeTab === 'trace' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-200">Truthful Model Call Trace</h2>
                <p className="text-xs text-slate-400">Verifiable sequential telemetry of all actual Gemini model calls</p>
              </div>
              <div className="flex items-center space-x-3 text-xs">
                <span className="flex items-center gap-1 text-slate-300">
                  <Coins className="w-4 h-4 text-amber-400" />
                  Total Tokens: <strong className="text-white">0</strong>
                </span>
                <span className="flex items-center gap-1 text-slate-300">
                  <Clock className="w-4 h-4 text-blue-400" />
                  Calls: <strong className="text-white">0</strong>
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-400 text-center py-10">No model calls recorded yet. Run initial processing to generate trace.</p>
          </div>
        )}

        {/* Tab 3: Rejected Claims Shell */}
        {activeTab === 'rejected' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-base font-semibold text-slate-200">Rejected & Contradictory Claims</h2>
              <p className="text-xs text-slate-400">Messages detected as irrelevant, outdated, conflicting, or violating hard constraints</p>
            </div>
            <p className="text-sm text-slate-400 text-center py-10">No rejected claims recorded yet.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-6 py-4 text-center text-xs text-slate-500">
        EventMind AI · Mind to Machine Hackathon · Single Workspace Architecture
      </footer>
    </div>
  );
}
