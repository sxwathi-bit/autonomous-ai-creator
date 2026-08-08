import { CheckCircle, ExternalLink, Filter, XCircle } from 'lucide-react';
import React, { useState } from 'react';

export interface EditorialTopic {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  score: number;
  decision: 'accepted' | 'rejected';
  rejectionReason: string | null;
  editorialAngle: string | null;
  discoveredAt: string;
}

interface EditorialTabProps {
  topics: EditorialTopic[];
}

export const EditorialTab: React.FC<EditorialTabProps> = ({ topics }) => {
  const [filter, setFilter] = useState<'all' | 'accepted' | 'rejected'>('all');

  const filteredTopics = topics.filter((t) => {
    if (filter === 'accepted') return t.decision === 'accepted';
    if (filter === 'rejected') return t.decision === 'rejected';
    return true;
  });

  const acceptedCount = topics.filter((t) => t.decision === 'accepted').length;
  const rejectedCount = topics.filter((t) => t.decision === 'rejected').length;

  return (
    <div id="editorial-tab-container" className="space-y-6">
      {/* Filter Tabs & Counter Banner */}
      <div id="editorial-header-row" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-indigo-400" />
          <h3 className="font-semibold text-slate-100">Editorial Judgment Pipeline</h3>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({topics.length})
          </button>
          <button
            onClick={() => setFilter('accepted')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === 'accepted' ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Accepted ({acceptedCount})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === 'rejected' ? 'bg-rose-900/60 text-rose-300 border border-rose-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Rejected ({rejectedCount})
          </button>
        </div>
      </div>

      {/* Topics Grid */}
      {filteredTopics.length === 0 ? (
        <div id="editorial-empty-state" className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 text-sm">
          No topic evaluations match the selected filter.
        </div>
      ) : (
        <div id="editorial-topics-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTopics.map((topic) => (
            <div
              key={topic.id}
              id={`topic-card-${topic.id}`}
              className={`bg-slate-900 border rounded-xl p-5 space-y-3.5 transition-all ${
                topic.decision === 'accepted'
                  ? 'border-emerald-900/60 hover:border-emerald-700/80 bg-gradient-to-b from-slate-900 to-emerald-950/10'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {topic.decision === 'accepted' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      ACCEPTED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-800">
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      REJECTED
                    </span>
                  )}
                  <span className="text-xs font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    Score: {topic.score}/100
                  </span>
                </div>

                <a
                  href={topic.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-indigo-400 transition-colors p-1"
                  title="View Source"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div>
                <h4 className="font-semibold text-slate-100 text-base leading-snug">
                  {topic.title}
                </h4>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                  {topic.summary}
                </p>
              </div>

              {/* Decision Detail Banner */}
              {topic.decision === 'rejected' ? (
                <div className="bg-rose-950/40 border border-rose-900/50 rounded-lg p-3 text-xs text-rose-300 space-y-1">
                  <span className="font-semibold uppercase tracking-wide text-rose-400 block">Rejected because:</span>
                  <p className="italic">"{topic.rejectionReason || 'Fell below minimum editorial threshold.'}"</p>
                </div>
              ) : (
                <div className="bg-emerald-950/40 border border-emerald-900/50 rounded-lg p-3 text-xs text-emerald-300 space-y-1">
                  <span className="font-semibold uppercase tracking-wide text-emerald-400 block">Selected Editorial Angle:</span>
                  <p className="italic">"{topic.editorialAngle || 'Technical deep dive analysis'}"</p>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-800/60">
                <span>Source: {topic.source}</span>
                <span>Discovered: {new Date(topic.discoveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
