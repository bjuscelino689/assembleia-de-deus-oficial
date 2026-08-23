import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Hymn, UserProfile } from '../types';
import { 
  searchHymnsLocally, 
  HARPA_TITLES_MAP, 
  HARPA_LYRICS_MAP,
  GOSPEL_RADIOS,
  GospelRadio 
} from '../data/hymnsData';
import { 
  Search, 
  Play, 
  Pause, 
  Radio, 
  Sparkles, 
  Loader2, 
  Volume2, 
  VolumeX, 
  Share2, 
  Download, 
  Copy, 
  Check, 
  BookOpen, 
  Tv, 
  ExternalLink, 
  X, 
  CheckCircle2,
  Headphones,
  FileText,
  AlertCircle
} from 'lucide-react';

interface HymnsViewProps {
  user?: UserProfile;
}

export const HymnsView: React.FC<HymnsViewProps> = ({ user }) => {
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<Hymn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Controle de Rádio Gospel ao Vivo
  const [activeRadio, setActiveRadio] = useState<GospelRadio | null>(null);
  const [isRadioPlaying, setIsRadioPlaying] = useState(false);
  const [isRadioBuffering, setIsRadioBuffering] = useState(false);
  const [radioVolume, setRadioVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);

  // Modal / Visualizador de Hino e Vídeo
  const [selectedHymn, setSelectedHymn] = useState<Hymn | null>(null);
  const [showLyricsModal, setShowLyricsModal] = useState<Hymn | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shareSuccessMessage, setShareSuccessMessage] = useState<string | null>(null);

  const radioAudioRef = useRef<HTMLAudioElement | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Inicializa o player de rádio HTML5
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    audio.volume = radioVolume;

    const handlePlay = () => {
      setIsRadioPlaying(true);
      setIsRadioBuffering(false);
    };
    const handlePause = () => {
      setIsRadioPlaying(false);
      setIsRadioBuffering(false);
    };
    const handleWaiting = () => setIsRadioBuffering(true);
    const handlePlaying = () => {
      setIsRadioPlaying(true);
      setIsRadioBuffering(false);
    };
    const handleError = (e: any) => {
      console.warn('Erro no streaming de rádio:', e);
      setIsRadioPlaying(false);
      setIsRadioBuffering(false);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('error', handleError);

    radioAudioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  // Atualiza volume
  useEffect(() => {
    if (radioAudioRef.current) {
      radioAudioRef.current.volume = isMuted ? 0 : radioVolume;
    }
  }, [radioVolume, isMuted]);

  // Função para tocar rádio gospel ao vivo
  const handleToggleRadio = (radio: GospelRadio) => {
    if (!radioAudioRef.current) return;

    if (activeRadio?.id === radio.id && isRadioPlaying) {
      radioAudioRef.current.pause();
      setIsRadioPlaying(false);
    } else {
      setActiveRadio(radio);
      setIsRadioBuffering(true);
      radioAudioRef.current.src = radio.streamUrl;
      radioAudioRef.current.load();
      radioAudioRef.current.play().then(() => {
        setIsRadioPlaying(true);
        setIsRadioBuffering(false);
      }).catch(err => {
        console.warn('Erro ao inicializar rádio:', err);
        setIsRadioBuffering(false);
      });
    }
  };

  // Parar Rádio
  const handleStopRadio = () => {
    if (radioAudioRef.current) {
      radioAudioRef.current.pause();
      radioAudioRef.current.src = '';
    }
    setActiveRadio(null);
    setIsRadioPlaying(false);
    setIsRadioBuffering(false);
  };

  // Busca de hinos (Local imediata + Backend online com vídeos/voz real)
  const performSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      setHasSearched(false);
      setIsLoading(false);
      return;
    }

    setHasSearched(true);
    setIsLoading(true);

    // Passo 1: Busca Instantânea Local de Harpa
    const localMatches = searchHymnsLocally(trimmed);
    if (localMatches.length > 0) {
      setSearchResults(localMatches);
    }

    // Passo 2: Busca no servidor para obter cantores e vídeos oficiais
    try {
      const res = await fetch(`/api/hymns/search?q=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && Array.isArray(data.results) && data.results.length > 0) {
          const map = new Map<string, Hymn>();
          data.results.forEach((h: Hymn) => {
            if (h.id) map.set(h.id, h);
          });
          localMatches.forEach((h: Hymn) => {
            if (!map.has(h.id)) map.set(h.id, h);
          });
          setSearchResults(Array.from(map.values()));
        }
      }
    } catch (e) {
      console.warn('Erro ao pesquisar hinos online:', e);
    }

    setIsLoading(false);
  }, []);

  // Debounce na digitação
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!searchInput.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      setIsLoading(false);
      return;
    }

    const local = searchHymnsLocally(searchInput);
    if (local.length > 0) {
      setSearchResults(local);
      setHasSearched(true);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchInput);
    }, 400);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchInput, performSearch]);

  // COMPARTILHAR HINO
  const handleShareHymn = async (hymn: Hymn) => {
    const title = hymn.title;
    const artist = hymn.artist;
    const shareUrl = hymn.youtubeId 
      ? `https://www.youtube.com/watch?v=${hymn.youtubeId}` 
      : window.location.href;

    const shareText = `🎶 Ouça o louvor "${title}" (${artist}) no aplicativo da Assembleia de Deus:\n${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${title} - ${artist}`,
          text: shareText,
          url: shareUrl
        });
        return;
      } catch (err) {
        // Fallback se o usuário cancelar ou o navegador não suportar
      }
    }

    // Fallback para Copiar Link ou WhatsApp
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedId(hymn.id);
      setShareSuccessMessage(`Link de "${title}" copiado para compartilhar!`);
      setTimeout(() => {
        setCopiedId(null);
        setShareSuccessMessage(null);
      }, 3000);
    } catch (err) {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  // BAIXAR HINO / LETRA / ARQUIVO
  const handleDownloadHymn = (hymn: Hymn) => {
    // Se tiver letra, cria o arquivo de texto para download direto no celular
    const lyricsContent = hymn.lyrics || HARPA_LYRICS_MAP[Number(hymn.number)] || `Hino: ${hymn.title}\nCantor: ${hymn.artist}\nAssembleia de Deus\n\nLink: https://www.youtube.com/watch?v=${hymn.youtubeId || ''}`;
    
    const element = document.createElement('a');
    const file = new Blob([lyricsContent], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${hymn.title.replace(/[^a-zA-Z0-9]/g, '_')}_Letra.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    setShareSuccessMessage(`Download de "${hymn.title}" iniciado com sucesso!`);
    setTimeout(() => setShareSuccessMessage(null), 3000);
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-4xl mx-auto pb-48">
      
      {/* ALERTA FLUTUANTE DE SUCESSO DE COMPARTILHAMENTO / DOWNLOAD */}
      {shareSuccessMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[10000] bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-black animate-bounce">
          <CheckCircle2 size={18} />
          <span>{shareSuccessMessage}</span>
        </div>
      )}

      {/* CABEÇALHO DA SEÇÃO DE RÁDIOS GOSPEL AO VIVO */}
      <div className="bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 text-white p-5 sm:p-7 rounded-[2.5rem] shadow-2xl border border-purple-800/40 relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Radio className="text-amber-400 animate-pulse" size={24} />
              <h2 className="text-xl sm:text-2xl font-title font-black tracking-tight text-white">
                Rádios Gospel — Pregação & Hinos em Português
              </h2>
            </div>
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase rounded-full border border-emerald-500/30 flex items-center gap-1">
                ● 100% em Português
              </span>
              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase rounded-full border border-amber-500/30">
                Pregação & Harpa 24h
              </span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-purple-200/90 font-medium">
            Emissoras ao vivo com pregação bíblica expositiva, estudos da Palavra de Deus, momentos de oração e os grandes hinos da Harpa Cristã cantados em português.
          </p>

          {/* GRID DE RÁDIOS GOSPEL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
            {GOSPEL_RADIOS.map((radio) => {
              const isThisActive = activeRadio?.id === radio.id && isRadioPlaying;

              return (
                <div
                  key={radio.id}
                  onClick={() => handleToggleRadio(radio)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 relative overflow-hidden group ${
                    activeRadio?.id === radio.id
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xl ring-2 ring-amber-400/50'
                      : 'bg-white/10 hover:bg-white/20 border-white/10 text-white shadow-sm'
                  }`}
                >
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-900 shrink-0 shadow-md">
                    <img 
                      src={radio.coverUrl} 
                      alt={radio.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-all" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      {isThisActive ? (
                        <div className="flex items-center gap-0.5">
                          <span className="w-1 bg-amber-400 h-3 animate-bounce" />
                          <span className="w-1 bg-amber-400 h-4 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1 bg-amber-400 h-2 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      ) : (
                        <Play size={18} className="text-white fill-current ml-0.5" />
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <h4 className="text-xs font-black truncate">
                        {radio.name}
                      </h4>
                    </div>
                    <p className={`text-[10px] font-bold truncate ${activeRadio?.id === radio.id ? 'text-slate-900 font-extrabold' : 'text-purple-200'}`}>
                      {radio.genre}
                    </p>
                    {radio.frequency && (
                      <span className={`text-[8px] font-black uppercase tracking-wider block truncate ${activeRadio?.id === radio.id ? 'text-slate-800' : 'text-amber-300'}`}>
                        {radio.frequency}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* BARRA DE CONTROLE DA RÁDIO QUANDO ATIVA */}
          {activeRadio && (
            <div className="p-4 bg-slate-900/95 rounded-2xl border border-amber-400/60 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl mt-2 animate-slide-up">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0">
                  <Radio size={20} className={isRadioPlaying ? 'animate-pulse' : ''} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`w-2 h-2 rounded-full ${isRadioPlaying ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                    <h4 className="text-xs sm:text-sm font-black text-white truncate">
                      {activeRadio.name}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase">
                      Português
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-300 font-bold mt-0.5">
                    {isRadioBuffering ? 'Conectando ao áudio da rádio...' : isRadioPlaying ? `Tocando ao Vivo • ${activeRadio.genre}` : 'Pausado'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center w-full sm:w-auto justify-end">
                {/* Volume */}
                <div className="flex items-center gap-1.5 text-slate-400 bg-slate-800 px-2.5 py-1.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    className="hover:text-white transition-all cursor-pointer"
                  >
                    {isMuted || radioVolume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : radioVolume}
                    onChange={(e) => {
                      setRadioVolume(parseFloat(e.target.value));
                      setIsMuted(false);
                    }}
                    className="w-16 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                </div>

                {/* Play/Pause */}
                <button
                  type="button"
                  onClick={() => handleToggleRadio(activeRadio)}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase rounded-xl transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  {isRadioBuffering ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Conectando</span>
                    </>
                  ) : isRadioPlaying ? (
                    <>
                      <Pause size={14} className="fill-current" />
                      <span>Pausar</span>
                    </>
                  ) : (
                    <>
                      <Play size={14} className="fill-current ml-0.5" />
                      <span>Tocar</span>
                    </>
                  )}
                </button>

                {/* Fechar */}
                <button
                  type="button"
                  onClick={handleStopRadio}
                  className="p-2 text-slate-400 hover:text-rose-400 rounded-xl transition-all cursor-pointer"
                  title="Desligar Rádio"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SEÇÃO DE PESQUISA DE HINOS E LOUVORES */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Search className="text-amber-500" size={20} />
            Pesquisa de Hinos, Harpa & Cantores
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
            Digite o número da Harpa (ex: 15, 545, 1) ou nome do cantor (ex: Cassiane, Fernandinho, Anderson Freire, Aline Barros).
          </p>
        </div>

        {/* CAMPO DE PESQUISA PRINCIPAL */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            performSearch(searchInput);
          }}
        >
          <div className="relative flex items-center bg-white dark:bg-zinc-900 rounded-2xl border-2 border-amber-400 focus-within:border-amber-500 focus-within:ring-4 focus-within:ring-amber-400/20 transition-all shadow-md overflow-hidden">
            <div className="pl-4 pr-2 text-amber-500">
              <Search size={22} className="stroke-[3]" />
            </div>

            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Digite o número (1 a 640) ou nome do louvor..."
              className="w-full py-4 bg-transparent text-sm sm:text-base font-black text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-medium outline-none pr-3"
              autoComplete="off"
            />

            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSearchResults([]);
                  setHasSearched(false);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all cursor-pointer mr-1"
              >
                <X size={18} />
              </button>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="m-1.5 px-5 sm:px-7 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Buscando...</span>
                </>
              ) : (
                <>
                  <Search size={16} className="stroke-[3]" />
                  <span>Pesquisar</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* ATALHOS RÁPIDOS DE PESQUISA */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
          <span className="text-[11px] text-slate-400 shrink-0 font-extrabold flex items-center gap-1">
            <Sparkles size={12} className="text-amber-500" /> Sugestões:
          </span>
          {[
            '15',
            '545',
            '1',
            '39',
            '186',
            '192',
            '291',
            '577',
            'Cassiane',
            'Anderson Freire',
            'Fernandinho',
            'Aline Barros',
            'Damares',
            'Gabriela Rocha'
          ].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                setSearchInput(tag);
                performSearch(tag);
              }}
              className={`px-3 py-1.5 rounded-xl border text-[11px] transition-all cursor-pointer whitespace-nowrap shadow-sm active:scale-95 ${
                searchInput === tag
                  ? 'bg-amber-400 text-slate-950 border-amber-400 font-black'
                  : 'bg-white dark:bg-zinc-800 hover:bg-amber-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border-slate-200 dark:border-zinc-700'
              }`}
            >
              {/^\d+$/.test(tag) ? `Harpa #${tag}` : tag}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA DE RESULTADOS DA PESQUISA COM COMPARTILHAR E BAIXAR */}
      {isLoading && (
        <div className="p-8 text-center space-y-2 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-100 dark:border-zinc-800">
          <Loader2 size={32} className="animate-spin text-amber-500 mx-auto" />
          <p className="text-xs font-black text-slate-600 dark:text-zinc-300">Buscando hinos e vídeos oficiais...</p>
        </div>
      )}

      {!isLoading && hasSearched && searchResults.length === 0 && (
        <div className="p-8 text-center space-y-3 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-100 dark:border-zinc-800">
          <AlertCircle size={32} className="text-amber-500 mx-auto" />
          <h4 className="text-sm font-black text-slate-800 dark:text-zinc-100">Nenhum resultado para "{searchInput}"</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Tente pesquisar pelo número do hino (ex: 15, 545, 186) ou o nome do cantor gospel.
          </p>
        </div>
      )}

      {/* CARDS DE RESULTADOS */}
      {searchResults.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
              {searchResults.length} Louvor(es) Encontrado(s)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {searchResults.map((hymn) => {
              const isCopied = copiedId === hymn.id;
              const hasLyrics = Boolean(hymn.lyrics || HARPA_LYRICS_MAP[Number(hymn.number)]);

              return (
                <div
                  key={hymn.id}
                  className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-amber-400 dark:hover:border-amber-500 shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* Informações do Hino */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div 
                      onClick={() => setSelectedHymn(hymn)}
                      className="relative w-16 h-16 rounded-2xl overflow-hidden bg-slate-900 shrink-0 cursor-pointer shadow-inner group"
                    >
                      <img 
                        src={hymn.coverUrl || 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=500&auto=format&fit=crop&q=60'} 
                        alt={hymn.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-all" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Play size={22} className="text-white fill-current ml-0.5" />
                      </div>
                      {hymn.number && (
                        <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-bl-md">
                          #{hymn.number}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        {hymn.number && (
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-black text-[10px] rounded-md shrink-0">
                            Harpa #{hymn.number}
                          </span>
                        )}
                        <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                          {hymn.title}
                        </h4>
                      </div>

                      <p className="text-xs font-bold text-purple-700 dark:text-purple-400 truncate flex items-center gap-1">
                        <Headphones size={12} /> {hymn.artist}
                      </p>
                    </div>
                  </div>

                  {/* AÇÕES: OUVIR / COMPARTILHAR / BAIXAR / LETRA */}
                  <div className="flex flex-wrap items-center gap-2 self-end sm:self-center shrink-0">
                    {/* Botão Ouvir */}
                    <button
                      type="button"
                      onClick={() => setSelectedHymn(hymn)}
                      className="px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                      title="Ouvir Hino com Voz e Música"
                    >
                      <Play size={14} className="fill-current ml-0.5" />
                      <span>Ouvir</span>
                    </button>

                    {/* Botão Letra */}
                    {hasLyrics && (
                      <button
                        type="button"
                        onClick={() => setShowLyricsModal(hymn)}
                        className="px-3.5 py-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Ver Letra Completa"
                      >
                        <BookOpen size={14} />
                        <span>Letra</span>
                      </button>
                    )}

                    {/* Botão Compartilhar */}
                    <button
                      type="button"
                      onClick={() => handleShareHymn(hymn)}
                      className="px-3.5 py-2.5 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-black text-xs rounded-xl transition-all flex items-center gap-1.5 border border-purple-200 dark:border-purple-800 cursor-pointer shadow-sm active:scale-95"
                      title="Compartilhar Hino"
                    >
                      {isCopied ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
                      <span>{isCopied ? 'Copiado!' : 'Compartilhar'}</span>
                    </button>

                    {/* Botão Baixar */}
                    <button
                      type="button"
                      onClick={() => handleDownloadHymn(hymn)}
                      className="px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-black text-xs rounded-xl transition-all flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800 cursor-pointer shadow-sm active:scale-95"
                      title="Baixar Hino / Letra"
                    >
                      <Download size={14} />
                      <span>Baixar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL DE REPRODUÇÃO DE VÍDEO / ÁUDIO DO HINO SELECIONADO */}
      {selectedHymn && (
        <div 
          className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={() => setSelectedHymn(null)}
        >
          <div 
            className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white w-full max-w-2xl rounded-3xl sm:rounded-[2.5rem] border-2 border-amber-400 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] transition-all transform scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Topo do Modal com cor elegante e dourada */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-slate-950 border-b-2 border-amber-400/80 flex items-center justify-between shadow-sm">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-slate-950 text-amber-300 text-[10px] sm:text-xs font-black rounded-lg uppercase tracking-wider shadow-sm">
                    ● Reproduzindo Louvor
                  </span>
                  {selectedHymn.number && (
                    <span className="px-2 py-0.5 bg-amber-600/30 text-slate-950 text-[10px] sm:text-xs font-black rounded-md">
                      Harpa #{selectedHymn.number}
                    </span>
                  )}
                </div>
                <h4 className="text-base sm:text-lg font-black text-slate-950 truncate mt-1">
                  {selectedHymn.title}
                </h4>
                <p className="text-xs font-bold text-slate-800 truncate">
                  {selectedHymn.artist}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedHymn(null)}
                className="p-2.5 bg-slate-950/10 hover:bg-slate-950/20 text-slate-950 rounded-2xl transition-all cursor-pointer shrink-0 active:scale-95"
                title="Fechar"
              >
                <X size={20} className="stroke-[2.5]" />
              </button>
            </div>

            {/* Vídeo / Áudio Real com Fundo Claro e Limpo */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto bg-slate-50 dark:bg-zinc-900/90">
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-xl border-2 border-amber-400">
                {selectedHymn.youtubeId ? (
                  <iframe
                    title={selectedHymn.title}
                    src={`https://www.youtube.com/embed/${selectedHymn.youtubeId}?autoplay=1&playsinline=1&enablejsapi=1&rel=0`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-2 bg-gradient-to-br from-amber-50 to-amber-100 text-slate-900">
                    <Headphones size={44} className="text-amber-500 animate-bounce" />
                    <p className="text-sm font-black">{selectedHymn.title}</p>
                    <p className="text-xs text-slate-600">{selectedHymn.artist}</p>
                  </div>
                )}
              </div>

              {/* Ações de Compartilhamento, Download e Letra no Modal */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-800 p-4 rounded-2xl border border-slate-200 dark:border-zinc-700 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleShareHymn(selectedHymn)}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                  >
                    <Share2 size={14} />
                    <span>Compartilhar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadHymn(selectedHymn)}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Baixar Hino</span>
                  </button>

                  {(selectedHymn.lyrics || HARPA_LYRICS_MAP[Number(selectedHymn.number)]) && (
                    <button
                      type="button"
                      onClick={() => setShowLyricsModal(selectedHymn)}
                      className="px-3.5 py-2.5 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <BookOpen size={14} />
                      <span>Ver Letra</span>
                    </button>
                  )}
                </div>

                {selectedHymn.youtubeId && (
                  <a
                    href={`https://www.youtube.com/watch?v=${selectedHymn.youtubeId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-zinc-300 hover:text-amber-600 dark:hover:text-amber-400 bg-slate-100 dark:bg-zinc-700 rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <span>Abrir no YouTube</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE LETRA COMPLETA */}
      {showLyricsModal && (
        <div 
          className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={() => setShowLyricsModal(null)}
        >
          <div 
            className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white w-full max-w-xl rounded-3xl sm:rounded-[2.5rem] border-2 border-amber-400 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Topo do Modal de Letra */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-slate-950 border-b-2 border-amber-400/80 flex items-center justify-between shadow-sm">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-slate-950 text-amber-300 text-[10px] sm:text-xs font-black rounded-lg uppercase tracking-wider">
                    Letra Completa
                  </span>
                  {showLyricsModal.number && (
                    <span className="px-2 py-0.5 bg-amber-600/30 text-slate-950 text-[10px] sm:text-xs font-black rounded-md">
                      Harpa #{showLyricsModal.number}
                    </span>
                  )}
                </div>
                <h4 className="text-base sm:text-lg font-black truncate text-slate-950 mt-1">{showLyricsModal.title}</h4>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const lyrics = showLyricsModal.lyrics || HARPA_LYRICS_MAP[Number(showLyricsModal.number)] || '';
                    navigator.clipboard.writeText(`${showLyricsModal.title}\n\n${lyrics}`);
                    setShareSuccessMessage('Letra copiada!');
                    setTimeout(() => setShareSuccessMessage(null), 2000);
                  }}
                  className="p-2.5 bg-slate-950/10 hover:bg-slate-950/20 text-slate-950 rounded-2xl transition-all cursor-pointer active:scale-95"
                  title="Copiar Letra"
                >
                  <Copy size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowLyricsModal(null)}
                  className="p-2.5 bg-slate-950/10 hover:bg-slate-950/20 text-slate-950 rounded-2xl transition-all cursor-pointer active:scale-95"
                  title="Fechar"
                >
                  <X size={18} className="stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Estrofes e Letra com Fundo Claro e Alta Legibilidade */}
            <div className="p-5 overflow-y-auto space-y-4 max-h-[60vh] bg-slate-50 dark:bg-zinc-900/90 text-slate-800 dark:text-zinc-200 select-text">
              {(showLyricsModal.lyrics || HARPA_LYRICS_MAP[Number(showLyricsModal.number)] || '')
                .split('\n\n')
                .map((stanza, idx) => {
                  const isChorus = stanza.includes('[CORO]') || stanza.startsWith('Coro:') || stanza.startsWith('CORO:');
                  const cleanStanza = stanza.replace(/\[CORO\]|Coro:|CORO:/g, '').trim();

                  return (
                    <div 
                      key={idx}
                      className={isChorus ? 'p-4 bg-amber-100 dark:bg-amber-950/50 border-l-4 border-amber-500 rounded-r-2xl text-slate-950 dark:text-amber-100 font-bold shadow-sm' : 'text-slate-700 dark:text-zinc-300 font-medium'}
                    >
                      {isChorus && <p className="text-[11px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1.5">● Coro</p>}
                      <p className="whitespace-pre-line text-sm sm:text-base leading-relaxed">{cleanStanza}</p>
                    </div>
                  );
                })}
            </div>

            {/* Rodapé de Ações do Modal de Letra */}
            <div className="p-4 bg-white dark:bg-zinc-800 border-t border-slate-200 dark:border-zinc-700 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleDownloadHymn(showLyricsModal)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
              >
                <Download size={14} />
                <span>Baixar Letra (.txt)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowLyricsModal(null)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-600 text-slate-700 dark:text-zinc-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
