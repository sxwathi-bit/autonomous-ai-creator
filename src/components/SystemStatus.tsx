import { Activity, CheckCircle2, Clock, Database, FileText, Filter, Brain, AlertCircle } from 'lucide-react';
import React from 'react';

interface SystemStatusProps {
  health: {
    status: string;
    database: string;
    scheduler: string;
  } | null;
  stats: {
    totalPosts: number;
    totalTopicsDiscovered: number;
    acceptedTopics: number;
    rejectedTopics: number;
    totalMemories: number;
  } | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

export const SystemStatus: React.FC<SystemStatusProps> = ({ health, stats, lastRunAt, nextRunAt }) => {
  const formatTime = (isoString: string | null) => {
    if (!isoString) return 'Pending cycle';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div id="system-status-container" className="space-y-6">
      {/* System Health Indicators */}
      <div id="health-cards-grid" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <div id="status-card-backend" className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Backend API</div>
            <div className="text-sm font-semibold text-slate-100 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Online
            </div>
          </div>
        </div>

        <div id="status-card-worker" className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Autonomous Worker</div>
            <div className="text-sm font-semibold text-slate-100 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              {health?.scheduler === 'running' ? 'Running' : 'Active'}
            </div>
          </div>
        </div>

        <div id="status-card-db" className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Database</div>
            <div className="text-sm font-semibold text-slate-100 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              {health?.database === 'connected' ? 'PostgreSQL' : 'Connected'}
            </div>
          </div>
        </div>

        <div id="status-card-discovery" className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Live Search</div>
            <div className="text-sm font-semibold text-slate-100 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Tavily / RSS
            </div>
          </div>
        </div>

        <div id="status-card-ai" className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">AI Writer</div>
            <div className="text-sm font-semibold text-slate-100 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              OpenAI / Gemini
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div id="metrics-cards-grid" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div id="metric-card-posts" className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Published Posts</div>
          <div className="text-3xl font-extrabold text-indigo-400 mt-2">{stats?.totalPosts || 0}</div>
          <div className="text-xs text-slate-500 mt-1">Autonomous articles</div>
        </div>

        <div id="metric-card-rejected" className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rejected Topics</div>
          <div className="text-3xl font-extrabold text-rose-400 mt-2">{stats?.rejectedTopics || 0}</div>
          <div className="text-xs text-slate-500 mt-1">Filtered by editorial rule</div>
        </div>

        <div id="metric-card-memories" className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Memory Items</div>
          <div className="text-3xl font-extrabold text-blue-400 mt-2">{stats?.totalMemories || 0}</div>
          <div className="text-xs text-slate-500 mt-1">Persistent vector/context</div>
        </div>

        <div id="metric-card-schedule" className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Next Run</div>
          <div className="text-lg font-bold text-amber-300 mt-2 truncate">{formatTime(nextRunAt)}</div>
          <div className="text-xs text-slate-500 mt-1">Last: {formatTime(lastRunAt)}</div>
        </div>
      </div>
    </div>
  );
};
