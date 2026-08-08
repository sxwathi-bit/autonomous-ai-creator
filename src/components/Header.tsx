import { Activity, Bot, Cpu, RefreshCw, Zap } from 'lucide-react';
import React from 'react';

interface HeaderProps {
  agent: {
    id: string;
    name: string;
    domain: string;
    mission: string;
    active: boolean;
    lastRunAt: string | null;
    nextRunAt: string | null;
    isRunning: boolean;
  } | null;
  onTriggerRun: () => void;
  isTriggering: boolean;
}

export const Header: React.FC<HeaderProps> = ({ agent, onTriggerRun, isTriggering }) => {
  return (
    <header id="header-container" className="bg-slate-900 border-b border-slate-800 text-slate-100 py-6 px-6 sm:px-8 shadow-lg">
      <div id="header-wrapper" className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div id="header-branding" className="flex items-start gap-4">
          <div id="agent-avatar" className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Bot className="w-8 h-8" />
          </div>
          <div>
            <div id="agent-title-row" className="flex items-center gap-3 flex-wrap">
              <h1 id="agent-name" className="text-2xl font-bold tracking-tight text-white">
                {agent?.name || 'NOVA'}
              </h1>
              <span id="agent-domain-badge" className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                {agent?.domain || 'AI Engineering'}
              </span>
              <span id="agent-status-badge" className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                AUTONOMOUS ACTIVE
              </span>
            </div>
            <p id="agent-mission" className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {agent?.mission || 'Explain meaningful changes in AI engineering and identify what actually matters beneath the hype.'}
            </p>
          </div>
        </div>

        <div id="header-controls" className="flex items-center gap-3 self-end md:self-center">
          <button
            id="trigger-cycle-button"
            onClick={onTriggerRun}
            disabled={isTriggering || agent?.isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all shadow-md shadow-indigo-600/20"
          >
            {isTriggering || agent?.isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running Cycle...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>Trigger Run Cycle</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
