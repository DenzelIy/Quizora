import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { BookOpen, Beaker, Search, Filter, Clock, HelpCircle, Star, ChevronRight, Upload, CheckCircle2, AlertCircle, Loader2, PenTool } from 'lucide-react';
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
  const navigate = useNavigate();
  const category = searchParams.get('category') as 'culture' | 'stem' | null;
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('');
  const [subjectFilter, setSubjectFilter] = useState<string>('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState<{ slug: string; title: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    setImportError('');
    setImportSuccess(null);
    try {
      const text = await file.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Invalid JSON file');
      }
      const pack = await api.importPackFromFile(data);
      setImportSuccess({ slug: pack.slug, title: pack.title });
    } catch (err: any) {
      setImportError(err.message || 'Import failed');
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!category) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-white">Content Packs</h1>
          <p className="text-slate-400 max-w-md mx-auto">
            Ready-made educational content you can preview, explore, and import into your quizzes
          </p>
          <div className="pt-2 flex flex-wrap gap-2 justify-center">
            <Link to="/story/new">
              <Button
                variant="ghost"
                size="sm"
                icon={<PenTool className="w-4 h-4" />}
              >
                Create Story Pack
              </Button>
            </Link>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />
            <Button
              variant="ghost"
              size="sm"
              icon={<Upload className="w-4 h-4" />}
              onClick={() => setShowImportModal(true)}
            >
              Import Pack from JSON
            </Button>
          </div>
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

        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => { setShowImportModal(false); setImportError(''); setImportSuccess(null); }}>
            <Card className="w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-semibold text-white mb-4">Import Content Pack</h2>
              {importSuccess ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                  <p className="text-white font-medium">Imported "{importSuccess.title}"</p>
                  <p className="text-sm text-slate-400 mt-1">Pack is now available in your library</p>
                  <div className="flex gap-3 mt-4">
                    <Button variant="ghost" className="flex-1" onClick={() => { setShowImportModal(false); setImportSuccess(null); window.location.reload(); }}>
                      Close
                    </Button>
                    <Button variant="primary" className="flex-1" onClick={() => navigate(`/packs/${importSuccess.slug}`)}>
                      View Pack
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-400 mb-4">
                    Select a JSON file exported from Quizora to import a content pack.
                  </p>
                  {importError && (
                    <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-4">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {importError}
                    </div>
                  )}
                  {importLoading ? (
                    <div className="text-center py-6">
                      <Loader2 className="w-8 h-8 animate-spin text-violet-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">Importing pack...</p>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <Button variant="ghost" className="flex-1" onClick={() => { setShowImportModal(false); setImportError(''); }}>Cancel</Button>
                      <Button variant="primary" className="flex-1" icon={<Upload className="w-4 h-4" />} onClick={() => fileInputRef.current?.click()}>
                        Choose File
                      </Button>
                    </div>
                  )}
                </>
              )}
            </Card>
          </div>
        )}
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
