import { Brain, Bookmark, ShieldCheck, Tag } from 'lucide-react';
import React from 'react';

export interface MemoryItem {
  id: string;
  type: string;
  content: string;
  createdAt: string;
}

interface MemoryTabProps {
  memories: MemoryItem[];
  persona: {
    name: string;
    domain: string;
    mission: string;
    editorialPrinciples: string[];
    writingStyle: string[];
  } | null;
}

export const MemoryTab: React.FC<MemoryTabProps> = ({ memories, persona }) => {
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'published_topic':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">Published Topic</span>;
      case 'published_angle':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">Editorial Angle</span>;
      case 'rejected_topic':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-800">Rejected Topic</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">{type}</span>;
    }
  };

  return (
    <div id="memory-tab-container" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Persistent Persona & Editorial Guidelines */}
      <div id="persona-profile-card" className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 lg:col-span-1">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100">{persona?.name || 'NOVA'} Persona Blueprint</h3>
            <p className="text-xs text-slate-400">{persona?.domain || 'AI Engineering'}</p>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Editorial Principles</h4>
          <ul className="space-y-2 text-xs text-slate-300">
            {persona?.editorialPrinciples?.map((principle, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">•</span>
                <span className="leading-relaxed">{principle}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3 pt-2 border-t border-slate-800">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Writing Style</h4>
          <ul className="space-y-2 text-xs text-slate-300">
            {persona?.writingStyle?.map((style, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span className="leading-relaxed">{style}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right Column: Memory Timeline */}
      <div id="memory-timeline-card" className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 lg:col-span-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-slate-100">Persistent Agent Memory Log</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">{memories.length} Recorded Entries</span>
        </div>

        {memories.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No agent memory entries recorded yet. Memories accumulate automatically across research cycles.
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {memories.map((mem) => (
              <div
                key={mem.id}
                id={`memory-item-${mem.id}`}
                className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  {getTypeBadge(mem.type)}
                  <span className="text-xs text-slate-500 font-mono">
                    {new Date(mem.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-mono leading-relaxed">
                  {mem.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
