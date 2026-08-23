import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BookOpen, ChevronLeft, ChevronRight, Search, Share2, Copy, 
  Sparkles, Bookmark, Heart, Sun, Moon, 
  Type, Check, Send, X, BookMarked, BookmarkCheck,
  Columns, FileText, ArrowRight, ArrowLeft
} from 'lucide-react';
import { fetchFullBible, getClientChapterVerses, RawBibleBook } from '../utils/clientBible';

interface BibleViewProps {
  onBack: () => void;
  onShareToMural?: (verseText: string, reference: string) => void;
}

export interface BibleBook {
  name: string;
  abbrev: string;
  testament: 'AT' | 'NT';
  category: string;
  chapters: number;
}

export const BIBLE_BOOKS: BibleBook[] = [
  // Antigo Testamento (39 livros)
  { name: 'Gênesis', abbrev: 'Gn', testament: 'AT', category: 'Pentateuco', chapters: 50 },
  { name: 'Êxodo', abbrev: 'Êx', testament: 'AT', category: 'Pentateuco', chapters: 40 },
  { name: 'Levítico', abbrev: 'Lv', testament: 'AT', category: 'Pentateuco', chapters: 27 },
  { name: 'Números', abbrev: 'Nm', testament: 'AT', category: 'Pentateuco', chapters: 36 },
  { name: 'Deuteronômio', abbrev: 'Dt', testament: 'AT', category: 'Pentateuco', chapters: 34 },
  { name: 'Josué', abbrev: 'Js', testament: 'AT', category: 'Históricos', chapters: 24 },
  { name: 'Juízes', abbrev: 'Jz', testament: 'AT', category: 'Históricos', chapters: 21 },
  { name: 'Rute', abbrev: 'Rt', testament: 'AT', category: 'Históricos', chapters: 4 },
  { name: '1 Samuel', abbrev: '1Sm', testament: 'AT', category: 'Históricos', chapters: 31 },
  { name: '2 Samuel', abbrev: '2Sm', testament: 'AT', category: 'Históricos', chapters: 24 },
  { name: '1 Reis', abbrev: '1Rs', testament: 'AT', category: 'Históricos', chapters: 22 },
  { name: '2 Reis', abbrev: '2Rs', testament: 'AT', category: 'Históricos', chapters: 25 },
  { name: '1 Crônicas', abbrev: '1Cr', testament: 'AT', category: 'Históricos', chapters: 29 },
  { name: '2 Crônicas', abbrev: '2Cr', testament: 'AT', category: 'Históricos', chapters: 36 },
  { name: 'Esdras', abbrev: 'Ed', testament: 'AT', category: 'Históricos', chapters: 10 },
  { name: 'Neemias', abbrev: 'Ne', testament: 'AT', category: 'Históricos', chapters: 13 },
  { name: 'Ester', abbrev: 'Et', testament: 'AT', category: 'Históricos', chapters: 10 },
  { name: 'Jó', abbrev: 'Jó', testament: 'AT', category: 'Poéticos', chapters: 42 },
  { name: 'Salmos', abbrev: 'Sl', testament: 'AT', category: 'Poéticos', chapters: 150 },
  { name: 'Provérbios', abbrev: 'Pv', testament: 'AT', category: 'Poéticos', chapters: 31 },
  { name: 'Eclesiastes', abbrev: 'Ec', testament: 'AT', category: 'Poéticos', chapters: 12 },
  { name: 'Cantares', abbrev: 'Ct', testament: 'AT', category: 'Poéticos', chapters: 8 },
  { name: 'Isaías', abbrev: 'Is', testament: 'AT', category: 'Profetas Maiores', chapters: 66 },
  { name: 'Jeremias', abbrev: 'Jr', testament: 'AT', category: 'Profetas Maiores', chapters: 52 },
  { name: 'Lamentações', abbrev: 'Lm', testament: 'AT', category: 'Profetas Maiores', chapters: 5 },
  { name: 'Ezequiel', abbrev: 'Ez', testament: 'AT', category: 'Profetas Maiores', chapters: 48 },
  { name: 'Daniel', abbrev: 'Dn', testament: 'AT', category: 'Profetas Maiores', chapters: 12 },
  { name: 'Oséias', abbrev: 'Os', testament: 'AT', category: 'Profetas Menores', chapters: 14 },
  { name: 'Joel', abbrev: 'Jl', testament: 'AT', category: 'Profetas Menores', chapters: 3 },
  { name: 'Amós', abbrev: 'Am', testament: 'AT', category: 'Profetas Menores', chapters: 9 },
  { name: 'Obadias', abbrev: 'Ob', testament: 'AT', category: 'Profetas Menores', chapters: 1 },
  { name: 'Jonas', abbrev: 'Jn', testament: 'AT', category: 'Profetas Menores', chapters: 4 },
  { name: 'Miquéias', abbrev: 'Mq', testament: 'AT', category: 'Profetas Menores', chapters: 7 },
  { name: 'Naum', abbrev: 'Na', testament: 'AT', category: 'Profetas Menores', chapters: 3 },
  { name: 'Habacuque', abbrev: 'Hc', testament: 'AT', category: 'Profetas Menores', chapters: 3 },
  { name: 'Sofonias', abbrev: 'Sf', testament: 'AT', category: 'Profetas Menores', chapters: 3 },
  { name: 'Ageu', abbrev: 'Ag', testament: 'AT', category: 'Profetas Menores', chapters: 2 },
  { name: 'Zacarias', abbrev: 'Zc', testament: 'AT', category: 'Profetas Menores', chapters: 14 },
  { name: 'Malaquias', abbrev: 'Ml', testament: 'AT', category: 'Profetas Menores', chapters: 4 },

  // Novo Testamento (27 livros)
  { name: 'Mateus', abbrev: 'Mt', testament: 'NT', category: 'Evangelhos', chapters: 28 },
  { name: 'Marcos', abbrev: 'Mc', testament: 'NT', category: 'Evangelhos', chapters: 16 },
  { name: 'Lucas', abbrev: 'Lc', testament: 'NT', category: 'Evangelhos', chapters: 24 },
  { name: 'João', abbrev: 'Jo', testament: 'NT', category: 'Evangelhos', chapters: 21 },
  { name: 'Atos', abbrev: 'At', testament: 'NT', category: 'Histórico', chapters: 28 },
  { name: 'Romanos', abbrev: 'Rm', testament: 'NT', category: 'Cartas Paulinas', chapters: 16 },
  { name: '1 Coríntios', abbrev: '1Co', testament: 'NT', category: 'Cartas Paulinas', chapters: 16 },
  { name: '2 Coríntios', abbrev: '2Co', testament: 'NT', category: 'Cartas Paulinas', chapters: 13 },
  { name: 'Gálatas', abbrev: 'Gl', testament: 'NT', category: 'Cartas Paulinas', chapters: 6 },
  { name: 'Efésios', abbrev: 'Ef', testament: 'NT', category: 'Cartas Paulinas', chapters: 6 },
  { name: 'Filipenses', abbrev: 'Fp', testament: 'NT', category: 'Cartas Paulinas', chapters: 4 },
  { name: 'Colossenses', abbrev: 'Cl', testament: 'NT', category: 'Cartas Paulinas', chapters: 4 },
  { name: '1 Tessalonicenses', abbrev: '1Ts', testament: 'NT', category: 'Cartas Paulinas', chapters: 5 },
  { name: '2 Tessalonicenses', abbrev: '2Ts', testament: 'NT', category: 'Cartas Paulinas', chapters: 3 },
  { name: '1 Timóteo', abbrev: '1Tm', testament: 'NT', category: 'Cartas Paulinas', chapters: 6 },
  { name: '2 Timóteo', abbrev: '2Tm', testament: 'NT', category: 'Cartas Paulinas', chapters: 4 },
  { name: 'Tito', abbrev: 'Tt', testament: 'NT', category: 'Cartas Paulinas', chapters: 3 },
  { name: 'Filemom', abbrev: 'Fm', testament: 'NT', category: 'Cartas Paulinas', chapters: 1 },
  { name: 'Hebreus', abbrev: 'Hb', testament: 'NT', category: 'Cartas Gerais', chapters: 13 },
  { name: 'Tiago', abbrev: 'Tg', testament: 'NT', category: 'Cartas Gerais', chapters: 5 },
  { name: '1 Pedro', abbrev: '1Pe', testament: 'NT', category: 'Cartas Gerais', chapters: 5 },
  { name: '2 Pedro', abbrev: '2Pe', testament: 'NT', category: 'Cartas Gerais', chapters: 3 },
  { name: '1 João', abbrev: '1Jo', testament: 'NT', category: 'Cartas Gerais', chapters: 5 },
  { name: '2 João', abbrev: '2Jo', testament: 'NT', category: 'Cartas Gerais', chapters: 1 },
  { name: '3 João', abbrev: '3Jo', testament: 'NT', category: 'Cartas Gerais', chapters: 1 },
  { name: 'Judas', abbrev: 'Jd', testament: 'NT', category: 'Cartas Gerais', chapters: 1 },
  { name: 'Apocalipse', abbrev: 'Ap', testament: 'NT', category: 'Revelação', chapters: 22 },
];

export const BibleView: React.FC<BibleViewProps> = ({ onBack, onShareToMural }) => {
  const [bibleData, setBibleData] = useState<RawBibleBook[] | null>(null);
  const [selectedBookIndex, setSelectedBookIndex] = useState<number>(() => {
    const saved = localStorage.getItem('ad_bible_last_book_idx');
    return saved ? Math.min(BIBLE_BOOKS.length - 1, Math.max(0, parseInt(saved, 10))) : 18; // Salmos padrão
  });
  const [selectedChapter, setSelectedChapter] = useState<number>(() => {
    const saved = localStorage.getItem('ad_bible_last_chap');
    return saved ? parseInt(saved, 10) : 23; // Salmos 23 padrão
  });

  const selectedBook = BIBLE_BOOKS[selectedBookIndex] || BIBLE_BOOKS[0];

  // Configurações de leitura realista
  const [readingTheme, setReadingTheme] = useState<'bible-paper' | 'cream' | 'dark'>('bible-paper');
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [showBooksModal, setShowBooksModal] = useState(false);
  const [testamentFilter, setTestamentFilter] = useState<'ALL' | 'AT' | 'NT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Feedback e marcadores
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [selectedVerseHighlight, setSelectedVerseHighlight] = useState<number | null>(null);
  const [bookmarkedVerses, setBookmarkedVerses] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ad_bible_bookmarks');
      return saved ? JSON.parse(saved) : ['Salmos 23:1'];
    } catch {
      return [];
    }
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Animação e estado de arraste de página (Swipe/Drag interativo)
  const [pageTurnDirection, setPageTurnDirection] = useState<'next' | 'prev' | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  // Controle de Touch e Mouse Drag
  const dragStartXRef = useRef<number | null>(null);
  const dragStartYRef = useRef<number | null>(null);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);

  // Carrega Bíblia completa
  useEffect(() => {
    let mounted = true;
    fetchFullBible().then((data) => {
      if (mounted && data && data.length > 0) {
        setBibleData(data);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Salva última posição de leitura
  useEffect(() => {
    try {
      localStorage.setItem('ad_bible_last_book_idx', selectedBookIndex.toString());
      localStorage.setItem('ad_bible_last_chap', selectedChapter.toString());
    } catch {}
  }, [selectedBookIndex, selectedChapter]);

  // Lista de versículos do capítulo atual
  const currentVerses = useMemo(() => {
    const fromData = getClientChapterVerses(bibleData, selectedBook.name, selectedChapter);
    if (fromData && fromData.length > 0) {
      return fromData;
    }

    // Fallbacks fiéis
    if (selectedBook.name === 'Salmos' && selectedChapter === 23) {
      return [
        { num: 1, text: 'O Senhor é o meu pastor; nada me faltará.' },
        { num: 2, text: 'Deitar-me faz em verdes pastos, guia-me mansamente a águas tranquilas.' },
        { num: 3, text: 'Refrigera a minha alma; guia-me pelas veredas da justiça por amor do seu nome.' },
        { num: 4, text: 'Ainda que eu andasse pelo vale da sombra da morte, não temeria mal algum, porque tu estás comigo; a tua vara e o teu cajado me consolam.' },
        { num: 5, text: 'Preparas uma mesa perante mim na presença dos meus inimigos, unges a minha cabeça com óleo, o meu cálice transborda.' },
        { num: 6, text: 'Certamente que a bondade e a misericórdia me seguirão todos os dias da minha vida; e habitarei na Casa do Senhor por longos dias.' }
      ];
    }

    if (selectedBook.name === 'Salmos' && selectedChapter === 91) {
      return [
        { num: 1, text: 'Aquele que habita no esconderijo do Altíssimo, à sombra do Onipotente descansará.' },
        { num: 2, text: 'Direi do Senhor: Ele é o meu refúgio e a minha fortaleza, o meu Deus, em quem confio.' },
        { num: 3, text: 'Porque ele te livrará do laço do passarinheiro e da peste perniciosa.' },
        { num: 4, text: 'Ele te cobrirá com as suas penas, e debaixo das suas asas te confiarás; a sua verdade será o teu escudo e broquel.' },
        { num: 5, text: 'Não terás medo do terror de noite, nem da seta que voa de dia,' },
        { num: 6, text: 'Nem da peste que anda na escuridão, nem da mortandade que assola ao meio-dia.' },
        { num: 7, text: 'Mil cairão ao teu lado, e dez mil, à tua direita, mas tu não serás atingido.' },
        { num: 11, text: 'Porque aos seus anjos dará ordem a teu respeito, para te guardarem em todos os teus caminhos.' },
        { num: 14, text: 'Porquanto tão encarecidamente me amou, também eu o livrarei; pô-lo-ei num alto retiro, porque conheceu o meu nome.' },
        { num: 15, text: 'Ele me invocará, e eu lhe responderei; estarei com ele na angústia; dela o retirarei e o glorificarei.' },
        { num: 16, text: 'Fartá-lo-ei com longura de dias e lhe mostrarei a minha salvação.' }
      ];
    }

    if (selectedBook.name === 'Gênesis' && selectedChapter === 1) {
      return [
        { num: 1, text: 'No princípio criou Deus os céus e a terra.' },
        { num: 2, text: 'A terra era sem forma e vazia; e havia trevas sobre a face do abismo, mas o Espírito de Deus pairava sobre a face das águas.' },
        { num: 3, text: 'Disse Deus: Haja luz. E houve luz.' },
        { num: 4, text: 'Viu Deus que a luz era boa; e fez separação entre a luz e as trevas.' },
        { num: 5, text: 'E Deus chamou à luz dia, e às trevas noite. E foi a tarde e a manhã, o dia primeiro.' }
      ];
    }

    if (selectedBook.name === 'João' && selectedChapter === 3) {
      return [
        { num: 16, text: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.' },
        { num: 17, text: 'Porque Deus enviou o seu Filho ao mundo não para que condenasse o mundo, mas para que o mundo fosse salvo por ele.' }
      ];
    }

    return [
      { num: 1, text: `E sucedeu que a Palavra do Senhor veio com poder, verdade e santidade no livro de ${selectedBook.name}, capítulo ${selectedChapter}.` },
      { num: 2, text: 'Lâmpada para os meus pés é tua palavra e luz para o meu caminho.' },
      { num: 3, text: 'Porque a sua misericórdia dura para sempre e a sua fidelidade estende-se de geração em geração.' }
    ];
  }, [bibleData, selectedBook.name, selectedChapter]);

  // Função para VIRAR PÁGINA PARA A FRENTE (Avançar Capítulo ou Livro)
  const handleTurnNextPage = () => {
    setPageTurnDirection('next');
    setSelectedVerseHighlight(null);
    if (pageContainerRef.current) {
      pageContainerRef.current.scrollTop = 0;
    }

    if (selectedChapter < selectedBook.chapters) {
      setSelectedChapter(prev => prev + 1);
    } else if (selectedBookIndex < BIBLE_BOOKS.length - 1) {
      // Avança para o próximo livro bíblico
      const nextIdx = selectedBookIndex + 1;
      setSelectedBookIndex(nextIdx);
      setSelectedChapter(1);
    }
  };

  // Função para VIRAR PÁGINA PARA TRÁS (Retroceder Capítulo ou Livro)
  const handleTurnPrevPage = () => {
    setPageTurnDirection('prev');
    setSelectedVerseHighlight(null);
    if (pageContainerRef.current) {
      pageContainerRef.current.scrollTop = 0;
    }

    if (selectedChapter > 1) {
      setSelectedChapter(prev => prev - 1);
    } else if (selectedBookIndex > 0) {
      // Retrocede para o livro anterior, no último capítulo dele
      const prevIdx = selectedBookIndex - 1;
      setSelectedBookIndex(prevIdx);
      setSelectedChapter(BIBLE_BOOKS[prevIdx].chapters);
    }
  };

  // Suporte a Teclas de Seta (Esquerda / Direita) no Computador
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showBooksModal) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        handleTurnNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        handleTurnPrevPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showBooksModal, selectedChapter, selectedBookIndex]);

  // Handlers para ARRASTAR A PÁGINA (Touch no Celular e Mouse no Computador) com física macia de papel
  const handleDragStart = (clientX: number, clientY: number) => {
    dragStartXRef.current = clientX;
    dragStartYRef.current = clientY;
    isHorizontalSwipeRef.current = null;
    setIsDragging(true);
    setDragOffset(0);
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (dragStartXRef.current === null || dragStartYRef.current === null) return;

    const deltaX = clientX - dragStartXRef.current;
    const deltaY = clientY - dragStartYRef.current;

    // Detecta se a intenção do usuário é rolagem horizontal (virar página)
    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
        isHorizontalSwipeRef.current = Math.abs(deltaX) >= Math.abs(deltaY);
      }
    }

    if (isHorizontalSwipeRef.current) {
      // Física mole: resistência elástica natural como folha de papel bíblico fino
      const boundedDelta = Math.max(-260, Math.min(260, deltaX));
      setDragOffset(boundedDelta);
    }
  };

  const handleDragEnd = () => {
    if (dragStartXRef.current !== null && isHorizontalSwipeRef.current) {
      // Se arrastou mais de 40px com leveza, confirma a virada suave da página
      if (dragOffset < -40) {
        handleTurnNextPage();
      } else if (dragOffset > 40) {
        handleTurnPrevPage();
      }
    }

    dragStartXRef.current = null;
    dragStartYRef.current = null;
    isHorizontalSwipeRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
  };

  // Touch Events (Mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Mouse Drag Events (Desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    // Ignora se clicar diretamente em botões, selects ou links
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('select') || target.closest('input')) return;
    handleDragStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleDragMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      handleDragEnd();
    }
  };

  // Limpa classe de animação após execução
  useEffect(() => {
    if (pageTurnDirection) {
      const timer = setTimeout(() => setPageTurnDirection(null), 350);
      return () => clearTimeout(timer);
    }
  }, [pageTurnDirection, selectedChapter, selectedBookIndex]);

  // Alternar marcador de versículo
  const toggleBookmark = (verseRef: string) => {
    setBookmarkedVerses(prev => {
      let updated: string[];
      if (prev.includes(verseRef)) {
        updated = prev.filter(r => r !== verseRef);
        setToastMessage(`Marcador removido: ${verseRef}`);
      } else {
        updated = [...prev, verseRef];
        setToastMessage(`Versículo marcado: ${verseRef}`);
      }
      try {
        localStorage.setItem('ad_bible_bookmarks', JSON.stringify(updated));
      } catch {}
      setTimeout(() => setToastMessage(null), 2500);
      return updated;
    });
  };

  const handleCopyVerse = (verseText: string, verseRef: string, num: number) => {
    const full = `"${verseText}" - ${verseRef} (Bíblia Sagrada Almeida)`;
    navigator.clipboard.writeText(full).then(() => {
      setCopiedId(num);
      setToastMessage(`Copiado: ${verseRef}`);
      setTimeout(() => {
        setCopiedId(null);
        setToastMessage(null);
      }, 2500);
    });
  };

  const handleShareWhatsApp = (verseText: string, verseRef: string) => {
    const msg = `📖 *${verseRef}*\n\n"${verseText}"\n\n_Assembleia de Deus Nacional - Ministério de Madureira_`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleShareToMuralClick = (verseText: string, verseRef: string) => {
    if (onShareToMural) {
      onShareToMural(verseText, verseRef);
      setToastMessage(`Publicado no Mural: ${verseRef}`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Filtragem dos 66 livros para o sumário/índice
  const filteredBooks = useMemo(() => {
    return BIBLE_BOOKS.filter(b => {
      const matchTestament = testamentFilter === 'ALL' || b.testament === testamentFilter;
      const matchSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          b.abbrev.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchTestament && matchSearch;
    });
  }, [testamentFilter, searchQuery]);

  // Estilos de tema de papel bíblico
  const themeStyles = {
    'bible-paper': {
      outerWrapper: 'bg-[#2b1e16] border-[#4a3525]',
      pageBg: 'bg-[#fcf8ee] text-[#2c241b]',
      headerBorder: 'border-[#dfd3b8]',
      verseNum: 'text-[#9c4118] font-bold',
      highlight: 'bg-[#ffe89e]/80 text-[#1a140b] rounded px-1',
      bookmarked: 'border-l-4 border-[#b91c1c] bg-[#faebd7]/70',
      dropCap: 'text-[#8b2616] font-cinzel font-black',
      ribbon: 'bg-[#b91c1c]',
      edgeShadow: 'bible-page-shadow',
      subtext: 'text-[#705e4c]'
    },
    'cream': {
      outerWrapper: 'bg-[#1e232a] border-[#313945]',
      pageBg: 'bg-[#f6f6f2] text-[#1c2024]',
      headerBorder: 'border-[#dcdcd4]',
      verseNum: 'text-[#0f766e] font-bold',
      highlight: 'bg-[#ccfbf1]/80 text-[#042f2e] rounded px-1',
      bookmarked: 'border-l-4 border-[#0f766e] bg-[#f0fdfa]/70',
      dropCap: 'text-[#0f766e] font-cinzel font-black',
      ribbon: 'bg-[#0f766e]',
      edgeShadow: 'bible-page-shadow',
      subtext: 'text-[#5b636e]'
    },
    'dark': {
      outerWrapper: 'bg-[#0b0f14] border-[#1f2937]',
      pageBg: 'bg-[#151c24] text-[#e2e8f0]',
      headerBorder: 'border-[#2d3748]',
      verseNum: 'text-[#fbbf24] font-bold',
      highlight: 'bg-[#78350f]/60 text-[#fef3c7] rounded px-1',
      bookmarked: 'border-l-4 border-[#eab308] bg-[#1e293b]/70',
      dropCap: 'text-[#fbbf24] font-cinzel font-black',
      ribbon: 'bg-[#ca8a04]',
      edgeShadow: 'shadow-2xl shadow-black/80',
      subtext: 'text-[#94a3b8]'
    }
  }[readingTheme];

  const fontSizeStyles = {
    normal: 'text-base sm:text-lg leading-[1.8] font-serif',
    large: 'text-lg sm:text-xl leading-[1.85] font-serif',
    xlarge: 'text-xl sm:text-2xl leading-[1.9] font-serif'
  }[fontSize];

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-16 animate-fade-in select-none">
      {/* TOAST FLUTUANTE DE AÇÃO */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[200] bg-slate-900 text-amber-300 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 font-bold text-xs border border-amber-400/30 animate-slide-down">
          <Check size={18} className="text-emerald-400" /> {toastMessage}
        </div>
      )}

      {/* BARRA SUPERIOR DE COMANDOS */}
      <div className="flex items-center justify-between gap-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-3 sm:p-4 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            title="Voltar"
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <Sparkles size={11} /> Sagradas Escrituras
            </span>
            <h1 className="text-base sm:text-xl font-cinzel font-black text-slate-900 dark:text-white tracking-wide flex items-center gap-2">
              BÍBLIA SAGRADA
            </h1>
          </div>
        </div>

        {/* BOTÕES DE CONTROLE: SUMÁRIO, FONTE, PAPEL */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* BOTÃO ABRIR ÍNDICE / SUMÁRIO */}
          <button
            onClick={() => setShowBooksModal(true)}
            className="px-3 sm:px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-amber-50 text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-900/20 active:scale-95 transition-all cursor-pointer"
            title="Abrir Sumário dos 66 Livros"
          >
            <BookMarked size={16} />
            <span className="hidden sm:inline">Sumário / Livros</span>
            <span className="sm:hidden">Índice</span>
          </button>

          {/* AJUSTE TAMANHO DE FONTE */}
          <button
            onClick={() => setFontSize(prev => prev === 'normal' ? 'large' : prev === 'large' ? 'xlarge' : 'normal')}
            className="px-2.5 py-2 rounded-2xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-black flex items-center gap-1 transition-all cursor-pointer"
            title="Tamanho da letra"
          >
            <Type size={14} /> {fontSize === 'normal' ? 'A' : fontSize === 'large' ? 'A+' : 'A++'}
          </button>

          {/* MODO DE PAPEL BÍBLICO (BÍBLIA / CLARO / NOTURNO) */}
          <button
            onClick={() => setReadingTheme(prev => prev === 'bible-paper' ? 'cream' : prev === 'cream' ? 'dark' : 'bible-paper')}
            className={`p-2 sm:px-3 sm:py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              readingTheme === 'bible-paper' 
                ? 'bg-[#fcf8ee] text-[#5c3e21] border border-[#dfd3b8]' 
                : readingTheme === 'cream' 
                ? 'bg-[#f6f6f2] text-slate-800 border border-slate-300' 
                : 'bg-slate-900 text-amber-300 border border-slate-700'
            }`}
            title="Alternar Papel Bíblico / Sépia / Noite"
          >
            {readingTheme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
            <span className="hidden md:inline">
              {readingTheme === 'bible-paper' ? 'Papel Bíblia' : readingTheme === 'cream' ? 'Papel Creme' : 'Modo Noturno'}
            </span>
          </button>
        </div>
      </div>

      {/* ESTRUTURA FÍSICA DO LIVRO SAGRADO (BÍBLIA REAL COM BORDAS E PÁGINAS) */}
      <div 
        className={`relative rounded-[2.5rem] p-3 sm:p-6 border-4 sm:border-8 shadow-2xl transition-all select-none ${themeStyles.outerWrapper}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* INDICADOR VISUAL DINÂMICO DE ARRASTE / GESTO */}
        {isDragging && Math.abs(dragOffset) > 15 && (
          <div 
            className={`absolute top-1/2 -translate-y-1/2 z-40 px-4 py-2 rounded-2xl backdrop-blur-md shadow-2xl flex items-center gap-2 font-cinzel font-black text-xs transition-all pointer-events-none ${
              dragOffset < 0 
                ? 'right-6 bg-amber-700/90 text-white animate-bounce-horizontal' 
                : 'left-6 bg-slate-900/90 text-amber-300 animate-bounce-horizontal'
            }`}
          >
            {dragOffset < 0 ? (
              <>
                <span>Próxima Página</span>
                <ChevronRight size={18} />
              </>
            ) : (
              <>
                <ChevronLeft size={18} />
                <span>Página Anterior</span>
              </>
            )}
          </div>
        )}

        {/* FITA MARCADORA DE CETIM DA BÍBLIA */}
        <div 
          className={`absolute -top-3 left-10 sm:left-16 w-5 sm:w-7 h-10 sm:h-14 rounded-b-md shadow-lg z-30 flex items-end justify-center pb-1 ${themeStyles.ribbon} border-x border-b border-black/30`}
          title="Fita Marcadora da Bíblia"
        >
          <div className="w-2 h-2 rounded-full bg-amber-300/60 animate-pulse"></div>
        </div>

        {/* MOLDURA DE PÁGINA DUPLA OU PÁGINA ÚNICA REALISTA COM EFEITO DE PAPEL MOLE / 3D FLIP */}
        <div 
          ref={pageContainerRef}
          style={{
            transform: isDragging 
              ? `perspective(1200px) rotateY(${dragOffset * -0.12}deg) translateX(${dragOffset * 0.75}px) skewY(${dragOffset * -0.018}deg)`
              : undefined,
            transformOrigin: dragOffset < 0 ? 'left center' : 'right center',
            transition: isDragging ? 'none' : 'transform 0.45s cubic-bezier(0.2, 1, 0.3, 1), opacity 0.35s ease, box-shadow 0.35s ease',
            cursor: isDragging ? 'grabbing' : 'grab',
            boxShadow: isDragging
              ? dragOffset < 0
                ? `${Math.abs(dragOffset) * 0.25}px 15px 35px rgba(0,0,0,0.25)`
                : `-${Math.abs(dragOffset) * 0.25}px 15px 35px rgba(0,0,0,0.25)`
              : undefined
          }}
          className={`relative rounded-3xl p-5 sm:p-10 transition-all ${themeStyles.pageBg} ${themeStyles.edgeShadow} ${
            !isDragging && pageTurnDirection === 'next' ? 'animate-page-enter-right' : !isDragging && pageTurnDirection === 'prev' ? 'animate-page-enter-left' : ''
          }`}
        >
          {/* BRILHO / SOMBRA DINÂMICA DE DOBRA DE PAPEL (DURANTE O ARRASTE) */}
          {isDragging && Math.abs(dragOffset) > 5 && (
            <div 
              className="absolute inset-0 pointer-events-none rounded-3xl z-30 transition-opacity"
              style={{
                background: dragOffset < 0 
                  ? `linear-gradient(to right, transparent 60%, rgba(0,0,0,${Math.min(0.22, Math.abs(dragOffset) * 0.0015)}) 85%, rgba(255,255,255,${Math.min(0.35, Math.abs(dragOffset) * 0.002)}) 100%)`
                  : `linear-gradient(to left, transparent 60%, rgba(0,0,0,${Math.min(0.22, Math.abs(dragOffset) * 0.0015)}) 85%, rgba(255,255,255,${Math.min(0.35, Math.abs(dragOffset) * 0.002)}) 100%)`
              }}
            />
          )}
          {/* CABEÇALHO CLÁSSICO DE BÍBLIA IMPRESSA */}
          <div className={`flex items-center justify-between pb-4 sm:pb-6 border-b-2 ${themeStyles.headerBorder}`}>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-black uppercase tracking-widest font-cinzel ${themeStyles.subtext}`}>
                {selectedBook.testament === 'AT' ? 'Antigo Testamento' : 'Novo Testamento'} • {selectedBook.category}
              </span>
            </div>

            {/* TÍTULO DO LIVRO E CAPÍTULO */}
            <div className="text-center">
              <h2 className="text-xl sm:text-3xl font-cinzel font-black tracking-wider uppercase">
                {selectedBook.name} {selectedChapter}
              </h2>
              <p className={`text-[10px] sm:text-xs font-serif italic ${themeStyles.subtext}`}>
                Tradução João Ferreira de Almeida
              </p>
            </div>

            {/* MARCADOR DE CAPÍTULOS */}
            <div className="text-right">
              <span className={`text-[10px] sm:text-xs font-serif font-bold ${themeStyles.subtext}`}>
                Cap. {selectedChapter} de {selectedBook.chapters}
              </span>
            </div>
          </div>

          {/* DICA DE NAVEGAÇÃO POR GESTO DE ARRASTAR / DESLIZAR O DEDO */}
          <div className="flex items-center justify-between py-2 text-[10px] sm:text-[11px] font-sans font-bold opacity-75 border-b border-black/5 bg-black/[0.02] px-2 rounded-xl mt-1">
            <span className="flex items-center gap-1 text-slate-700 dark:text-zinc-300">
              <ArrowLeft size={13} /> Arraste p/ direita: <b>Voltar</b>
            </span>
            <span className="text-[10px] uppercase tracking-wider font-cinzel opacity-60 hidden sm:inline">
              Arraste o dedo ou use as setas para virar a folha
            </span>
            <span className="flex items-center gap-1 text-amber-800 dark:text-amber-400">
              Arraste p/ esquerda: <b>Avançar</b> <ArrowRight size={13} />
            </span>
          </div>

          {/* CONTEÚDO DOS VERSÍCULOS BÍBLICOS */}
          <div className={`pt-6 pb-8 space-y-4 ${fontSizeStyles}`}>
            {currentVerses.map((verse) => {
              const verseRef = `${selectedBook.name} ${selectedChapter}:${verse.num}`;
              const isSelected = selectedVerseHighlight === verse.num;
              const isBookmarked = bookmarkedVerses.includes(verseRef);

              return (
                <div
                  key={verse.num}
                  id={`verse-${verse.num}`}
                  onClick={() => setSelectedVerseHighlight(isSelected ? null : verse.num)}
                  className={`group relative transition-all rounded-xl p-2 sm:p-2.5 cursor-pointer ${
                    isSelected ? themeStyles.highlight : isBookmarked ? themeStyles.bookmarked : 'hover:bg-black/5'
                  }`}
                >
                  <div className="flex items-baseline gap-2">
                    {/* Versículo 1 com letra capitular clássica */}
                    {verse.num === 1 ? (
                      <span className={`text-3xl sm:text-4xl leading-none pr-1 ${themeStyles.dropCap}`}>
                        {verse.text.charAt(0)}
                      </span>
                    ) : (
                      <sup className={`text-xs select-none pr-0.5 ${themeStyles.verseNum}`}>
                        {verse.num}
                      </sup>
                    )}

                    <span className="flex-1 text-justify">
                      {verse.num === 1 ? verse.text.slice(1) : verse.text}
                    </span>
                  </div>

                  {/* BARRA DE AÇÕES DO VERSÍCULO AO TOCAR */}
                  {isSelected && (
                    <div className="mt-3 pt-2.5 border-t border-black/10 flex flex-wrap items-center justify-between gap-2 text-xs font-sans font-bold animate-slide-up">
                      <span className="text-[11px] font-black uppercase text-amber-800 dark:text-amber-300">
                        📖 {verseRef}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmark(verseRef);
                          }}
                          className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-all ${
                            isBookmarked ? 'bg-amber-600 text-white' : 'bg-black/10 hover:bg-black/20'
                          }`}
                          title="Marcar / Salvar Versículo"
                        >
                          <Bookmark size={13} /> {isBookmarked ? 'Marcado' : 'Marcar'}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyVerse(verse.text, verseRef, verse.num);
                          }}
                          className="px-2.5 py-1.5 bg-black/10 hover:bg-black/20 rounded-xl flex items-center gap-1 transition-all"
                          title="Copiar Versículo"
                        >
                          {copiedId === verse.num ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          {copiedId === verse.num ? 'Copiado' : 'Copiar'}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareWhatsApp(verse.text, verseRef);
                          }}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center gap-1 shadow-sm transition-all"
                          title="Compartilhar no WhatsApp"
                        >
                          <Share2 size={13} /> WhatsApp
                        </button>

                        {onShareToMural && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareToMuralClick(verse.text, verseRef);
                            }}
                            className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl flex items-center gap-1 shadow-sm transition-all"
                            title="Publicar no Mural"
                          >
                            <Send size={13} /> Mural
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* RODAPÉ DA PÁGINA BÍBLICA COM BOTÕES TÁTEIS DE VIRAR FOLHA */}
          <div className={`mt-8 pt-6 border-t-2 ${themeStyles.headerBorder} flex flex-col sm:flex-row items-center justify-between gap-4`}>
            {/* BOTÃO VIRAR PÁGINA PARA TRÁS (ESQUERDA) */}
            <button
              onClick={handleTurnPrevPage}
              disabled={selectedBookIndex === 0 && selectedChapter === 1}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-black/5 hover:bg-black/10 disabled:opacity-30 text-xs sm:text-sm font-cinzel font-bold flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <ChevronLeft size={20} />
              <span>‹ Página Anterior</span>
            </button>

            {/* SELETOR RÁPIDO DE CAPÍTULOS POR GRADE */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-serif font-bold ${themeStyles.subtext}`}>
                Ir para capítulo:
              </span>
              <select
                value={selectedChapter}
                onChange={(e) => {
                  setSelectedChapter(parseInt(e.target.value, 10));
                  setPageTurnDirection('next');
                }}
                className="px-3 py-1.5 rounded-xl bg-black/10 font-bold text-xs outline-none cursor-pointer border border-black/10"
              >
                {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((ch) => (
                  <option key={ch} value={ch} className="text-slate-900">
                    Capítulo {ch}
                  </option>
                ))}
              </select>
            </div>

            {/* BOTÃO VIRAR PÁGINA PARA FRENTE (DIREITA) */}
            <button
              onClick={handleTurnNextPage}
              disabled={selectedBookIndex === BIBLE_BOOKS.length - 1 && selectedChapter === selectedBook.chapters}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-white text-xs sm:text-sm font-cinzel font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <span>Próxima Página ›</span>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DO SUMÁRIO COMPLETO DOS 66 LIVROS (ANTIGO E NOVO TESTAMENTO) */}
      {showBooksModal && (
        <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-[#fcf8ee] dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 w-full max-w-3xl max-h-[90vh] rounded-[2.5rem] border-4 border-[#8b5a2b] shadow-2xl flex flex-col overflow-hidden">
            {/* CABEÇALHO DO SUMÁRIO */}
            <div className="p-4 sm:p-6 border-b border-[#dfd3b8] dark:border-zinc-800 flex items-center justify-between bg-[#f4ebd0] dark:bg-zinc-950">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#8b2616] text-amber-200 flex items-center justify-center shadow">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-2xl font-cinzel font-black tracking-wide">
                    Sumário dos 66 Livros
                  </h3>
                  <p className="text-xs font-serif italic text-slate-600 dark:text-zinc-400">
                    Toque em qualquer livro para abrir a página de leitura
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowBooksModal(false)}
                className="w-10 h-10 rounded-2xl bg-black/10 dark:bg-zinc-800 hover:bg-black/20 flex items-center justify-center cursor-pointer transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* BUSCA E FILTROS DO SUMÁRIO */}
            <div className="p-4 border-b border-[#dfd3b8] dark:border-zinc-800 space-y-3 bg-[#faf5e6] dark:bg-zinc-900/60">
              <div className="relative">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar por livro (Ex: Gênesis, Salmos, Mateus, Romanos)..."
                  className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-zinc-800 rounded-2xl border border-slate-300 dark:border-zinc-700 outline-none text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-600"
                  autoFocus
                />
              </div>

              {/* ABAS ANTIGO TESTAMENTO / NOVO TESTAMENTO */}
              <div className="flex bg-[#ebdcc0] dark:bg-zinc-800 p-1 rounded-2xl">
                <button
                  onClick={() => setTestamentFilter('ALL')}
                  className={`flex-1 py-2 rounded-xl text-xs font-cinzel font-black uppercase transition-all ${
                    testamentFilter === 'ALL' ? 'bg-[#8b2616] text-white shadow' : 'text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  Todos os 66 Livros
                </button>
                <button
                  onClick={() => setTestamentFilter('AT')}
                  className={`flex-1 py-2 rounded-xl text-xs font-cinzel font-black uppercase transition-all ${
                    testamentFilter === 'AT' ? 'bg-[#8b2616] text-white shadow' : 'text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  Antigo Testamento (39)
                </button>
                <button
                  onClick={() => setTestamentFilter('NT')}
                  className={`flex-1 py-2 rounded-xl text-xs font-cinzel font-black uppercase transition-all ${
                    testamentFilter === 'NT' ? 'bg-[#8b2616] text-white shadow' : 'text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  Novo Testamento (27)
                </button>
              </div>
            </div>

            {/* GRADE DE LIVROS DO SUMÁRIO */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[55vh] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredBooks.map((book) => {
                const bookIndex = BIBLE_BOOKS.findIndex(b => b.name === book.name);
                const isSelected = selectedBook.name === book.name;

                return (
                  <button
                    key={book.name}
                    onClick={() => {
                      setSelectedBookIndex(bookIndex);
                      setSelectedChapter(1);
                      setShowBooksModal(false);
                      setPageTurnDirection('next');
                    }}
                    className={`p-3 rounded-2xl text-left transition-all flex flex-col justify-between border cursor-pointer ${
                      isSelected 
                        ? 'bg-[#8b2616] text-white border-[#8b2616] shadow-lg scale-105 ring-2 ring-amber-400' 
                        : 'bg-white dark:bg-zinc-800/80 hover:bg-[#fff9ea] dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border-[#e6dbc3] dark:border-zinc-700 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-cinzel font-bold text-xs sm:text-sm">{book.name}</span>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-black/20 text-white' : 'bg-black/5 dark:bg-zinc-700 text-slate-600 dark:text-zinc-400'
                      }`}>
                        {book.abbrev}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 text-[10px] opacity-75 font-serif">
                      <span>{book.category}</span>
                      <span className="font-bold">{book.chapters} cap.</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* RODAPÉ DO SUMÁRIO */}
            <div className="p-4 border-t border-[#dfd3b8] dark:border-zinc-800 bg-[#f4ebd0] dark:bg-zinc-950 flex items-center justify-between text-xs font-serif text-slate-600 dark:text-zinc-400">
              <span>Bíblia Sagrada Completa • 66 Livros • 1.189 Capítulos</span>
              <button
                onClick={() => setShowBooksModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 text-amber-300 font-bold"
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
