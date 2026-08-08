import { Code, Send, Terminal, Play, CheckCircle } from 'lucide-react';
import React, { useState } from 'react';

interface ApiTesterTabProps {
  currentAgentId: string;
}

export const ApiTesterTab: React.FC<ApiTesterTabProps> = ({ currentAgentId }) => {
  const [initPersonaName, setInitPersonaName] = useState('Ada');
  const [initDomain, setInitDomain] = useState('AI Security');
  const [feedAgentId, setFeedAgentId] = useState(currentAgentId || '');
  const [responseLog, setResponseLog] = useState<{ endpoint: string; status: number; data: any } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTestInit = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/agent/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: {
            name: initPersonaName,
            domain: initDomain,
          },
        }),
      });
      const data = await res.json();
      setResponseLog({
        endpoint: 'POST /api/agent/init',
        status: res.status,
        data,
      });
      if (data.agentId) setFeedAgentId(data.agentId);
    } catch (err) {
      setResponseLog({
        endpoint: 'POST /api/agent/init',
        status: 500,
        data: { error: (err as Error).message },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestFeed = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/agent/feed?agentId=${encodeURIComponent(feedAgentId)}`);
      const data = await res.json();
      setResponseLog({
        endpoint: `GET /api/agent/feed?agentId=${feedAgentId}`,
        status: res.status,
        data,
      });
    } catch (err) {
      setResponseLog({
        endpoint: `GET /api/agent/feed?agentId=${feedAgentId}`,
        status: 500,
        data: { error: (err as Error).message },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="api-tester-container" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column: Test Controls */}
      <div className="space-y-6">
        {/* Endpoint 1: POST /api/agent/init */}
        <div id="test-card-init" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 font-mono text-xs font-bold rounded border border-emerald-800">POST</span>
              <span className="font-mono text-sm font-semibold text-slate-100">/api/agent/init</span>
            </div>
            <span className="text-xs text-slate-400">Evaluator Initialization Endpoint</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Persona Name</label>
              <input
                type="text"
                value={initPersonaName}
                onChange={(e) => setInitPersonaName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Domain</label>
              <input
                type="text"
                value={initDomain}
                onChange={(e) => setInitDomain(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            onClick={handleTestInit}
            disabled={isLoading}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Execute POST /api/agent/init</span>
          </button>
        </div>

        {/* Endpoint 2: GET /api/agent/feed */}
        <div id="test-card-feed" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 font-mono text-xs font-bold rounded border border-indigo-800">GET</span>
              <span className="font-mono text-sm font-semibold text-slate-100">/api/agent/feed</span>
            </div>
            <span className="text-xs text-slate-400">Evaluator Feed Endpoint</span>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Agent ID</label>
            <input
              type="text"
              value={feedAgentId}
              onChange={(e) => setFeedAgentId(e.target.value)}
              placeholder="e.g. abc-123-uuid"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={handleTestFeed}
            disabled={isLoading || !feedAgentId}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Execute GET /api/agent/feed</span>
          </button>
        </div>
      </div>

      {/* Right Column: Console Output */}
      <div id="api-response-console" className="bg-slate-950 border border-slate-800 rounded-xl p-5 font-mono space-y-3 flex flex-col h-full min-h-[350px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-200">HTTP Response Console</span>
          </div>
          {responseLog && (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${responseLog.status === 200 || responseLog.status === 201 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400'}`}>
              Status {responseLog.status}
            </span>
          )}
        </div>

        {responseLog ? (
          <div className="space-y-3 flex-1 overflow-auto">
            <div className="text-xs text-indigo-400 font-semibold">{responseLog.endpoint}</div>
            <pre className="text-xs text-slate-300 bg-slate-900/90 p-3 rounded-lg overflow-x-auto leading-relaxed border border-slate-800">
              {JSON.stringify(responseLog.data, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600 text-xs text-center space-y-2">
            <Code className="w-8 h-8 opacity-40" />
            <p>Select an endpoint on the left to execute live API calls.</p>
          </div>
        )}
      </div>
    </div>
  );
};
