import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, Beaker, Search, Filter, Clock, HelpCircle, Star, ChevronRight } from 'lucide-react';
import { api, type PackSummary } from '../services/api';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

const CATEGORY_CONFIG = {
  culture: {
    label: 'Culture & Stories',
    icon: BookOpen,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    description: 'African folklore, Nigerian history, civic education, and cultural heritage',
  },
  stem: {
    label: 'STEM & Exam Practice',
    icon: Beaker,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    description: 'Mathematics, sciences, and curriculum-aligned practice questions',
  },
} as const;

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-emerald-500/20 text-emerald-300',
  intermediate: 'bg-yellow-500/20 text-yellow-300',
  advanced: 'bg-red-500/20 text-red-300',
  mixed: 'bg-violet-500/20 text-violet-300',
};

export function PackBrowser() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') as 'culture' | 'stem' | null;
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('');
  const [subjectFilter, setSubjectFilter] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    api.getPacks(category ?? undefined, searchQuery || undefined)
      .then(setPacks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [category, searchQuery]);

  const filteredPacks = packs.filter(p => {
    if (difficultyFilter && p.difficulty !== difficultyFilter) return false;
    if (subjectFilter && p.subject !== subjectFilter) return false;
    return true;
  });

  const subjects = [...new Set(packs.map(p => p.subject).filter(Boolean))] as string[];

  if (!category) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-white">Content Packs</h1>
          <p className="text-slate-400 max-w-md mx-auto">
            Ready-made educational content you can preview, explore, and import into your quizzes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(Object.entries(CATEGORY_CONFIG) as [keyof typeof CATEGORY_CONFIG, typeof CATEGORY_CONFIG[keyof typeof CATEGORY_CONFIG]][]).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={key}
                onClick={() => setSearchParams({ category: key })}
                className={`text-left p-6 rounded-xl border-2 ${config.border} ${config.bg} hover:scale-[1.02] transition-all duration-200 cursor-pointer`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl ${config.bg} ${config.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <h2 className={`text-xl font-bold ${config.color} mb-1`}>{config.label}</h2>
                    <p className="text-sm text-slate-400 leading-relaxed">{config.description}</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${config.color} mt-1 flex-shrink-0`} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setSearchParams({})}>
          Back
        </Button>
        <div className={`w-10 h-10 rounded-lg ${config.bg} ${config.color} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{config.label}</h1>
          <p className="text-sm text-slate-400">{config.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search packs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-[#334155] border border-slate-600 rounded-lg text-slate-100 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
          />
        </div>
        {subjects.length > 1 && (
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2 bg-[#334155] border border-slate-600 rounded-lg text-slate-100 text-sm outline-none"
          >
            <option value="">All subjects</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          className="px-3 py-2 bg-[#334155] border border-slate-600 rounded-lg text-slate-100 text-sm outline-none"
        >
          <option value="">All levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredPacks.length === 0 ? (
        <Card className="text-center py-12">
          <Filter className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-300 mb-1">No packs found</h2>
          <p className="text-sm text-slate-400">Try adjusting your search or filters</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPacks.map(pack => (
            <Link key={pack.id} to={`/packs/${pack.slug}`}>
              <Card className="hover:bg-slate-700/30 transition-colors cursor-pointer h-full flex flex-col">
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-white">{pack.title}</h3>
                    {pack.difficulty && (
                      <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${DIFFICULTY_COLORS[pack.difficulty] ?? DIFFICULTY_COLORS.mixed}`}>
                        {pack.difficulty}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mb-3 line-clamp-2">{pack.description}</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {pack.tags.slice(0, 4).map(tag => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 pt-3 border-t border-slate-700/50">
                  <span className="flex items-center gap-1">
                    <HelpCircle className="w-3 h-3" /> {pack.totalQuestions} questions
                  </span>
                  {pack.estimatedDurationMin && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> ~{pack.estimatedDurationMin} min
                    </span>
                  )}
                  {pack.timesUsed > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3" /> Used {pack.timesUsed}x
                    </span>
                  )}
                  {pack.subject && (
                    <span className="ml-auto text-slate-400">{pack.subject}</span>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
