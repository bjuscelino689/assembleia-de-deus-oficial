import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BibleVerse, ChatMessage, ChurchDepartmentId, CHURCH_DEPARTMENTS } from '../types';
import { 
  Plus, User, ChevronLeft, BookOpen, X, Quote, Info, 
  Mic, Send, MessageSquare, BookMarked, Play, 
  Pause, Trash2, Volume2, Check, CheckCheck, 
  Sparkles, Layers, RefreshCw, AlertCircle, ChevronDown
} from 'lucide-react';
import SwipeableItem from '../SwipeableItem';
import { saveAudioBlobLocally, getAllAudiosLocally, deleteAudioBlobLocally } from '../utils/audioStorage';
import { syncDocToFirestore, deleteDocFromFirestore, fetchCollectionFromFirestore } from '../utils/clientFirebase';
import { 
  initDeletedIdsSync, 
  isMessageDeleted, 
  markMessageDeleted, 
  filterActiveMessages 
} from '../utils/deletedSync';

interface CommunityProps { 
  verses: BibleVerse[]; 
  setVerses: React.Dispatch<React.SetStateAction<BibleVerse[]>>; 
  onBack: () => void; 
  initialTab?: 'chat' | 'mural';
}

const DEFAULT_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg_1',
    senderName: 'Pastor Presidente',
    senderRole: 'Pastor',
    department: 'geral',
    departmentLabel: '⛪ Toda a Igreja (Geral & Comunhão)',
    text: 'A paz do Senhor, amados irmãos! Sejam todos muito bem-vindos ao canal oficial da nossa igreja. Que Deus abençoe poderosamente a vida de cada família.',
    timestamp: Date.now() - 3600000 * 2
  },
  {
    id: 'msg_2',
    senderName: 'Líder dos Jovens (UMAD)',
    senderRole: 'Liderança',
    department: 'jovens',
    departmentLabel: '🔥 Mocidade & Jovens (UMAD)',
    text: 'A paz do Senhor, mocidade! Neste sábado teremos nosso Grande Encontro da Juventude às 19h30. Não percam!',
    timestamp: Date.now() - 3600000
  },
  {
    id: 'msg_3',
    senderName: 'Dirigente do Círculo de Oração',
    senderRole: 'Irmãs',
    department: 'circulo_oracao',
    departmentLabel: '🕊️ Círculo de Oração (Irmãs / UFAD)',
    text: 'Amadas irmãs intercessoras, nossa vigília de oração e clamor pelas famílias será nesta quinta-feira.',
    timestamp: Date.now() - 1800000
  }
];

export const CommunityView: React.FC<CommunityProps> = ({ verses, setVerses, onBack, initialTab = 'chat' }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'mural'>(initialTab);

  // Filtro de Departamento Ativo no Chat ('all' para ver tudo, ou o ID do departamento)
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>('all');

  // Departamento selecionado para o próximo envio de mensagem (Texto ou Áudio)
  const [targetDepartment, setTargetDepartment] = useState<ChurchDepartmentId>('geral');
  const [isDepartmentPickerOpen, setIsDepartmentPickerOpen] = useState(false);

  // Mensagens do Chat com filtragem rigorosa de itens deletados e blindagem
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('ad_chat_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return filterActiveMessages(parsed);
        }
      }
    } catch (e) {}
    return DEFAULT_CHAT_MESSAGES.filter(m => !isMessageDeleted(m.id));
  });

  // Áudios persistentes no IndexedDB
  const [localAudiosMap, setLocalAudiosMap] = useState<Record<string, string>>({});

  // Mensagens que o usuário atual excluiu "Para Mim"
  const [hiddenForMeIds, setHiddenForMeIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ad_chat_hidden_ids');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  // IDs de áudios visualizados / ouvidos
  const [listenedAudioIds, setListenedAudioIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ad_listened_audio_ids');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [currentSenderName, setCurrentSenderName] = useState(() => {
    return localStorage.getItem('ad_user_display_name') || '';
  });
  const [inputText, setInputText] = useState('');
  
  // Gravador de Áudio com Modal de Revisão & Escolha de Área
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Modal de envio e direcionamento do áudio gravado
  const [recordedAudioModal, setRecordedAudioModal] = useState<{
    audioUrl: string;
    duration: number;
    targetDept: ChurchDepartmentId;
    audioTitle: string;
  } | null>(null);

  const [previewAudioPlaying, setPreviewAudioPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Reprodução de Áudio na Linha do Tempo
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Menu Modal de Exclusão (Excluir para todos / Excluir para mim)
  const [selectedMessageForDelete, setSelectedMessageForDelete] = useState<ChatMessage | null>(null);

  // Rolagem automática
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Carrega áudios do IndexedDB e sincroniza mensagens com o Firestore com proteção contra restauração de excluídos
  useEffect(() => {
    let isMounted = true;

    initDeletedIdsSync().then(() => {
      if (isMounted) {
        setChatMessages(prev => filterActiveMessages(prev));
      }
    }).catch(() => {});

    getAllAudiosLocally().then(async map => {
      if (!isMounted) return;
      if (map && Object.keys(map).length > 0) {
        const cleanMap: Record<string, string> = {};
        for (const [id, url] of Object.entries(map)) {
          if (isMessageDeleted(id)) {
            await deleteAudioBlobLocally(id).catch(() => {});
          } else {
            cleanMap[id] = url;
          }
        }
        if (isMounted) setLocalAudiosMap(cleanMap);
      }
    }).catch(() => {});

    fetchCollectionFromFirestore<ChatMessage>('messages').then(remoteMsgs => {
      if (!isMounted) return;
      if (Array.isArray(remoteMsgs) && remoteMsgs.length > 0) {
        setChatMessages(prev => {
          const map = new Map<string, ChatMessage>();
          
          prev.forEach(m => {
            if (m && m.id && !isMessageDeleted(m.id)) {
              map.set(m.id, m);
            }
          });

          remoteMsgs.forEach(m => {
            if (m && m.id && !isMessageDeleted(m.id)) {
              const existing = map.get(m.id);
              const preservedAudioUrl = (existing && existing.audioUrl) ? existing.audioUrl : (m.audioUrl || '');
              map.set(m.id, {
                ...existing,
                ...m,
                audioUrl: preservedAudioUrl
              });
            }
          });

          return Array.from(map.values()).sort((a, b) => {
            const timeA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp).getTime();
            const timeB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime();
            return timeA - timeB;
          });
        });
      }
    }).catch(() => {});

    return () => {
      isMounted = false;
      if (audioStreamRef.current) {
        try {
          audioStreamRef.current.getTracks().forEach(t => t.stop());
        } catch (e) {}
      }
      if (activeAudioRef.current) {
        try { activeAudioRef.current.pause(); } catch(e) {}
      }
    };
  }, []);

  // Salvamento blindado no localStorage (evita travar caso a cota encha)
  useEffect(() => {
    try {
      const filtered = filterActiveMessages(chatMessages);
      const lightweight = filtered.map(m => {
        if (m.audioUrl && m.audioUrl.length > 50000) {
          return { ...m, audioUrl: '' }; // Áudio completo fica preservado no IndexedDB
        }
        return m;
      });
      localStorage.setItem('ad_chat_messages', JSON.stringify(lightweight));
    } catch (e) {
      console.warn("Storage quota blindagem:", e);
    }
  }, [chatMessages]);

  useEffect(() => {
    try {
      localStorage.setItem('ad_chat_hidden_ids', JSON.stringify(hiddenForMeIds));
    } catch (e) {}
  }, [hiddenForMeIds]);

  useEffect(() => {
    try {
      localStorage.setItem('ad_listened_audio_ids', JSON.stringify(listenedAudioIds));
    } catch (e) {}
  }, [listenedAudioIds]);

  useEffect(() => {
    if (activeTab === 'chat') {
      const timer = setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [chatMessages, activeTab, selectedDepartmentFilter]);

  // Gravação de Áudio com microfone
  const startAudioRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Permissão de microfone negada ou não suportada pelo seu navegador.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      audioStreamRef.current = stream;
      
      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg;codecs=opus', 'audio/wav'];
        for (const c of candidates) {
          if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c)) {
            mimeType = c;
            break;
          }
        }
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          // Abre o Modal de Confirmação e Direcionamento do Áudio
          setRecordedAudioModal({
            audioUrl: base64Audio,
            duration: Math.max(1, recordingSeconds),
            targetDept: selectedDepartmentFilter !== 'all' ? (selectedDepartmentFilter as ChurchDepartmentId) : targetDepartment,
            audioTitle: ''
          });
        };
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(track => track.stop());
          audioStreamRef.current = null;
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(sec => {
          if (sec >= 179) {
            stopAudioRecording();
            return 180;
          }
          return sec + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Erro microfone:", err);
      alert("Não foi possível acessar o microfone. Autorize a permissão no navegador para enviar áudios.");
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const cancelAudioRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  // Envio de Mensagem de Texto com Destino
  const sendTextMessage = () => {
    if (!inputText.trim()) return;

    let sender = currentSenderName.trim();
    if (!sender) {
      const prompted = prompt("Qual o seu nome para aparecer no chat da igreja?");
      if (!prompted || !prompted.trim()) return;
      sender = prompted.trim();
      setCurrentSenderName(sender);
      localStorage.setItem('ad_user_display_name', sender);
    }

    const currentDeptInfo = CHURCH_DEPARTMENTS.find(d => d.id === targetDepartment) || CHURCH_DEPARTMENTS[0];

    const msgId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newMsg: ChatMessage = {
      id: msgId,
      senderName: sender,
      department: targetDepartment,
      departmentLabel: currentDeptInfo.label,
      text: inputText.trim(),
      timestamp: Date.now()
    };

    setChatMessages(prev => [...filterActiveMessages(prev), newMsg]);
    setInputText('');

    // Sincroniza com o Firestore
    syncDocToFirestore('messages', msgId, newMsg).catch(() => {});

    // Sincroniza com Servidor
    fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMsg)
    }).catch(() => {});
  };

  // Concluir e Enviar Áudio após escolher o setor no Modal
  const confirmAndSendAudioMessage = async () => {
    if (!recordedAudioModal) return;

    let sender = currentSenderName.trim();
    if (!sender) {
      const prompted = prompt("Qual o seu nome para enviar o áudio?");
      sender = prompted && prompted.trim() ? prompted.trim() : "Membro da Igreja";
      setCurrentSenderName(sender);
      localStorage.setItem('ad_user_display_name', sender);
    }

    const { audioUrl, duration, targetDept, audioTitle } = recordedAudioModal;
    const deptInfo = CHURCH_DEPARTMENTS.find(d => d.id === targetDept) || CHURCH_DEPARTMENTS[0];
    const msgId = `audio_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // 1. Salva no IndexedDB (armazenamento persistente de áudio de alta capacidade)
    await saveAudioBlobLocally(msgId, audioUrl, duration);
    setLocalAudiosMap(prev => ({ ...prev, [msgId]: audioUrl }));

    const newMsg: ChatMessage = {
      id: msgId,
      senderName: sender,
      department: targetDept,
      departmentLabel: deptInfo.label,
      text: audioTitle.trim() ? `🎙️ [Áudio: ${audioTitle.trim()}]` : undefined,
      audioUrl,
      audioDuration: Math.max(1, duration),
      timestamp: Date.now()
    };

    setChatMessages(prev => [...filterActiveMessages(prev), newMsg]);

    // 2. Sincroniza metadados com o Firestore
    syncDocToFirestore('messages', msgId, {
      id: msgId,
      senderName: sender,
      department: targetDept,
      departmentLabel: deptInfo.label,
      text: newMsg.text || '',
      audioDuration: Math.max(1, duration),
      timestamp: newMsg.timestamp,
      audioUrl: audioUrl.length < 500000 ? audioUrl : ''
    }).catch(() => {});

    // 3. Sincroniza com Servidor
    fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: msgId,
        senderName: sender,
        department: targetDept,
        departmentLabel: deptInfo.label,
        text: newMsg.text || '',
        audioDuration: Math.max(1, duration),
        timestamp: newMsg.timestamp,
        audioUrl: audioUrl.length < 500000 ? audioUrl : ''
      })
    }).catch(() => {});

    // Fecha o modal
    if (previewAudioRef.current) {
      try { previewAudioRef.current.pause(); } catch(e) {}
    }
    setRecordedAudioModal(null);
    setPreviewAudioPlaying(false);
  };

  // Reprodução de áudio da linha do tempo
  const togglePlayAudio = (id: string, url: string) => {
    const effectiveUrl = url || localAudiosMap[id];
    if (!effectiveUrl) {
      alert("Áudio não encontrado no dispositivo.");
      return;
    }

    setListenedAudioIds(prev => {
      if (!prev.includes(id)) {
        const next = [...prev, id];
        try { localStorage.setItem('ad_listened_audio_ids', JSON.stringify(next)); } catch(e) {}
        return next;
      }
      return prev;
    });

    if (playingAudioId === id) {
      if (activeAudioRef.current) {
        try { activeAudioRef.current.pause(); } catch(e) {}
      }
      setPlayingAudioId(null);
      return;
    }

    if (activeAudioRef.current) {
      try { activeAudioRef.current.pause(); } catch(e) {}
      activeAudioRef.current = null;
    }

    try {
      const audio = new Audio();
      audio.src = effectiveUrl;
      audio.preload = 'auto';
      activeAudioRef.current = audio;
      setPlayingAudioId(id);

      audio.play().catch(err => {
        console.warn("Play mobile:", err);
      });

      audio.onended = () => setPlayingAudioId(null);
      audio.onerror = () => setPlayingAudioId(null);
      audio.onpause = () => {
        if (playingAudioId === id) setPlayingAudioId(null);
      };
    } catch (e) {
      setPlayingAudioId(null);
    }
  };

  // Exclusão WhatsApp (Para Mim / Para Todos)
  const handleDeleteForMe = () => {
    if (!selectedMessageForDelete) return;
    const msgId = selectedMessageForDelete.id;
    setHiddenForMeIds(prev => [...prev, msgId]);
    setSelectedMessageForDelete(null);
  };

  const handleDeleteForEveryone = async () => {
    if (!selectedMessageForDelete) return;
    const msgId = selectedMessageForDelete.id;
    setChatMessages(prev => prev.filter(m => m.id !== msgId));
    setLocalAudiosMap(prev => {
      const copy = { ...prev };
      delete copy[msgId];
      return copy;
    });
    setSelectedMessageForDelete(null);
    await markMessageDeleted(msgId);
  };

  // Mensagens filtradas por exclusão individual E por setor selecionado
  const visibleMessages = chatMessages
    .filter(m => !hiddenForMeIds.includes(m.id))
    .filter(m => {
      if (selectedDepartmentFilter === 'all') return true;
      // Se for um setor específico, mostra as mensagens daquele setor ou as de 'geral'
      return m.department === selectedDepartmentFilter || (!m.department && selectedDepartmentFilter === 'geral');
    });

  // --- Modal Mural de Versículos ---
  const [showAddVerse, setShowAddVerse] = useState(false);
  const [verseAuthor, setVerseAuthor] = useState('');
  const [verseContent, setVerseContent] = useState('');
  const [verseReference, setVerseReference] = useState('');

  const handleAddVerse = () => {
    if (!verseAuthor.trim()) return alert("Por favor, digite seu nome.");
    if (!verseContent.trim()) return alert("Por favor, digite o versículo ou mensagem.");
    if (!verseReference.trim()) return alert("Por favor, informe a referência bíblica (Ex: João 3:16).");

    const verseId = Date.now().toString();
    const newVerse: BibleVerse = { 
      id: verseId, 
      memberName: verseAuthor.trim(), 
      verse: verseContent.trim(), 
      reference: verseReference.trim(), 
      timestamp: Date.now() 
    };

    setVerses(prev => [newVerse, ...prev]);
    setShowAddVerse(false); 
    setVerseAuthor(''); 
    setVerseContent(''); 
    setVerseReference('');

    syncDocToFirestore('verses', verseId, newVerse).catch(() => {});
  };

  const removeVerse = (id: string) => {
    setVerses(prev => prev.filter(v => v.id !== id));
    deleteDocFromFirestore('verses', id).catch(() => {});
  };

  const currentActiveDeptInfo = CHURCH_DEPARTMENTS.find(d => d.id === targetDepartment) || CHURCH_DEPARTMENTS[0];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-3xl mx-auto animate-slide-up">
      {/* CABEÇALHO DO CHAT */}
      <header className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm active:scale-95 transition-transform cursor-pointer"
          >
            <ChevronLeft size={20} className="text-slate-700 dark:text-zinc-300" />
          </button>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-1.5">
              <span>Chat da Igreja</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                Ao Vivo
              </span>
            </h2>
            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Comunhão dos Ministérios & Membresia
            </p>
          </div>
        </div>

        {/* ABAS */}
        <div className="flex bg-slate-100 dark:bg-zinc-900 p-1 rounded-2xl border border-slate-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
            }`}
          >
            <MessageSquare size={14} /> Chat
          </button>
          <button
            onClick={() => setActiveTab('mural')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
              activeTab === 'mural'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
            }`}
          >
            <BookMarked size={14} /> Mural
          </button>
        </div>
      </header>

      {/* ABA CHAT */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0 pt-2.5 space-y-2">
          {/* BARRA DE IDENTIFICAÇÃO DO USUÁRIO */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <User size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">Falando como: <strong>{currentSenderName || 'Membro da Igreja'}</strong></span>
            </div>
            <button 
              onClick={() => {
                const name = prompt("Digite seu nome completo:", currentSenderName);
                if (name && name.trim()) {
                  setCurrentSenderName(name.trim());
                  localStorage.setItem('ad_user_display_name', name.trim());
                }
              }}
              className="text-[10px] font-black uppercase bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg active:scale-95 transition-all cursor-pointer shrink-0"
            >
              Alterar
            </button>
          </div>

          {/* BARRA DE FILTROS DOS DEPARTAMENTOS / ÁREAS DA IGREJA */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-700 dark:text-zinc-200">
                <Layers size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>Canais por Setor da Igreja:</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                {selectedDepartmentFilter === 'all' ? 'Vendo Todos' : CHURCH_DEPARTMENTS.find(d => d.id === selectedDepartmentFilter)?.shortName}
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none px-0.5 -mx-1 sm:mx-0">
              <button
                onClick={() => setSelectedDepartmentFilter('all')}
                className={`px-3.5 py-2 rounded-xl text-[11px] font-black uppercase whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm ${
                  selectedDepartmentFilter === 'all'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 ring-2 ring-emerald-500/50 scale-105'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 border border-slate-200 dark:border-zinc-700'
                }`}
              >
                <Layers size={14} />
                <span>⛪ Geral (Toda a Igreja)</span>
              </button>

              {CHURCH_DEPARTMENTS.map(dept => {
                const isActive = selectedDepartmentFilter === dept.id;
                return (
                  <button
                    key={dept.id}
                    onClick={() => setSelectedDepartmentFilter(dept.id)}
                    className={`px-3.5 py-2 rounded-xl text-[11px] font-black uppercase whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border shadow-sm ${
                      isActive
                        ? `${dept.badgeBg} ${dept.badgeText} ring-2 ring-emerald-500/60 scale-105 font-extrabold shadow-md`
                        : 'bg-white dark:bg-zinc-800/90 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-sm">{dept.icon}</span>
                    <span>{dept.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* LISTA DE MENSAGENS E ÁUDIOS */}
          <div className="flex-1 overflow-y-auto space-y-3 p-3 rounded-2xl bg-slate-50/70 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800 shadow-inner">
            {visibleMessages.length === 0 ? (
              <div className="text-center py-16 text-slate-400 flex flex-col items-center gap-2">
                <MessageSquare size={36} className="opacity-30" />
                <p className="text-xs font-bold uppercase tracking-wider">
                  Nenhuma mensagem para este setor ainda
                </p>
                <p className="text-[11px] text-slate-500 max-w-xs">
                  Seja o primeiro a enviar uma palavra, aviso ou áudio para {selectedDepartmentFilter === 'all' ? 'a igreja' : 'este departamento'}!
                </p>
              </div>
            ) : (
              visibleMessages.map(msg => {
                const isMe = currentSenderName && msg.senderName.toLowerCase() === currentSenderName.toLowerCase();
                const isListened = listenedAudioIds.includes(msg.id) || msg.isListened;
                const effectiveAudioUrl = msg.audioUrl || localAudiosMap[msg.id] || '';
                const msgDept = CHURCH_DEPARTMENTS.find(d => d.id === msg.department);

                return (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
                  >
                    {/* CABEÇALHO DO CARD: NOME, SETOR E HORÁRIO */}
                    <div className="flex items-center gap-1.5 mb-1 px-1 flex-wrap">
                      <span className="text-[11px] font-black text-slate-800 dark:text-zinc-200">
                        {msg.senderName}
                      </span>

                      {/* BADGE DA ÁREA / DEPARTAMENTO DE DESTINO */}
                      {msgDept ? (
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border flex items-center gap-1 ${msgDept.badgeBg} ${msgDept.badgeText}`}>
                          <span>{msgDept.icon}</span>
                          <span>{msgDept.shortName}</span>
                        </span>
                      ) : (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200">
                          ⛪ Toda a Igreja
                        </span>
                      )}

                      {msg.senderRole && (
                        <span className="text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.5 rounded-md">
                          {msg.senderRole}
                        </span>
                      )}

                      <span className="text-[9px] text-slate-400">
                        {typeof msg.timestamp === 'number' 
                          ? new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                          : msg.timestamp}
                      </span>
                      
                      {/* Botão de Opções / Excluir */}
                      <button
                        onClick={() => setSelectedMessageForDelete(msg)}
                        title="Opções da mensagem"
                        className="p-1 text-slate-400 hover:text-rose-500 rounded-lg active:scale-90 transition-all ml-1 cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    {/* CORPO DA MENSAGEM */}
                    <div className={`p-3.5 rounded-2xl max-w-[92%] sm:max-w-[85%] shadow-sm relative ${
                      isMe 
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-none border border-emerald-500/30' 
                        : 'bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 border border-slate-200 dark:border-zinc-700 rounded-tl-none'
                    }`}>
                      {/* SE FOR MENSAGEM DE ÁUDIO */}
                      {(msg.audioUrl || localAudiosMap[msg.id]) ? (
                        <div className="flex items-center gap-3 pr-2">
                          <button
                            type="button"
                            onClick={() => togglePlayAudio(msg.id, effectiveAudioUrl)}
                            title={isListened ? "Áudio Ouvido (Azul)" : "Áudio Novo (Branco)"}
                            style={{
                              backgroundColor: playingAudioId === msg.id 
                                ? '#FBBF24' 
                                : isListened 
                                  ? '#2563EB' 
                                  : '#FFFFFF',
                              color: playingAudioId === msg.id 
                                ? '#000000' 
                                : isListened 
                                  ? '#FFFFFF' 
                                  : '#059669'
                            }}
                            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer relative shrink-0 border-2 ${
                              isListened ? 'border-blue-400 shadow-blue-500/30' : 'border-white/80 shadow-black/10'
                            }`}
                          >
                            {playingAudioId === msg.id ? (
                              <Pause size={22} className="text-zinc-950" />
                            ) : (
                              <Play size={22} className="ml-0.5" />
                            )}
                            
                            {/* BOLINHA INDICADORA (BRANCA/VERDE QUANDO NOVO / AZUL QUANDO VISUALIZADO) */}
                            <span 
                              style={{
                                backgroundColor: isListened ? '#3B82F6' : '#FFFFFF',
                                borderColor: isListened ? '#1D4ED8' : '#059669'
                              }}
                              className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 shadow-sm transition-colors duration-300"
                              title={isListened ? "Visualizado" : "Novo"}
                            />
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Volume2 size={15} style={{ color: isListened ? '#60A5FA' : (isMe ? '#A7F3D0' : '#059669') }} className="shrink-0" />
                              <span className="text-xs font-black uppercase tracking-wider truncate">
                                Mensagem de Voz ({msgDept?.shortName || 'Igreja'})
                              </span>
                            </div>

                            {msg.text && (
                              <p className={`text-[11px] font-semibold mt-0.5 truncate ${isMe ? 'text-emerald-100' : 'text-slate-600 dark:text-zinc-300'}`}>
                                {msg.text.replace(/^🎙️ \[Áudio:\s*/, '').replace(/\]$/, '')}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] opacity-90 font-mono font-bold">
                                {msg.audioDuration ? `${msg.audioDuration}s` : 'Áudio'}
                              </span>

                              {/* DUPLO CHECK AZUL SE VISUALIZADO */}
                              <span 
                                style={{
                                  backgroundColor: isListened ? 'rgba(59, 130, 246, 0.35)' : 'rgba(255, 255, 255, 0.25)',
                                  color: isListened ? '#93C5FD' : '#FFFFFF',
                                  borderColor: isListened ? '#60A5FA' : 'rgba(255, 255, 255, 0.4)'
                                }}
                                className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1 border shrink-0"
                              >
                                {isListened ? (
                                  <>
                                    <CheckCheck size={12} className="text-blue-300" />
                                    <span>Visualizado</span>
                                  </>
                                ) : (
                                  <>
                                    <Check size={12} />
                                    <span>Pendente</span>
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* SE FOR MENSAGEM DE TEXTO */
                        <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap break-words">
                          {msg.text}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* BARRA INFERIOR DE ENVIO COM SELETOR DE ÁREA */}
          <div className="pt-1 space-y-2">
            {/* SELETOR RÁPIDO DO SETOR DE DESTINO */}
            <div className="flex items-center justify-between px-1 text-xs">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 font-bold text-[11px]">
                <span>Enviar para o Setor:</span>
                <button
                  type="button"
                  onClick={() => setIsDepartmentPickerOpen(true)}
                  className={`px-2.5 py-1 rounded-xl font-black text-xs flex items-center gap-1 border shadow-sm transition-all active:scale-95 cursor-pointer ${currentActiveDeptInfo.badgeBg} ${currentActiveDeptInfo.badgeText}`}
                  title="Clique para mudar o setor de destino"
                >
                  <span>{currentActiveDeptInfo.icon}</span>
                  <span>{currentActiveDeptInfo.shortName}</span>
                  <ChevronDown size={14} className="opacity-70" />
                </button>
              </div>

              {selectedDepartmentFilter !== 'all' && (
                <span className="text-[10px] font-bold text-slate-400">
                  Filtro: {CHURCH_DEPARTMENTS.find(d => d.id === selectedDepartmentFilter)?.shortName}
                </span>
              )}
            </div>

            {/* CONTROLES DE GRAVAÇÃO OU INPUT DE TEXTO */}
            {isRecording ? (
              <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white rounded-2xl shadow-lg animate-pulse">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-white"></span>
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-black uppercase tracking-wide">
                      Gravando Áudio da Igreja...
                    </span>
                    <span className="text-[11px] font-mono font-bold text-rose-100">
                      {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')} / 3:00
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={cancelAudioRecording}
                    className="px-3 py-2 bg-black/30 hover:bg-black/50 rounded-xl text-xs font-bold uppercase transition-all active:scale-95 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={stopAudioRecording}
                    className="px-4 py-2 bg-white text-rose-700 font-black rounded-xl text-xs uppercase tracking-wider shadow-md hover:bg-rose-50 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check size={16} />
                    <span>Concluir & Escolher Setor</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {/* BOTÃO MICROFONE PARA GRAVAR ÁUDIO */}
                <button
                  type="button"
                  onClick={startAudioRecording}
                  title="Gravar Mensagem de Áudio para o Setor da Igreja"
                  className="p-3.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-2xl shadow-md shadow-rose-600/30 active:scale-95 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <Mic size={20} />
                </button>

                {/* CAMPO DE DIGITAÇÃO DE TEXTO */}
                <div className="flex-1 flex items-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl px-3.5 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        sendTextMessage();
                      }
                    }}
                    placeholder={`Mensagem para ${currentActiveDeptInfo.shortName}...`}
                    className="w-full bg-transparent border-none outline-none text-sm text-slate-800 dark:text-zinc-100 placeholder-slate-400 py-1.5 font-medium"
                  />
                </div>

                {/* BOTÃO ENVIAR TEXTO */}
                <button
                  type="button"
                  onClick={sendTextMessage}
                  disabled={!inputText.trim()}
                  className="p-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-2xl shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                  title="Enviar mensagem de texto"
                >
                  <Send size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE ESCOLHA DE DEPARTAMENTO PARA ENVIO DE TEXTO */}
      {isDepartmentPickerOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-md p-4 flex items-center justify-center animate-fade-in"
          onClick={() => setIsDepartmentPickerOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-zinc-800 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
              <div>
                <h3 className="font-black text-base uppercase tracking-tight text-slate-900 dark:text-white">
                  Escolher Setor de Destino
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Para qual área da igreja você deseja enviar sua mensagem?
                </p>
              </div>
              <button 
                onClick={() => setIsDepartmentPickerOpen(false)} 
                className="p-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {CHURCH_DEPARTMENTS.map(dept => {
                const isSelected = targetDepartment === dept.id;
                return (
                  <button
                    key={dept.id}
                    onClick={() => {
                      setTargetDepartment(dept.id);
                      setIsDepartmentPickerOpen(false);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-2.5 cursor-pointer active:scale-95 ${
                      isSelected
                        ? `${dept.badgeBg} ${dept.badgeText} ring-2 ring-emerald-500 shadow-md font-black`
                        : 'bg-slate-50 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 hover:bg-slate-100 text-slate-800 dark:text-zinc-200'
                    }`}
                  >
                    <span className="text-2xl shrink-0">{dept.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-black truncate">{dept.shortName}</p>
                      <p className="text-[10px] opacity-75 line-clamp-2 mt-0.5 font-medium">{dept.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL COMPLETO DE REVISÃO E DIRECIONAMENTO DO ÁUDIO GRAVADO */}
      {recordedAudioModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[999999] bg-slate-950/85 backdrop-blur-md p-4 flex items-center justify-center animate-fade-in"
          onClick={() => {
            if (previewAudioRef.current) previewAudioRef.current.pause();
            setRecordedAudioModal(null);
            setPreviewAudioPlaying(false);
          }}
        >
          <div 
            className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl p-6 space-y-5 shadow-2xl border border-slate-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center font-black">
                  <Mic size={22} />
                </div>
                <div>
                  <h3 className="font-black text-base uppercase tracking-tight text-slate-900 dark:text-white">
                    Enviar Áudio da Igreja
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Ouça sua gravação e escolha o setor de destino
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  if (previewAudioRef.current) previewAudioRef.current.pause();
                  setRecordedAudioModal(null);
                  setPreviewAudioPlaying(false);
                }} 
                className="p-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* PLAYER DE PREVIEW DO ÁUDIO GRAVADO */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white space-y-2.5 shadow-md">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Volume2 size={15} className="text-amber-400" /> Prévia da Gravação
                </span>
                <span className="font-mono font-black text-amber-400">
                  {recordedAudioModal.duration} segundos
                </span>
              </div>

              <audio 
                ref={previewAudioRef}
                src={recordedAudioModal.audioUrl}
                onEnded={() => setPreviewAudioPlaying(false)}
                onPause={() => setPreviewAudioPlaying(false)}
                onPlay={() => setPreviewAudioPlaying(true)}
              />

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const audio = previewAudioRef.current;
                    if (!audio) return;
                    if (previewAudioPlaying) {
                      audio.pause();
                    } else {
                      audio.play().catch(() => {});
                    }
                  }}
                  className="w-11 h-11 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  {previewAudioPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                </button>
                <div className="flex-1 text-xs font-semibold text-slate-200">
                  {previewAudioPlaying ? "Reproduzindo áudio gravado..." : "Clique no play para escutar o áudio antes de enviar"}
                </div>
              </div>
            </div>

            {/* SELEÇÃO DO SETOR DA IGREJA */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase text-slate-700 dark:text-zinc-300 tracking-wider">
                Escolha para qual setor da igreja enviar este áudio:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CHURCH_DEPARTMENTS.map(dept => {
                  const isSelected = recordedAudioModal.targetDept === dept.id;
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => setRecordedAudioModal(prev => prev ? { ...prev, targetDept: dept.id } : null)}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1 cursor-pointer active:scale-95 ${
                        isSelected
                          ? `${dept.badgeBg} ${dept.badgeText} ring-2 ring-emerald-500 shadow-md font-black`
                          : 'bg-slate-50 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-xl">{dept.icon}</span>
                      <span className="text-xs font-black truncate">{dept.shortName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TÍTULO / OBSERVAÇÃO OPCIONAL DO ÁUDIO */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                Título ou Observação da Mensagem (Opcional):
              </label>
              <input
                type="text"
                placeholder="Ex: Palavra de Bênção, Aviso de Ensaio, Oração..."
                value={recordedAudioModal.audioTitle}
                onChange={(e) => setRecordedAudioModal(prev => prev ? { ...prev, audioTitle: e.target.value } : null)}
                className="w-full p-3 bg-slate-100 dark:bg-zinc-800 border-none rounded-xl text-xs text-slate-900 dark:text-white outline-none font-medium"
              />
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (previewAudioRef.current) previewAudioRef.current.pause();
                  setRecordedAudioModal(null);
                  setPreviewAudioPlaying(false);
                }}
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Descartar
              </button>

              <button
                type="button"
                onClick={confirmAndSendAudioMessage}
                className="flex-[2] py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send size={16} />
                <span>Enviar para {CHURCH_DEPARTMENTS.find(d => d.id === recordedAudioModal.targetDept)?.shortName}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL DE EXCLUSÃO ESTILO WHATSAPP (EXCLUIR PARA MIM / EXCLUIR PARA TODOS) */}
      {selectedMessageForDelete && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-md p-4 flex items-center justify-center animate-fade-in"
          onClick={() => setSelectedMessageForDelete(null)}
        >
          <div 
            className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-zinc-800 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase">
                Deseja apagar mensagem?
              </h3>
              <button 
                onClick={() => setSelectedMessageForDelete(null)} 
                className="p-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full text-slate-400 active:scale-90 cursor-pointer"
              >
                <X size={16}/>
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-400">
              Escolha como deseja excluir esta mensagem do chat da igreja:
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleDeleteForEveryone}
                className="w-full p-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-rose-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Trash2 size={16} /> Apagar para Todos
              </button>

              <button
                onClick={handleDeleteForMe}
                className="w-full p-3.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                Apagar para Mim
              </button>

              <button
                onClick={() => setSelectedMessageForDelete(null)}
                className="w-full p-3 text-slate-500 hover:text-slate-700 dark:text-zinc-400 font-bold text-xs uppercase text-center cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ABA MURAL */}
      {activeTab === 'mural' && (
        <div className="flex-1 flex flex-col min-h-0 pt-3">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1">
              <Info size={12}/> Arraste para excluir versículo
            </span>
            <button 
              onClick={() => setShowAddVerse(true)} 
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-black uppercase shadow-md active:scale-95 transition-transform cursor-pointer"
            >
              <Plus size={16}/> Compartilhar Versículo
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {verses.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-zinc-800 text-slate-400 font-bold flex flex-col items-center gap-3">
                <BookOpen size={40} className="opacity-30" />
                <span className="uppercase tracking-wider text-xs">O mural de versículos está vazio</span>
              </div>
            ) : (
              verses.map(v => (
                <SwipeableItem 
                  key={v.id} 
                  onDelete={() => removeVerse(v.id)}
                  roundedClass="rounded-3xl"
                >
                  <div className="p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4 bg-white dark:bg-zinc-900 relative overflow-hidden">
                    <Quote className="absolute -top-2 -right-2 w-16 h-16 text-slate-100 dark:text-zinc-800 -rotate-12 pointer-events-none" />
                    
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md">
                        <User size={16}/>
                      </div>
                      <div>
                        <p className="font-black text-slate-800 dark:text-zinc-100 leading-none uppercase text-xs">{v.memberName}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                          {new Date(v.timestamp).toLocaleDateString('pt-BR')} às {new Date(v.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-zinc-800/60 p-4 rounded-2xl border-l-4 border-blue-600 relative z-10">
                      <p className="italic font-semibold text-slate-700 dark:text-zinc-200 leading-relaxed text-base">
                        "{v.verse}"
                      </p>
                    </div>

                    <div className="flex justify-end relative z-10">
                      <div className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-blue-200 dark:border-blue-800">
                        {v.reference}
                      </div>
                    </div>
                  </div>
                </SwipeableItem>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR VERSÍCULO */}
      {showAddVerse && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen min-h-[100dvh] z-[99999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
          style={{ position: 'fixed', margin: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddVerse(false);
          }}
        >
          <div 
            className="bg-white dark:bg-zinc-900 w-full max-w-md mx-auto rounded-3xl p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh] my-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                Compartilhar Versículo
              </h3>
              <button onClick={() => setShowAddVerse(false)} className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-full text-slate-400 active:scale-90 transition-transform cursor-pointer">
                <X size={18}/>
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block tracking-wider">Seu Nome</label>
                <input 
                  value={verseAuthor} 
                  onChange={(e) => setVerseAuthor(e.target.value)} 
                  placeholder="Ex: Irmão Marcos" 
                  className="w-full p-4 bg-slate-50 dark:bg-zinc-800 rounded-2xl border-none outline-none font-bold text-slate-800 dark:text-zinc-100 text-sm" 
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block tracking-wider">Mensagem ou Versículo</label>
                <textarea 
                  value={verseContent} 
                  onChange={(e) => setVerseContent(e.target.value)} 
                  placeholder="Digite aqui o que Deus colocou no seu coração..." 
                  className="w-full p-4 bg-slate-50 dark:bg-zinc-800 rounded-2xl border-none outline-none font-medium h-32 resize-none text-slate-700 dark:text-zinc-200 text-sm leading-relaxed" 
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block tracking-wider">Referência Bíblica</label>
                <input 
                  value={verseReference} 
                  onChange={(e) => setVerseReference(e.target.value)} 
                  placeholder="Ex: Salmos 23:1" 
                  className="w-full p-4 bg-slate-50 dark:bg-zinc-800 rounded-2xl border-none outline-none font-black uppercase text-blue-600 text-sm" 
                />
              </div>
            </div>

            <button 
              onClick={handleAddVerse} 
              className="bg-blue-600 hover:bg-blue-700 text-white w-full p-4 rounded-2xl font-black shadow-lg shadow-blue-600/30 uppercase tracking-wider active:scale-95 transition-all text-sm cursor-pointer"
            >
              Postar no Mural
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CommunityView;

