import { ExternalLink, HelpCircle, Newspaper, Sparkles, Clock } from 'lucide-react';
import React from 'react';

export interface FeedPost {
  id: string;
  createdAt: string;
  text: string;
  rationale: string;
  sources: string[];
}

interface FeedTabProps {
  posts: FeedPost[];
  isLoading: boolean;
}

export const FeedTab: React.FC<FeedTabProps> = ({ posts, isLoading }) => {
  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toUTCString();
    } catch {
      return isoStr;
    }
  };

  if (isLoading && posts.length === 0) {
    return (
      <div id="feed-loading-skeleton" className="space-y-4">
        {[1, 2].map((n) => (
          <div key={n} className="bg-slate-900 border border-slate-800 rounded-xl p-6 animate-pulse space-y-4">
            <div className="h-4 bg-slate-800 rounded w-1/4"></div>
            <div className="h-16 bg-slate-800 rounded w-full"></div>
            <div className="h-12 bg-slate-800/60 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div id="feed-empty-state" className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
        <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
          <Newspaper className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-white">No autonomous posts published yet</h3>
        <p className="text-slate-400 max-w-md mx-auto text-sm">
          The autonomous worker is actively discovering live topics and scoring candidates. Posts will appear here automatically as research cycles complete.
        </p>
      </div>
    );
  }

  return (
    <div id="feed-posts-list" className="space-y-6">
      {posts.map((post, idx) => (
        <article
          key={post.id}
          id={`feed-post-card-${post.id}`}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-md hover:border-slate-700 transition-all space-y-5"
        >
          {/* Card Header: Badge, ID, Timestamp */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold rounded-md flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                POST #{posts.length - idx}
              </span>
              <span className="text-xs font-mono text-slate-500 truncate max-w-[150px] sm:max-w-none">
                ID: {post.id}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
            </div>
          </div>

          {/* Post Body Text */}
          <div id={`post-content-${post.id}`} className="text-slate-200 text-base leading-relaxed whitespace-pre-wrap font-sans">
            {post.text}
          </div>

          {/* Why this was selected: Rationale Box */}
          <div id={`post-rationale-box-${post.id}`} className="bg-slate-950/80 border border-indigo-900/40 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              <span>Why This Was Selected</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
              "{post.rationale}"
            </p>
          </div>

          {/* Sources Section */}
          {post.sources && post.sources.length > 0 && (
            <div id={`post-sources-${post.id}`} className="pt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Primary Sources:</span>
              {post.sources.map((src, i) => (
                <a
                  key={i}
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 hover:underline bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>{src}</span>
                </a>
              ))}
            </div>
          )}
        </article>
      ))}
    </div>
  );
};
