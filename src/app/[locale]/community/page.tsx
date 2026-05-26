import React from 'react';
import { MessageSquare, Users, TrendingUp, Search, Plus } from 'lucide-react';
import { Link } from '@/navigation';

export default function CommunityPage() {
  const threads = [
    {
      id: 1,
      title: 'Monsters: 103 Mercies Dragon Damnation - Prequel Episode Discussion!',
      author: 'Luffy_56',
      replies: 142,
      category: 'Episode Discussion',
      time: '2 hours ago'
    },
    {
      id: 2,
      title: 'One Piece Egghead Arc: Will we see the Giant Robot react soon?',
      author: 'Zoro_Lost',
      replies: 89,
      category: 'Theory',
      time: '4 hours ago'
    },
    {
      id: 3,
      title: 'Recommend me some dark fantasy anime like Solo Leveling or Jujutsu Kaisen',
      author: 'AniplexFan',
      replies: 213,
      category: 'Recommendations',
      time: '1 day ago'
    },
    {
      id: 4,
      title: 'Which anime studio has the absolute best visual art direction in 2026?',
      author: 'Ufotable_Stan',
      replies: 341,
      category: 'Discussion',
      time: '2 days ago'
    }
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Forum Header Banner */}
      <div className="bg-anime-card rounded-2xl p-6 md:p-10 border border-anime-border/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[200px] bg-anime-orange/5 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center space-x-1 bg-anime-orange/10 border border-anime-orange/20 text-anime-orange text-xs font-bold px-3 py-1 rounded-full">
            <Users size={12} />
            <span>COMMUNITY FORUM</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            Discuss Anime With <span className="text-anime-orange">Fans Globally</span>
          </h1>
          <p className="text-sm text-anime-muted max-w-xl">
            Welcome to the Aniworld fan discussion hub! Join thousands of Otaku in ongoing episode reviews, fan theories, rating threads, and community events.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button className="bg-anime-orange hover:bg-anime-orangeHover text-black text-xs font-extrabold px-5 py-2.5 rounded-full flex items-center space-x-1.5 shadow-lg hover:shadow-orange-500/10 transition">
              <Plus size={14} />
              <span>Create New Thread</span>
            </button>
            <div className="relative max-w-xs">
              <input
                type="text"
                placeholder="Search forum..."
                className="bg-anime-dark border border-anime-border text-xs rounded-full py-2.5 pl-4 pr-10 focus:outline-none focus:border-anime-orange text-gray-200"
              />
              <Search size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Forum Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Threads List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-black text-white tracking-tight flex items-center space-x-2 border-b border-anime-border/40 pb-2">
            <TrendingUp size={18} className="text-anime-orange" />
            <span>Trending Discussion Threads</span>
          </h2>

          <div className="space-y-3">
            {threads.map((t) => (
              <div
                key={t.id}
                className="bg-anime-card border border-anime-border/40 rounded-xl p-5 hover:border-anime-orange/30 transition group flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <span className="inline-block bg-anime-dark border border-anime-border text-[9px] font-bold text-anime-orange uppercase px-2 py-0.5 rounded tracking-wide">
                    {t.category}
                  </span>
                  <a
                    href="#"
                    className="block text-sm font-bold text-white group-hover:text-anime-orange transition-colors truncate max-w-full"
                  >
                    {t.title}
                  </a>
                  <div className="text-[10px] text-anime-muted flex items-center space-x-2">
                    <span>By {t.author}</span>
                    <span>•</span>
                    <span>{t.time}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-xs font-semibold bg-anime-dark/60 rounded-full py-1.5 px-4 border border-anime-border/40 w-fit self-end md:self-auto">
                  <MessageSquare size={13} className="text-anime-orange" />
                  <span className="text-gray-200">{t.replies} Replies</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Rules Panel */}
          <div className="bg-anime-card border border-anime-border/40 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-black text-white border-b border-anime-border/20 pb-2 tracking-wide uppercase">
              Forum Guidelines
            </h3>
            <ul className="space-y-2 text-xs text-anime-muted leading-relaxed">
              <li className="flex items-start">
                <span className="text-anime-orange mr-1.5 font-bold">•</span>
                <span>Be respectful and welcoming to other community members.</span>
              </li>
              <li className="flex items-start">
                <span className="text-anime-orange mr-1.5 font-bold">•</span>
                <span>Use spoiler tags when discussing recent episode events.</span>
              </li>
              <li className="flex items-start">
                <span className="text-anime-orange mr-1.5 font-bold">•</span>
                <span>Do not post links to illegal streaming sites. Keep discussions clean.</span>
              </li>
            </ul>
          </div>

          {/* Activity Panel */}
          <div className="bg-anime-card border border-anime-border/40 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-black text-white border-b border-anime-border/20 pb-2 tracking-wide uppercase">
              Active Users
            </h3>
            <div className="flex items-center space-x-3 text-xs text-gray-200">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold">4,129 Otakus Online Now</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
