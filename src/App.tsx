import { Activity, Brain, Code, FileText, Filter, Newspaper, RefreshCw } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ApiTesterTab } from './components/ApiTesterTab';
import { EditorialTab, EditorialTopic } from './components/EditorialTab';
import { FeedPost, FeedTab } from './components/FeedTab';
import { Header } from './components/Header';
import { MemoryItem, MemoryTab } from './components/MemoryTab';
import { SystemStatus } from './components/SystemStatus';

export function App() {
  const [activeTab, setActiveTab] = useState<'feed' | 'editorial' | 'memory' | 'tester'>('feed');

  const [agent, setAgent] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [editorialTopics, setEditorialTopics] = useState<EditorialTopic[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [health, setHealth] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);

  // Fetch complete agent state and feed
  const fetchDashboardData = async () => {
    try {
      // 1. Health check
      const healthRes = await fetch('/health');
      if (healthRes.ok) {
        const hData = await healthRes.json();
        setHealth(hData);
      }

      // 2. Status & stats
      const statusRes = await fetch('/api/agent/status');
      if (statusRes.ok) {
        const sData = await statusRes.json();
        setAgent(sData.agent);
        setStats(sData.stats);

        // 3. Feed posts
        if (sData.agent?.id) {
          const feedRes = await fetch(`/api/agent/feed?agentId=${sData.agent.id}`);
          if (feedRes.ok) {
            const fData = await feedRes.json();
            setPosts(fData.posts || []);
          }

          // 4. Editorial topics
          const editRes = await fetch(`/api/agent/editorial?agentId=${sData.agent.id}`);
          if (editRes.ok) {
            const eData = await editRes.json();
            setEditorialTopics(eData.topics || []);
          }

          // 5. Memory items
          const memRes = await fetch(`/api/agent/memory?agentId=${sData.agent.id}`);
          if (memRes.ok) {
            const mData = await memRes.json();
            setMemories(mData.memories || []);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load & 15s polling timer for real-time dashboard updates
  useEffect(() => {
    fetchDashboardData();

    const interval = setInterval(() => {
      fetchDashboardData();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // Trigger immediate cycle run
  const handleTriggerRun = async () => {
    setIsTriggering(true);
    try {
      const res = await fetch('/api/agent/trigger', { method: 'POST' });
      if (res.ok) {
        await fetchDashboardData();
      }
    } catch (err) {
      console.error('Trigger error:', err);
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div id="app-root-container" className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Top Navigation Header */}
      <Header agent={agent} onTriggerRun={handleTriggerRun} isTriggering={isTriggering} />

      {/* Main Dashboard Canvas */}
      <main id="main-dashboard-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* System Health & Metric Cards */}
        <SystemStatus
          health={health}
          stats={stats}
          lastRunAt={agent?.lastRunAt || null}
          nextRunAt={agent?.nextRunAt || null}
        />

        {/* Dashboard Navigation Tabs */}
        <div id="dashboard-tab-bar" className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              id="tab-btn-feed"
              onClick={() => setActiveTab('feed')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'feed'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Newspaper className="w-4 h-4" />
              <span>Live Feed ({posts.length})</span>
            </button>

            <button
              id="tab-btn-editorial"
              onClick={() => setActiveTab('editorial')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'editorial'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Editorial Activity ({editorialTopics.length})</span>
            </button>

            <button
              id="tab-btn-memory"
              onClick={() => setActiveTab('memory')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'memory'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Brain className="w-4 h-4" />
              <span>Agent Memory ({memories.length})</span>
            </button>

            <button
              id="tab-btn-tester"
              onClick={() => setActiveTab('tester')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'tester'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Code className="w-4 h-4" />
              <span>API Console</span>
            </button>
          </div>

          <button
            onClick={fetchDashboardData}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition-colors"
            title="Refresh Dashboard Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Content Display */}
        <section id="tab-content-area" className="mt-4">
          {activeTab === 'feed' && <FeedTab posts={posts} isLoading={isLoading} />}
          {activeTab === 'editorial' && <EditorialTab topics={editorialTopics} />}
          {activeTab === 'memory' && <MemoryTab memories={memories} persona={agent} />}
          {activeTab === 'tester' && <ApiTesterTab currentAgentId={agent?.id || ''} />}
        </section>
      </main>

      {/* Footer */}
      <footer id="app-footer" className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Autonomous AI Creator Challenge — Production Deployment Ready</span>
          <span>POST /api/agent/init &bull; GET /api/agent/feed</span>
        </div>
      </footer>
    </div>
  );
}
export default App;
