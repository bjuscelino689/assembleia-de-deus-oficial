import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, BookOpen, Share2, Copy, Sparkles, 
  ChevronRight, ArrowLeft, Check, RefreshCw, MessageSquare, 
  Bookmark, Clock, AlertCircle, Send, ExternalLink
} from 'lucide-react';

interface BibleSearchViewProps {
  onBack: () => void;
  onShareToMural?: (verseText: string, reference: string) => void;
}

interface BibleVerseItem {
  book_id?: string;
  book_name?: string;
  chapter: number;
  verse: number;
  text: string;
}

interface BibleSearchResult {
  reference: string;
  verses: BibleVerseItem[];
  text: string;
  translation_name?: string;
}

const POPULAR_PASSAGES = [
  { ref: 'Isaías 9:6', label: 'Isaías 9:6', theme: 'Príncipe da Paz' },
  { ref: 'João 3:16', label: 'João 3:16', theme: 'O Amor de Deus' },
  { ref: 'Salmos 23:1-6', label: 'Salmos 23', theme: 'O Bom Pastor' },
  { ref: 'Salmos 91:1-4', label: 'Salmos 91', theme: 'Refúgio e Fortaleza' },
  { ref: 'Filipenses 4:13', label: 'Filipenses 4:13', theme: 'Posso Todas as Coisas' },
  { ref: 'Jeremias 29:11', label: 'Jeremias 29:11', theme: 'Planos de Paz' },
  { ref: 'Romanos 8:28', label: 'Romanos 8:28', theme: 'Todas as Coisas Cooperam' },
  { ref: 'Provérbios 3:5-6', label: 'Provérbios 3:5-6', theme: 'Confia no Senhor' },
  { ref: 'Josué 1:9', label: 'Josué 1:9', theme: 'Sê Forte e Corajoso' },
  { ref: 'Mateus 6:33', label: 'Mateus 6:33', theme: 'Buscai Primeiro o Reino' }
];

const BIBLE_BOOKS_CATEGORIES = [
  {
    category: 'Antigo Testamento',
    books: [
      'Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio',
      'Josué', 'Juízes', 'Rute', '1 Samuel', '2 Samuel',
      '1 Reis', '2 Reis', '1 Crônicas', '2 Crônicas', 'Esdras',
      'Neemias', 'Ester', 'Jó', 'Salmos', 'Provérbios',
      'Eclesiastes', 'Cantares', 'Isaías', 'Jeremias', 'Lamentações',
      'Ezequiel', 'Daniel', 'Oséias', 'Joel', 'Amós',
      'Obadias', 'Jonas', 'Miquéias', 'Naum', 'Habacuque',
      'Sofonias', 'Ageu', 'Zacarias', 'Malaquias'
    ]
  },
  {
    category: 'Novo Testamento',
    books: [
      'Mateus', 'Marcos', 'Lucas', 'João', 'Atos',
      'Romanos', '1 Coríntios', '2 Coríntios', 'Gálatas', 'Efésios',
      'Filipenses', 'Colossenses', '1 Tessalonicenses', '2 Tessalonicenses', '1 Timóteo',
      '2 Timóteo', 'Tito', 'Filemom', 'Hebreus', 'Tiago',
      '1 Pedro', '2 Pedro', '1 João', '2 João', '3 João',
      'Judas', 'Apocalipse'
    ]
  }
];

export const BibleSearchView: React.FC<BibleSearchViewProps> = ({ onBack, onShareToMural }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBook, setActiveBook] = useState('Isaías');
  const [activeChapter, setActiveChapter] = useState('9');
  const [activeVerse, setActiveVerse] = useState('6');
  
  const [searchResult, setSearchResult] = useState<BibleSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sharedMural, setSharedMural] = useState(false);
  
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ad_bible_search_history');
      return saved ? JSON.parse(saved) : ['Isaías 9:6', 'Salmos 23:1-6', 'João 3:16'];
    } catch {
      return ['Isaías 9:6', 'Salmos 23:1-6', 'João 3:16'];
    }
  });

  const [mode, setMode] = useState<'text' | 'guided'>('text');
  const inputRef = useRef<HTMLInputElement>(null);

  // Executa busca inicial padrão (Isaías 9:6)
  useEffect(() => {
    executeSearch('Isaías 9:6', false);
  }, []);

  // Salva histórico
  const addToHistory = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearchHistory(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 10);
      try {
        localStorage.setItem('ad_bible_search_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Normalizador de pesquisa para tratar pontuações como "5, 7" ou "Isaías 9:5,7" ou "Isaías 9:5-7"
  const normalizeBibleQuery = (rawQuery: string): string => {
    let q = rawQuery.trim();
    if (!q) return '';

    // Se o usuário digitou apenas números como "5, 7" ou "5-7" ou "6", combina com o livro e capítulo ativos
    if (/^\d+(\s*[,-]\s*\d+)*$/.test(q)) {
      const versePart = q.replace(/\s*,\s*/g, '-').replace(/\s+/g, '');
      return `${activeBook} ${activeChapter}:${versePart}`;
    }

    // Se digitou algo como "Isaías 9 6" ou "Isaías 9, 6"
    if (/^[a-zA-ZÀ-ÿ\s\d]+\s+\d+\s*[,]\s*\d+/.test(q)) {
      // Ex: "Isaías 9, 6" -> "Isaías 9:6" ou "Isaías 9, 5-7"
      q = q.replace(/(\d+)\s*,\s*(\d+)/, '$1:$2');
    }

    // Troca vírgulas dentro do intervalo de versículos por hífen para a API
    // Ex: "Isaías 9:5, 7" ou "Isaías 9:5,7" -> "Isaías 9:5-7"
    q = q.replace(/:(\d+)\s*,\s*(\d+)/g, ':$1-$2');

    return q;
  };

  const executeSearch = async (queryToSearch: string, saveToHist = true) => {
    const parsedQuery = normalizeBibleQuery(queryToSearch);
    if (!parsedQuery) {
      setErrorMessage('Por favor, digite o nome do livro e o versículo (Ex: Isaías 9:6 ou João 3:16)');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setCopied(false);
    setSharedMural(false);

    try {
      // Consulta a API de tradução João Ferreira de Almeida
      const apiUrl = `https://bible-api.com/${encodeURIComponent(parsedQuery)}?translation=almeida`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error('Passagem não encontrada. Verifique o nome do livro e os números.');
      }

      const data = await response.json();

      if (data && data.verses && data.verses.length > 0) {
        setSearchResult({
          reference: data.reference || parsedQuery,
          verses: data.verses,
          text: data.text || data.verses.map((v: BibleVerseItem) => v.text).join(' '),
          translation_name: 'João Ferreira de Almeida'
        });

        if (saveToHist) {
          addToHistory(parsedQuery);
        }
      } else if (data && data.text) {
        setSearchResult({
          reference: data.reference || parsedQuery,
          verses: [{
            chapter: 1,
            verse: 1,
            text: data.text
          }],
          text: data.text,
          translation_name: 'João Ferreira de Almeida'
        });
        if (saveToHist) {
          addToHistory(parsedQuery);
        }
      } else {
        throw new Error('Nenhum versículo encontrado para essa referência.');
      }
    } catch (err: any) {
      console.error('Erro na pesquisa bíblica:', err);
      setErrorMessage(err.message || 'Não foi possível encontrar este versículo. Tente no formato "Isaías 9:6" ou "Salmos 23:1".');
      setSearchResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      executeSearch(searchQuery);
    }
  };

  const handleGuidedSearch = () => {
    const q = `${activeBook} ${activeChapter}:${activeVerse}`;
    setSearchQuery(q);
    executeSearch(q);
  };

  const handleCopyText = () => {
    if (!searchResult) return;
    const formatted = `"${searchResult.text.trim()}"\n— ${searchResult.reference} (Bíblia Sagrada)`;
    navigator.clipboard.writeText(formatted).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handleShareWhatsApp = () => {
    if (!searchResult) return;
    const textToShare = `📖 *${searchResult.reference}*\n\n"*${searchResult.text.trim()}*"\n\n_Assembleia de Deus Nacional - Ministério de Madureira_`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(textToShare)}`;
    window.open(url, '_blank');
  };

  const handlePublishToMural = () => {
    if (!searchResult) return;
    if (onShareToMural) {
      onShareToMural(searchResult.text.trim(), searchResult.reference);
      setSharedMural(true);
      setTimeout(() => setSharedMural(false), 3500);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-fadeIn max-w-4xl mx-auto">
      {/* CABEÇALHO DA TELA */}
      <div className="bg-gradient-to-br from-purple-700 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack} 
              className="p-3 bg-white/10 hover:bg-white/20 active:scale-95 rounded-2xl transition-all cursor-pointer text-white"
              title="Voltar"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-amber-400/20 border border-amber-300/30 text-amber-300 text-xs font-black uppercase tracking-widest rounded-full">
                  Bíblia Sagrada
                </span>
                <span className="text-xs text-purple-200 font-medium">Almeida Fiel</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-title font-black text-white mt-1">
                Pesquisa Bíblica
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setMode(mode === 'text' ? 'guided' : 'text')}
              className="px-4 py-2 bg-white/15 hover:bg-white/25 active:scale-95 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer border border-white/20"
            >
              <BookOpen size={14} className="text-amber-300" />
              {mode === 'text' ? 'Modo Seletor de Livros' : 'Digitação Livre'}
            </button>
          </div>
        </div>

        {/* CAMPO DE BUSCA PRINCIPAL */}
        <div className="mt-6 relative z-10">
          {mode === 'text' ? (
            <form onSubmit={handleFormSubmit} className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-300 pointer-events-none" size={20} />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Digite o livro e versículo (Ex: Isaías 9:6, João 3:16, 5-7)..."
                  className="w-full pl-12 pr-4 py-4 bg-white/10 dark:bg-slate-950/40 border border-white/25 focus:border-amber-400 rounded-2xl text-white placeholder-purple-200/70 text-base font-medium focus:outline-none focus:ring-2 focus:ring-amber-400/40 shadow-inner backdrop-blur-md transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-purple-200 hover:text-white uppercase font-bold"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isLoading || !searchQuery.trim()}
                className="px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer shrink-0"
              >
                {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <Search size={18} />}
                <span className="hidden sm:inline">Pesquisar</span>
              </button>
            </form>
          ) : (
            <div className="bg-white/10 dark:bg-slate-950/40 p-4 rounded-2xl border border-white/20 backdrop-blur-md space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-purple-200 uppercase tracking-wider block mb-1">
                    Livro:
                  </label>
                  <select
                    value={activeBook}
                    onChange={(e) => setActiveBook(e.target.value)}
                    className="w-full p-3 bg-slate-900 text-white rounded-xl border border-purple-400/30 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {BIBLE_BOOKS_CATEGORIES.map(cat => (
                      <optgroup key={cat.category} label={cat.category}>
                        {cat.books.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-purple-200 uppercase tracking-wider block mb-1">
                    Capítulo:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="150"
                    value={activeChapter}
                    onChange={(e) => setActiveChapter(e.target.value)}
                    placeholder="Ex: 9"
                    className="w-full p-3 bg-slate-900 text-white rounded-xl border border-purple-400/30 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-purple-200 uppercase tracking-wider block mb-1">
                    Versículo(s):
                  </label>
                  <input
                    type="text"
                    value={activeVerse}
                    onChange={(e) => setActiveVerse(e.target.value)}
                    placeholder="Ex: 6 ou 5-7"
                    className="w-full p-3 bg-slate-900 text-white rounded-xl border border-purple-400/30 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleGuidedSearch}
                  disabled={isLoading}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                  Buscar Versículo
                </button>
              </div>
            </div>
          )}

          <p className="text-xs text-purple-200/80 mt-2 font-medium flex items-center gap-1.5">
            <Sparkles size={13} className="text-amber-300 shrink-0" />
            Dica: Digite referências diretas como <b>Isaías 9:6</b>, <b>João 3:16-17</b> ou <b>Salmos 23</b>.
          </p>
        </div>
      </div>

      {/* SUGESTÕES RÁPIDAS DE PASSAGENS */}
      <div className="space-y-2">
        <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
          <Clock size={13} /> Passagens em Destaque & Mais Buscadas:
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {POPULAR_PASSAGES.map((item) => (
            <button
              key={item.ref}
              onClick={() => {
                setSearchQuery(item.ref);
                executeSearch(item.ref);
              }}
              className="px-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-xs font-bold text-slate-800 dark:text-zinc-200 whitespace-nowrap hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400 active:scale-95 transition-all shadow-sm flex flex-col items-start gap-0.5 cursor-pointer shrink-0"
            >
              <span className="font-black text-purple-700 dark:text-purple-400">{item.label}</span>
              <span className="text-[10px] text-slate-400 font-medium">{item.theme}</span>
            </button>
          ))}
        </div>
      </div>

      {/* RESULTADO DA PESQUISA BÍBLICA */}
      {isLoading ? (
        <div className="bg-white dark:bg-zinc-900 p-12 rounded-[2.5rem] border border-slate-100 dark:border-zinc-800 text-center space-y-4 shadow-sm">
          <div className="inline-block p-4 bg-purple-50 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400 animate-spin">
            <RefreshCw size={32} />
          </div>
          <h3 className="text-lg font-black text-slate-800 dark:text-zinc-100">Buscando na Palavra de Deus...</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Carregando o texto bíblico com precisão e fidelidade.
          </p>
        </div>
      ) : errorMessage ? (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 p-6 rounded-[2rem] flex items-start gap-4">
          <AlertCircle size={24} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-black text-rose-900 dark:text-rose-200 text-sm">Passagem não encontrada</h4>
            <p className="text-xs text-rose-700 dark:text-rose-300 font-medium leading-relaxed">
              {errorMessage}
            </p>
            <div className="pt-2 flex gap-2">
              <button
                onClick={() => {
                  setSearchQuery('Isaías 9:6');
                  executeSearch('Isaías 9:6');
                }}
                className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold active:scale-95 cursor-pointer"
              >
                Tentar Isaías 9:6
              </button>
              <button
                onClick={() => {
                  setSearchQuery('João 3:16');
                  executeSearch('João 3:16');
                }}
                className="px-3 py-1.5 bg-white dark:bg-zinc-900 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold active:scale-95 cursor-pointer"
              >
                Tentar João 3:16
              </button>
            </div>
          </div>
        </div>
      ) : searchResult ? (
        <div className="bg-amber-50/40 dark:bg-zinc-900 border-2 border-amber-200/80 dark:border-zinc-800 rounded-[2.5rem] p-6 sm:p-8 shadow-md relative overflow-hidden">
          {/* TOPO DO CARD DE RESULTADO */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-amber-200/60 dark:border-zinc-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-purple-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm">
                  {searchResult.reference}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
                  {searchResult.translation_name || 'Almeida Fiel'}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-black text-slate-900 dark:text-white">
                {searchResult.reference}
              </h2>
            </div>

            {/* BOTÕES DE AÇÃO RÁPIDA (COPIAR, MURAL, WHATSAPP) */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleCopyText}
                className="p-3 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:border-purple-500 rounded-2xl transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95"
                title="Copiar Versículo"
              >
                {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95 shadow-md shadow-emerald-600/20"
                title="Enviar no WhatsApp"
              >
                <Share2 size={16} />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>

              {onShareToMural && (
                <button
                  onClick={handlePublishToMural}
                  className={`p-3 rounded-2xl transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95 shadow-md ${
                    sharedMural
                      ? 'bg-purple-800 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/20'
                  }`}
                  title="Publicar no Mural da Fé da Igreja"
                >
                  {sharedMural ? <Check size={16} /> : <Sparkles size={16} />}
                  <span className="hidden sm:inline">{sharedMural ? 'No Mural!' : 'Mural da Fé'}</span>
                </button>
              )}
            </div>
          </div>

          {/* TEXTO DO VERSÍCULO COM TIPOGRAFIA SAGRADA EM NEGRITO */}
          <div className="py-6 space-y-4">
            {searchResult.verses && searchResult.verses.length > 0 ? (
              <div className="space-y-3">
                {searchResult.verses.map((v, idx) => (
                  <p key={idx} className="font-serif font-bold text-lg sm:text-xl text-slate-900 dark:text-zinc-50 leading-relaxed tracking-wide">
                    <span className="font-sans font-black text-xs text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2.5 py-1 rounded-md mr-2.5 select-none align-middle border border-amber-300/40">
                      {v.verse}
                    </span>
                    {v.text.trim()}
                  </p>
                ))}
              </div>
            ) : (
              <p className="font-serif font-bold text-lg sm:text-xl text-slate-900 dark:text-zinc-50 leading-relaxed italic">
                "{searchResult.text.trim()}"
              </p>
            )}
          </div>

          {/* RODAPÉ DO CARD */}
          <div className="pt-4 border-t border-amber-200/60 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 font-medium">
            <span>Assembleia de Deus Nacional</span>
            <span>Tradução: Almeida Corrigida</span>
          </div>
        </div>
      ) : null}

      {/* HISTÓRICO DE PESQUISAS RECENTES */}
      {searchHistory.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-slate-100 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} /> Pesquisas Recentes
            </h4>
            <button
              onClick={() => {
                setSearchHistory([]);
                localStorage.removeItem('ad_bible_search_history');
              }}
              className="text-[10px] text-slate-400 hover:text-rose-500 font-bold uppercase"
            >
              Limpar Histórico
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {searchHistory.map((hist, i) => (
              <button
                key={i}
                onClick={() => {
                  setSearchQuery(hist);
                  executeSearch(hist);
                }}
                className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-purple-100 dark:hover:bg-purple-950 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <BookOpen size={12} className="text-purple-600" />
                {hist}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BibleSearchView;
