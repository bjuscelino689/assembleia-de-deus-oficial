import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChatChannel, ChatMessage, UserProfile, PRIMARY_ADMIN_EMAIL } from '../types';
import { getOrCreateDeviceId } from '../utils/deviceId';
import { uploadVideoWithProgress } from '../utils/videoUploader';
import { 
  MessageSquare, Send, Mic, Search, 
  Trash2, Play, Pause, X, Volume2, 
  Users, Camera, Video, ExternalLink, PhoneCall,
  Heart, Sparkles, Star, BookOpen, ShieldCheck, CheckCheck, Check,
  AlertCircle, Upload, Music, Loader2, Download, Film, Link as LinkIcon
} from 'lucide-react';

export const DEFAULT_NURSING_CHANNELS: ChatChannel[] = [
  { id: 'c_passagem', name: '🔄 Passagem de Plantão (SBAR)', isGroup: true, participants: ['all'], lastMessage: 'Passagem de plantão, pendências e alertas clínicos beira-leito' },
  { id: 'c_geral', name: '🏥 Posto de Enfermagem & Equipe', isGroup: true, participants: ['all'], lastMessage: 'Comunicação geral do plantão e avisos da equipe' },
  { id: 'c_uti', name: '🚨 UTI & Urgência / Emergência', isGroup: true, participants: ['all'], lastMessage: 'Casos críticos, admissões e transferências' },
  { id: 'c_enfermaria', name: '🛏️ Enfermaria & Clínica Médica', isGroup: true, participants: ['all'], lastMessage: 'Rotinas de leito, cuidados e evoluções de enfermagem' },
  { id: 'c_farmacia', name: '💊 Farmácia & Medicamentos', isGroup: true, participants: ['all'], lastMessage: 'Aprazamento, faltas, checagens e reposições' },
  { id: 'c_escalas', name: '📋 Coordenação & Escalas de Plantão', isGroup: true, participants: ['all'], lastMessage: 'Avisos da chefia, escalas e trocas de turno' },
  { id: 'c_casos_clinicos', name: '🩺 Discussão Clínica & Protocolos', isGroup: true, participants: ['all'], lastMessage: 'Debates sobre condutas, curativos especiais e POPs' },
];

export const DEFAULT_CHURCH_CHANNELS = DEFAULT_NURSING_CHANNELS;

const getYouTubeEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11)
    ? `https://www.youtube.com/embed/${match[2]}`
    : null;
};

interface ChatCommunityViewProps {
  channels?: ChatChannel[];
  messages?: ChatMessage[];
  user: UserProfile;
  onSendMessage?: (msg: ChatMessage) => void;
  onListenMessage?: (messageId: string) => void;
  onBatchListenMessages?: (messageIds: string[]) => void;
  onDeleteMessage?: (messageId: string) => void;
  onDeleteMessageForMe?: (messageId: string) => void;
  onDeleteMessageForEveryone?: (messageId: string) => void;
  onClearChannel?: (channelId: string) => void;
  onClearAllMessages?: () => void;
  onOpenMural?: () => void;
  darkMode?: boolean;
  onNavigateHome?: () => void;
}

// HELPER PARA DETECTAR SE UMA MENSAGEM FOI LIDA/OUVIDA
function checkIsReadByOther(
  message: ChatMessage,
  currentUser: UserProfile | null,
  currentDeviceId: string,
  isAuthor: boolean
): boolean {
  const listenedBy = message.listenedBy || [];
  if (!Array.isArray(listenedBy) || listenedBy.length === 0) return false;

  const senderDevId = (message.senderDeviceId || '').toLowerCase().trim();
  const senderId = (message.senderId || '').toLowerCase().trim();
  const senderEmail = (message.senderEmail || '').toLowerCase().trim();
  const senderName = (message.senderName || '').toLowerCase().trim();

  const myDevId = (currentDeviceId || '').toLowerCase().trim();
  const myUserId = (currentUser?.id || '').toLowerCase().trim();
  const myUserEmail = (currentUser?.email || '').toLowerCase().trim();
  const myUserName = (currentUser?.name || '').toLowerCase().trim();

  return listenedBy.some(raw => {
    const clean = (raw || '').toLowerCase().trim();
    if (!clean) return false;

    if (senderDevId && clean === senderDevId) return false;
    if (senderId && senderId !== 'usr_guest_unauthenticated' && senderId !== 'usr_guest' && clean === senderId) return false;
    if (senderEmail && clean === senderEmail) return false;
    if (senderName && clean === senderName) return false;

    if (isAuthor) {
      if (myDevId && clean === myDevId) return false;
      if (myUserId && clean === myUserId) return false;
      if (myUserEmail && clean === myUserEmail) return false;
      if (myUserName && clean === myUserName) return false;
    }

    return true;
  });
}

// COMPONENTE DEDICADO PARA PLAYER DE ÁUDIO NO CHAT DA IGREJA
const AudioMessagePlayer: React.FC<{ 
  message: ChatMessage; 
  user: UserProfile; 
  isMe: boolean; 
  onListenMessage?: (messageId: string) => void; 
  darkMode?: boolean 
}> = ({ message, user, isMe, onListenMessage, darkMode }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const listenedCalledRef = useRef(false);

  const rawAudioUrl = message.audioUrl || '';
  const listenedBy = message.listenedBy || [];
  const [activeSrc, setActiveSrc] = useState(rawAudioUrl);
  const msgIdRef = useRef(message.id);

  useEffect(() => {
    if (msgIdRef.current !== message.id) {
      msgIdRef.current = message.id;
      setActiveSrc(rawAudioUrl);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      listenedCalledRef.current = false;
    } else if (!isPlaying && rawAudioUrl && activeSrc !== rawAudioUrl) {
      setActiveSrc(rawAudioUrl);
    }
  }, [message.id, rawAudioUrl, isPlaying, activeSrc]);

  const userIdClean = (user?.id || '').toLowerCase().trim();
  const userEmailClean = (user?.email || '').toLowerCase().trim();
  const deviceId = getOrCreateDeviceId().toLowerCase();

  const listenedByOther = checkIsReadByOther(message, user, deviceId, isMe);
  const listenedByMe = listenedBy.some(id => {
    const clean = id.toLowerCase().trim();
    if (!clean) return false;
    if (deviceId && clean === deviceId) return true;
    if (userIdClean && clean === userIdClean) return true;
    if (userEmailClean && clean === userEmailClean) return true;
    return false;
  });

  // Se qualquer membro já visualizou/ouviu o áudio
  const isVisualized = Boolean(
    (Array.isArray(listenedBy) && listenedBy.length > 0) ||
    message.isRead ||
    listenedByOther ||
    listenedByMe
  );

  const isHighlighted = isMe ? listenedByOther : (listenedByMe || listenedByOther);

  const triggerMarkAsListened = () => {
    if (!listenedCalledRef.current && onListenMessage && message.id) {
      listenedCalledRef.current = true;
      onListenMessage(message.id);
    }
  };

  // Quando outro membro visualiza a mensagem no chat, marca como visualizado
  useEffect(() => {
    if (!isMe && !isVisualized && onListenMessage && message.id) {
      const timer = setTimeout(() => {
        triggerMarkAsListened();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [message.id, isMe, isVisualized]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    const dur = duration || audio.duration || 0;
    if (audio.ended || (dur > 0 && audio.currentTime >= dur - 0.2)) {
      audio.currentTime = 0;
      setCurrentTime(0);
    }

    try {
      await audio.play();
      setIsPlaying(true);
      triggerMarkAsListened();
    } catch (err) {
      try {
        audio.currentTime = 0;
        await audio.play();
        setIsPlaying(true);
        triggerMarkAsListened();
      } catch (err2) {
        setIsPlaying(false);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    try {
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    } catch (err) {}
  };

  const formatSecs = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className={`mt-2 p-3 rounded-2xl flex flex-col space-y-2.5 border transition-all ${
      isMe 
        ? isHighlighted
          ? 'bg-purple-950/20 border border-purple-800/30 text-purple-950 dark:text-purple-100 shadow-inner font-medium'
          : 'bg-purple-700/90 border-purple-500/30 text-white shadow-sm' 
        : darkMode 
          ? 'bg-slate-900/90 border-slate-700 text-slate-100 shadow-sm' 
          : 'bg-white border-slate-200 text-slate-800 shadow-sm'
    }`}>
      <audio 
        ref={audioRef} 
        src={activeSrc} 
        preload="metadata"
        onPlay={() => {
          setIsPlaying(true);
          triggerMarkAsListened();
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
          if (audioRef.current) {
            try { audioRef.current.currentTime = 0; } catch (e) {}
          }
          if (rawAudioUrl && activeSrc !== rawAudioUrl) {
            setActiveSrc(rawAudioUrl);
          }
        }}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            if (audioRef.current.currentTime > 0.3) {
              triggerMarkAsListened();
            }
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current && isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
            setDuration(audioRef.current.duration);
          }
        }}
      />

      <div className="flex items-center gap-3">
        {/* BOTÃO DE PLAY/PAUSE (AMARELO SE PENDENTE, AZUL SE VISUALIZADO) */}
        <button
          type="button"
          onClick={togglePlay}
          className={`w-11 h-11 rounded-full border-2 shadow-md flex items-center justify-center shrink-0 font-bold transition-all active:scale-95 cursor-pointer ${
            isVisualized
              ? 'bg-sky-500 hover:bg-sky-600 border-sky-300 text-white shadow-sky-500/20'
              : 'bg-amber-500 hover:bg-amber-600 border-amber-300 text-slate-950 shadow-amber-500/20 animate-pulse'
          }`}
          title={isPlaying ? "Pausar Áudio" : isVisualized ? "Ouvir Áudio (Visualizado)" : "Ouvir Áudio da Igreja"}
        >
          {isPlaying ? (
            <Pause size={18} className={isVisualized ? "fill-white text-white" : "fill-slate-950 text-slate-950"} />
          ) : (
            <Play size={18} className={`ml-0.5 ${isVisualized ? "fill-white text-white" : "fill-slate-950 text-slate-950"}`} />
          )}
        </button>

        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="flex items-center justify-between text-[11px] font-black tracking-tight opacity-90 gap-1.5">
            <span className="flex items-center gap-1.5 min-w-0">
              <Volume2 size={13} className={`shrink-0 ${isPlaying ? (isVisualized ? "animate-pulse text-sky-400" : "animate-pulse text-amber-400") : ""}`} />
              <span className="truncate shrink">{isPlaying ? 'Reproduzindo...' : 'Mensagem de Áudio'}</span>
            </span>

            {/* STATUS DO ÁUDIO: BOLINHA AMARELA (PENDENTE) OU BOLINHA AZUL (VISUALIZADO/OUVIDO) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {isVisualized ? (
                <div 
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/50 text-sky-300 text-[10px] font-black"
                  title="Áudio visualizado e ouvido por membros da igreja"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 border border-sky-300 ring-2 ring-sky-400/40 shadow-sm shrink-0" />
                  <CheckCheck size={12} className="text-sky-400" />
                  <span className="hidden sm:inline">Visualizado</span>
                </div>
              ) : (
                <div 
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[10px] font-black"
                  title="Áudio pendente / Não visualizado ainda"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-200 ring-2 ring-amber-400/40 animate-ping shrink-0" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-200 shrink-0" />
                  <span className="hidden sm:inline">Pendente</span>
                </div>
              )}
              <span className="shrink-0 font-mono text-[10px] opacity-80">{formatSecs(currentTime)} / {formatSecs(duration || 0)}</span>
            </div>
          </div>

          {/* BARRA DE PROGRESSO DO ÁUDIO */}
          <div className="relative flex items-center">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              step="0.1"
              className={`w-full h-2 rounded-lg appearance-none cursor-pointer bg-black/20 dark:bg-white/20 ${
                isVisualized ? 'accent-sky-400' : 'accent-amber-400'
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const ChatCommunityView: React.FC<ChatCommunityViewProps> = ({
  channels = DEFAULT_CHURCH_CHANNELS,
  messages = [],
  user,
  onSendMessage,
  onListenMessage,
  onBatchListenMessages,
  onDeleteMessage,
  onDeleteMessageForMe,
  onDeleteMessageForEveryone,
  onClearChannel,
  onClearAllMessages,
  onOpenMural,
  darkMode,
  onNavigateHome
}) => {
  const safeChannels = Array.isArray(channels) && channels.length > 0 ? channels : DEFAULT_CHURCH_CHANNELS;
  const [activeChannelId, setActiveChannelId] = useState<string>(safeChannels[0]?.id || 'c_geral');
  const [inputText, setInputText] = useState('');
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [selectedMsgToDelete, setSelectedMsgToDelete] = useState<ChatMessage | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Estados Dedicados para Envio de Vídeos no Chat (Arquivos até 300MB e Links)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoLinkUrl, setVideoLinkUrl] = useState('');
  const [videoTitleText, setVideoTitleText] = useState('');
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);

  // Gravação de Vídeo
  const [isVideoRecOpen, setIsVideoRecOpen] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [videoRecSeconds, setVideoRecSeconds] = useState(0);
  const [isUploadingVideoRec, setIsUploadingVideoRec] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoTimerRef = useRef<any>(null);

  // Modal Google Meet
  const [isMeetModalOpen, setIsMeetModalOpen] = useState(false);
  const [customMeetUrl, setCustomMeetUrl] = useState('');

  // Modais de exclusão
  const [confirmClearAllModalOpen, setConfirmClearAllModalOpen] = useState(false);
  const [confirmClearChannelModalOpen, setConfirmClearChannelModalOpen] = useState(false);

  const [mySentMsgIds, setMySentMsgIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ad_my_sent_msg_ids');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const checkIsMessageAuthor = (m: ChatMessage | null | undefined) => {
    if (!m) return false;
    if (mySentMsgIds.includes(m.id)) return true;

    const deviceId = getOrCreateDeviceId().toLowerCase().trim();
    const senderDevId = (m.senderDeviceId || '').toLowerCase().trim();
    if (senderDevId && senderDevId === deviceId) return true;

    const myUserId = (user?.id || '').toLowerCase().trim();
    const msgSenderId = (m.senderId || '').toLowerCase().trim();
    if (myUserId && msgSenderId && msgSenderId === myUserId) return true;

    const myEmail = (user?.email || '').toLowerCase().trim();
    const msgSenderEmail = (m.senderEmail || '').toLowerCase().trim();
    if (myEmail && msgSenderEmail && msgSenderEmail === myEmail) return true;

    return false;
  };

  const trackSentMessage = (msg: ChatMessage) => {
    setMySentMsgIds(prev => {
      const updated = [...prev, msg.id];
      try { localStorage.setItem('ad_my_sent_msg_ids', JSON.stringify(updated)); } catch(e){}
      return updated;
    });
  };

  const [audioError, setAudioError] = useState<string | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<any>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const mediaFileInputRef = useRef<HTMLInputElement | null>(null);

  const isAdmin = Boolean(
    user?.isAdmin || 
    (user?.email && user.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) || 
    user?.role === 'ADMIN' ||
    user?.role === 'PASTOR'
  );

  const activeChannel = safeChannels.find(c => c.id === activeChannelId) || safeChannels[0];
  const rawChannelMessages = (messages || []).filter(m => m && m.channelId === activeChannelId && !m.deletedForSelf);
  const channelMessages = searchQuery.trim() 
    ? rawChannelMessages.filter(m => (m.text || '').toLowerCase().includes(searchQuery.toLowerCase()) || (m.senderName || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : rawChannelMessages;

  // ENVIO DE MENSAGEM DE TEXTO
  const handleSend = () => {
    if (!inputText.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      channelId: activeChannelId,
      senderId: user.id || 'usr_enf',
      senderName: user.name || 'Profissional de Enfermagem',
      senderEmail: user.email,
      senderRole: user.specialty || (user.coren ? `COREN ${user.coren}` : 'Enfermeiro(a)'),
      senderDeviceId: getOrCreateDeviceId(),
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isRead: false
    };

    trackSentMessage(newMsg);
    if (onSendMessage) {
      onSendMessage(newMsg);
    }
    setInputText('');
  };

  // ENVIO DE ÁUDIO GRAVADO VIA MICROFONE OU ARQUIVO
  const startAudioRecording = async () => {
    setAudioError(null);
    try {
      let stream: MediaStream | null = null;

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } else {
        const legacyGUM = (navigator as any).getUserMedia ||
                          (navigator as any).webkitGetUserMedia ||
                          (navigator as any).mozGetUserMedia ||
                          (navigator as any).msGetUserMedia;
        if (legacyGUM) {
          stream = await new Promise<MediaStream>((resolve, reject) => {
            legacyGUM.call(navigator, { audio: true }, resolve, reject);
          });
        }
      }

      if (!stream) {
        throw new Error("O microfone não foi encontrado ou não é suportado pelo seu navegador.");
      }

      audioStreamRef.current = stream;

      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        const candidateTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4',
          'audio/aac',
          'audio/ogg;codecs=opus',
          'audio/ogg',
          'audio/wav'
        ];
        for (const cand of candidateTypes) {
          try {
            if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(cand)) {
              mimeType = cand;
              break;
            }
          } catch (e) {}
        }
      }

      let recorder: MediaRecorder;
      try {
        recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      } catch (e) {
        recorder = new MediaRecorder(stream);
      }

      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        setIsUploadingAudio(true);
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(track => track.stop());
          audioStreamRef.current = null;
        }

        const finalMime = recorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(chunks, { type: finalMime });

        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          const now = new Date();
          const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

          const audioMsg: ChatMessage = {
            id: `msg_audio_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            channelId: activeChannelId,
            senderId: user.id || 'usr_membro',
            senderName: user.name || 'Membro da Igreja',
            senderEmail: user.email,
            senderRole: user.specialty || (isAdmin ? 'Pastor Presidente' : 'Membro'),
            senderDeviceId: getOrCreateDeviceId(),
            text: '🎙️ [Mensagem de Áudio da Igreja]',
            audioUrl: base64Audio,
            timestamp: timeStr,
            isRead: false,
            listenedBy: []
          };

          trackSentMessage(audioMsg);
          if (onSendMessage) {
            onSendMessage(audioMsg);
          }
          setIsUploadingAudio(false);
        };
        reader.readAsDataURL(audioBlob);
      };

      try {
        recorder.start(500);
      } catch (e) {
        recorder.start();
      }

      recorderRef.current = recorder;
      setMediaRecorder(recorder);
      setIsRecordingAudio(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev >= 179) {
            stopAudioRecording();
            return 180;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err: any) {
      console.warn("Erro ao iniciar gravação de áudio pelo microfone:", err);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
      setIsRecordingAudio(false);
      const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      setAudioError(
        isDenied
          ? "Permissão de microfone negada. Autorize o microfone nas configurações do navegador ou envie um áudio gravado pelo botão de anexo."
          : "Não foi possível acessar o microfone neste momento. Você pode anexar um áudio gravado no seu celular/computador."
      );
    }
  };

  const stopAudioRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch (e) {}
    }
    setIsRecordingAudio(false);
    setRecordingSeconds(0);
  };

  const cancelAudioRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.ondataavailable = null;
      recorderRef.current.onstop = null;
      try {
        recorderRef.current.stop();
      } catch (e) {}
    }
    setIsRecordingAudio(false);
    setRecordingSeconds(0);
  };

  // UPLOAD DE ARQUIVO DE ÁUDIO PRÉ-GRAVADO
  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioError(null);
    setIsUploadingAudio(true);
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const reader = new FileReader();
    reader.onload = () => {
      const base64Audio = reader.result as string;
      const audioMsg: ChatMessage = {
        id: `msg_audio_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        channelId: activeChannelId,
        senderId: user.id || 'usr_enf',
        senderName: user.name || 'Profissional de Enfermagem',
        senderEmail: user.email,
        senderRole: user.specialty || (user.coren ? `COREN ${user.coren}` : 'Enfermeiro(a)'),
        senderDeviceId: getOrCreateDeviceId(),
        text: `🎙️ [Áudio de Passagem de Plantão: ${file.name}]`,
        audioUrl: base64Audio,
        timestamp: timeStr,
        isRead: false,
        listenedBy: []
      };

      trackSentMessage(audioMsg);
      if (onSendMessage) {
        onSendMessage(audioMsg);
      }
      setIsUploadingAudio(false);
      if (audioFileInputRef.current) audioFileInputRef.current.value = '';
    };

    reader.onerror = () => {
      setIsUploadingAudio(false);
      setAudioError("Não foi possível carregar o arquivo de áudio.");
    };

    reader.readAsDataURL(file);
  };

  // UPLOAD DE FOTOS E VÍDEOS
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMedia(true);
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    try {
      let finalMediaUrl = '';
      if (file.type.startsWith('video')) {
        finalMediaUrl = await uploadVideoWithProgress(file, () => {});
      } else {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload-media', {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.url) {
            finalMediaUrl = data.url;
          }
        }
      }

      if (finalMediaUrl) {
        const mediaMsg: ChatMessage = {
          id: `msg_media_${Date.now()}`,
          channelId: activeChannelId,
          senderId: user.id || 'usr_enf',
          senderName: user.name || 'Profissional de Enfermagem',
          senderEmail: user.email,
          senderRole: user.specialty || (user.coren ? `COREN ${user.coren}` : 'Enfermeiro(a)'),
          senderDeviceId: getOrCreateDeviceId(),
          text: file.type.startsWith('video') ? '📹 [Vídeo / Procedimento]' : '📷 [Foto / Exame]',
          mediaUrl: finalMediaUrl,
          timestamp: timeStr,
          isRead: true
        };

        trackSentMessage(mediaMsg);
        if (onSendMessage) {
          onSendMessage(mediaMsg);
        }
      }
    } catch (e) {
      console.error("Erro no upload de mídia:", e);
    } finally {
      setIsUploadingMedia(false);
      if (mediaFileInputRef.current) mediaFileInputRef.current.value = '';
    }
  };

  // UPLOAD DEDICADO DE VÍDEO NO CHAT (COM PROGRESSO EM PEDAÇOS / CHUNKS ATÉ 300MB)
  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingVideo(true);
    setVideoUploadProgress(5);
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const cleanTitle = videoTitleText.trim() || file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");

    try {
      const finalVideoUrl = await uploadVideoWithProgress(file, (pct) => {
        setVideoUploadProgress(pct);
      });

      if (finalVideoUrl) {
        const videoMsg: ChatMessage = {
          id: `msg_video_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          channelId: activeChannelId,
          senderId: user.id || 'usr_enf',
          senderName: user.name || 'Profissional de Enfermagem',
          senderEmail: user.email,
          senderRole: user.specialty || (user.coren ? `COREN ${user.coren}` : 'Enfermeiro(a)'),
          senderDeviceId: getOrCreateDeviceId(),
          text: `📹 [Vídeo do Plantão: ${cleanTitle}]`,
          mediaUrl: finalVideoUrl,
          timestamp: timeStr,
          isRead: true
        };

        trackSentMessage(videoMsg);
        if (onSendMessage) {
          onSendMessage(videoMsg);
        }
        setIsVideoModalOpen(false);
        setVideoTitleText('');
      }
    } catch (err: any) {
      console.error("Erro ao enviar vídeo no chat:", err);
      alert(err?.message || "Não foi possível concluir o envio do vídeo. Tente novamente.");
    } finally {
      setIsUploadingVideo(false);
      setVideoUploadProgress(0);
      if (videoFileInputRef.current) videoFileInputRef.current.value = '';
    }
  };

  // POSTAGEM DE LINK DE VÍDEO / YOUTUBE NO CHAT
  const handlePostVideoLink = () => {
    if (!videoLinkUrl.trim()) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const cleanTitle = videoTitleText.trim() || 'Vídeo / Procedimento Clínico';

    const videoMsg: ChatMessage = {
      id: `msg_video_link_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      channelId: activeChannelId,
      senderId: user.id || 'usr_enf',
      senderName: user.name || 'Profissional de Enfermagem',
      senderEmail: user.email,
      senderRole: user.specialty || (user.coren ? `COREN ${user.coren}` : 'Enfermeiro(a)'),
      senderDeviceId: getOrCreateDeviceId(),
      text: `📹 [Vídeo do Plantão: ${cleanTitle}]`,
      mediaUrl: videoLinkUrl.trim(),
      timestamp: timeStr,
      isRead: true
    };

    trackSentMessage(videoMsg);
    if (onSendMessage) {
      onSendMessage(videoMsg);
    }

    setIsVideoModalOpen(false);
    setVideoLinkUrl('');
    setVideoTitleText('');
  };

  // REUNIÃO GOOGLE MEET / SALA CLÍNICA ONLINE
  const createGoogleMeetCall = (targetUrl?: string) => {
    const meetUrl = targetUrl && targetUrl.trim() ? targetUrl.trim() : 'https://meet.google.com/new';
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const meetMsg: ChatMessage = {
      id: `msg_meet_${Date.now()}`,
      channelId: activeChannelId,
      senderId: user.id || 'usr_enf',
      senderName: user.name || 'Enfermagem',
      senderEmail: user.email,
      senderRole: user.specialty || 'Enfermeiro(a)',
      senderDeviceId: getOrCreateDeviceId(),
      text: `🩺 [SALA CLÍNICA & PASSAGEM ONLINE] ${user.name || 'Enfermeiro'} abriu uma Sala Virtual no Google Meet para alinhamento e passagem de plantão. Clique para entrar!`,
      mediaUrl: meetUrl,
      timestamp: timeStr,
      isRead: false
    };

    trackSentMessage(meetMsg);
    if (onSendMessage) onSendMessage(meetMsg);
    setIsMeetModalOpen(false);
    setCustomMeetUrl('');
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-2 sm:px-4 py-2 animate-fade-in">
      {/* CABEÇALHO DO CHAT DO PLANTÃO */}
      <div className={`p-4 sm:p-5 rounded-3xl border shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
        darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 border-emerald-700 text-white shadow-emerald-950/20'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 font-black shrink-0 shadow-md">
            <MessageSquare size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Chat da Equipe & Passagem de Plantão
              </h2>
              <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black rounded-full uppercase">
                Plantão Ativo
              </span>
            </div>
            <p className="text-xs text-emerald-100/90 font-medium">
              Meu Plantão PRO • Comunicação Segura da Equipe de Enfermagem & Multidisciplinar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => setIsVideoModalOpen(true)}
            className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Video size={15} />
            <span>Vídeo / Procedimento</span>
          </button>

          <button
            onClick={() => setIsMeetModalOpen(true)}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Users size={15} />
            <span>Sala Meet</span>
          </button>

          {onOpenMural && (
            <button
              onClick={onOpenMural}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Camera size={15} />
              <span>Fotos & Exames</span>
            </button>
          )}

          {isAdmin && onClearAllMessages && (
            <button
              onClick={() => setConfirmClearAllModalOpen(true)}
              className="p-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 rounded-xl text-xs transition-all shrink-0 cursor-pointer"
              title="Limpar Todo o Chat (Admin Master)"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* GRID DE CANAIS E MENSAGENS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* COLUNA ESQUERDA: LISTA DE CANAIS DO PLANTÃO */}
        <div className="lg:col-span-4 space-y-3">
          <div className={`p-4 rounded-3xl border shadow-sm ${
            darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <MessageSquare size={14} /> Canais & Setores do Hospital
              </h3>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                {safeChannels.length} Salas
              </span>
            </div>

            <div className="space-y-1.5">
              {safeChannels.map(channel => {
                const isActive = channel.id === activeChannelId;
                return (
                  <button
                    key={channel.id}
                    onClick={() => setActiveChannelId(channel.id)}
                    className={`w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between cursor-pointer ${
                      isActive 
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-600/20 font-black' 
                        : darkMode 
                          ? 'hover:bg-slate-800 text-slate-300' 
                          : 'hover:bg-emerald-50 text-slate-700'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold truncate">{channel.name}</p>
                      <p className={`text-[10px] truncate ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                        {channel.lastMessage || 'Toque para abrir a conversa'}
                      </p>
                    </div>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-emerald-300 shrink-0 animate-ping" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: JANELA DE MENSAGENS DO CANAL ATIVO */}
        <div className="lg:col-span-8 space-y-3">
          <div className={`p-4 sm:p-5 rounded-3xl border shadow-sm flex flex-col h-[600px] ${
            darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            {/* TOPO DO CANAL ATIVO */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black flex items-center justify-center text-xs shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                    {activeChannel.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium truncate">
                    Comunicação Clínica & Passagem de Turno • Equipe de Enfermagem
                  </p>
                </div>
              </div>

              {/* BUSCA DE MENSAGENS NO CANAL */}
              <div className="relative shrink-0 max-w-[140px] sm:max-w-[200px]">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar mensagens..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none"
                />
              </div>
            </div>

            {/* LISTA DE MENSAGENS COM SCROLL */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
              {channelMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <MessageSquare size={24} />
                  </div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Nenhuma mensagem neste canal ainda.
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-xs">
                    Envie alertas clínicos, pendências de medicação, áudios de passagem de plantão ou orientações da equipe abaixo!
                  </p>
                </div>
              ) : (
                channelMessages.map(m => {
                  const isMe = checkIsMessageAuthor(m);

                  if (m.text && (m.text.includes('[SALA CLÍNICA') || m.text.includes('[SALA DE ORAÇÃO'))) {
                    return (
                      <div key={m.id} className="flex justify-center my-2 animate-fade-in w-full">
                        <div className="p-4 rounded-2xl w-full max-w-md shadow-lg border border-emerald-400/40 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                                <Video size={20} />
                              </div>
                              <div>
                                <h4 className="font-black text-xs uppercase tracking-tight text-emerald-300">
                                  🩺 Sala Clínica Google Meet
                                </h4>
                                <p className="text-[10px] text-slate-300 font-medium">Iniciada por {m.senderName} • {m.timestamp}</p>
                              </div>
                            </div>
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-black border border-emerald-500/30 animate-pulse">AO VIVO</span>
                          </div>

                          <p className="text-xs font-medium text-slate-100 leading-relaxed">
                            {m.text}
                          </p>

                          <div className="flex items-center gap-2 pt-1">
                            <a
                              href={m.mediaUrl || 'https://meet.google.com/new'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                            >
                              <ExternalLink size={16} />
                              <span>ENTRAR NA SALA CLÍNICA AGORA</span>
                            </a>

                            {isAdmin && (
                              <button
                                onClick={() => setSelectedMsgToDelete(m)}
                                className="p-2.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl transition-all cursor-pointer"
                                title="Excluir convite"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={m.id} 
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group my-1`}
                    >
                      <div className={`relative max-w-[85%] sm:max-w-[80%] p-3.5 rounded-2xl text-xs space-y-1.5 transition-all shadow-sm ${
                        isMe 
                          ? 'bg-gradient-to-r from-emerald-700 to-teal-700 text-white rounded-tr-none border border-emerald-500/30' 
                          : darkMode 
                            ? 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700' 
                            : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'
                      }`}>
                        <div className={`flex items-center justify-between gap-3 text-[9px] font-bold opacity-80 pb-1 border-b ${
                          isMe ? 'border-white/20' : 'border-slate-200 dark:border-slate-700'
                        }`}>
                          <span className="truncate max-w-[140px] flex items-center gap-1">
                            <span>{m.senderName}</span>
                            {m.senderRole && (
                              <span className="text-[8px] opacity-75 font-normal">({m.senderRole})</span>
                            )}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span>{m.timestamp}</span>
                            {m.audioUrl && (
                              <span 
                                className={`w-2 h-2 rounded-full inline-block ${
                                  ((m.listenedBy && m.listenedBy.length > 0) || m.isRead) 
                                    ? 'bg-sky-400 ring-1 ring-sky-300 shadow-sm' 
                                    : 'bg-amber-400 ring-1 ring-amber-300 animate-pulse'
                                }`} 
                                title={((m.listenedBy && m.listenedBy.length > 0) || m.isRead) ? "Áudio ouvido por membro da equipe (Azul)" : "Áudio pendente (Amarelo)"}
                              />
                            )}
                            <button
                              onClick={() => setSelectedMsgToDelete(m)}
                              className="p-0.5 rounded hover:text-rose-400 transition-colors opacity-70 hover:opacity-100 cursor-pointer"
                              title="Opções da mensagem"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>

                        {/* TEXTO DA MENSAGEM */}
                        {Boolean(
                          m.text && 
                          m.text.trim() && 
                          !m.text.startsWith('🎙️ [Mensagem de Áudio') &&
                          !m.text.startsWith('📹 [Vídeo') &&
                          !m.text.startsWith('📷 [Foto')
                        ) && (
                          <p className="font-medium whitespace-pre-wrap leading-relaxed">{m.text}</p>
                        )}

                        {/* MÍDIA: VÍDEO OU FOTO */}
                        {m.mediaUrl && (
                          <div className="mt-2 pt-1 border-t border-white/10 dark:border-slate-700 space-y-1">
                            {/* É VÍDEO (ARQUIVO LOCAL, BASE64 OU YOUTUBE) */}
                            {Boolean(
                              m.mediaUrl.startsWith('data:video') || 
                              m.mediaUrl.match(/\.(mp4|webm|mov|mkv|avi)(\?.*)?$/i) ||
                              m.text.startsWith('📹 [Vídeo') ||
                              getYouTubeEmbedUrl(m.mediaUrl)
                            ) ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-[11px] font-black text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-xl">
                                  <span className="flex items-center gap-1.5 truncate">
                                    <Video size={13} className="shrink-0" />
                                    <span className="truncate">
                                      {m.text.startsWith('📹 [Vídeo') 
                                        ? m.text.replace(/^📹 \[Vídeo da Igreja:\s*/, '').replace(/^📹 \[Vídeo do Plantão:\s*/, '').replace(/\]$/, '') 
                                        : 'Vídeo do Plantão'}
                                    </span>
                                  </span>
                                  {m.mediaUrl.startsWith('http') && !getYouTubeEmbedUrl(m.mediaUrl) && (
                                    <a
                                      href={m.mediaUrl}
                                      download="video-plantao.mp4"
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1 text-slate-300 hover:text-white transition-colors"
                                      title="Baixar Vídeo"
                                    >
                                      <Download size={13} />
                                    </a>
                                  )}
                                </div>

                                {getYouTubeEmbedUrl(m.mediaUrl) ? (
                                  <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-md bg-black">
                                    <iframe
                                      src={getYouTubeEmbedUrl(m.mediaUrl)!}
                                      title="Vídeo do Plantão"
                                      className="w-full h-full border-0"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                    />
                                  </div>
                                ) : (
                                  <video 
                                    src={m.mediaUrl} 
                                    controls 
                                    playsInline
                                    className="w-full max-w-[320px] max-h-[240px] rounded-xl shadow-md bg-black" 
                                  />
                                )}
                              </div>
                            ) : (
                              <img 
                                src={m.mediaUrl} 
                                alt="Foto do Plantão / Exame" 
                                className="w-full max-w-[280px] max-h-[220px] rounded-xl shadow-md object-cover bg-slate-900 cursor-pointer" 
                              />
                            )}
                          </div>
                        )}

                        {/* ÁUDIO GRAVADO */}
                        {m.audioUrl && (
                          <AudioMessagePlayer message={m} user={user} isMe={isMe} onListenMessage={onListenMessage} darkMode={darkMode} />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* BARRA INFERIOR DE ENVIO DE MENSAGENS */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 shrink-0">
              {/* Notificação / Banner de upload de vídeo no chat */}
              {isUploadingVideo && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold text-emerald-700 dark:text-emerald-300 animate-slide-up">
                  <div className="flex items-center gap-2 min-w-0">
                    <Loader2 size={16} className="shrink-0 animate-spin text-emerald-600 dark:text-emerald-400" />
                    <span className="truncate">Publicando vídeo no chat: {videoUploadProgress}%...</span>
                  </div>
                  <div className="w-24 bg-emerald-200 dark:bg-emerald-900/40 rounded-full h-2 overflow-hidden shrink-0">
                    <div 
                      className="bg-emerald-500 h-2 transition-all duration-300 rounded-full" 
                      style={{ width: `${videoUploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Notificação / Banner de erro de áudio se houver */}
              {audioError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center justify-between gap-2 text-xs font-bold text-rose-700 dark:text-rose-300 animate-slide-up">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertCircle size={16} className="shrink-0 text-rose-600" />
                    <span className="truncate">{audioError}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => audioFileInputRef.current?.click()}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase transition-all"
                    >
                      Enviar Arquivo de Áudio
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudioError(null)}
                      className="p-1 hover:bg-rose-200 dark:hover:bg-rose-900 rounded-lg text-rose-600 dark:text-rose-400"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

              {isRecordingAudio ? (
                <div className="p-3.5 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 text-white rounded-2xl flex items-center justify-between shadow-lg shadow-rose-900/20 animate-fade-in">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-white"></span>
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs font-black uppercase tracking-wide">Gravando Áudio de Passagem de Plantão...</span>
                      <span className="text-[11px] font-mono font-bold text-rose-100">
                        {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')} / 3:00
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={cancelAudioRecording}
                      className="px-3 py-1.5 bg-black/30 hover:bg-black/50 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={stopAudioRecording}
                      className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-rose-700 font-black rounded-xl text-xs shadow-md transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                    >
                      <Send size={13} />
                      <span>Concluir & Enviar</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={mediaFileInputRef}
                    onChange={handleMediaUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  <input
                    type="file"
                    ref={videoFileInputRef}
                    onChange={handleVideoFileUpload}
                    accept="video/*,.mp4,.mov,.webm,.avi,.mkv,.m4v"
                    className="hidden"
                  />

                  <input
                    type="file"
                    ref={audioFileInputRef}
                    onChange={handleAudioFileUpload}
                    accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac,.opus,.m4r"
                    className="hidden"
                  />

                  {/* BOTÃO POSTAR VÍDEO DEDICADO */}
                  <button
                    type="button"
                    onClick={() => setIsVideoModalOpen(true)}
                    disabled={isUploadingVideo}
                    className="p-3 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                    title="Postar Vídeo / Treinamento no Chat"
                  >
                    <Video size={18} />
                  </button>

                  {/* BOTÃO FOTO */}
                  <button
                    type="button"
                    onClick={() => mediaFileInputRef.current?.click()}
                    disabled={isUploadingMedia}
                    className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                    title="Anexar Foto de Exame / Curativo"
                  >
                    <Camera size={18} />
                  </button>

                  {/* BOTÃO MICROFONE ÁUDIO */}
                  <button
                    type="button"
                    onClick={startAudioRecording}
                    disabled={isUploadingAudio}
                    className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                    title="Gravar Áudio de Passagem de Plantão"
                  >
                    {isUploadingAudio ? (
                      <Loader2 size={18} className="animate-spin text-emerald-600" />
                    ) : (
                      <Mic size={18} />
                    )}
                  </button>

                  {/* BOTÃO ARQUIVO DE ÁUDIO */}
                  <button
                    type="button"
                    onClick={() => audioFileInputRef.current?.click()}
                    disabled={isUploadingAudio}
                    className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all cursor-pointer shrink-0 disabled:opacity-50 hidden sm:flex"
                    title="Anexar Arquivo de Áudio / Mensagem de Voz"
                  >
                    <Music size={18} />
                  </button>

                  <input
                    type="text"
                    placeholder={`Escreva sua mensagem em ${activeChannel.name}...`}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    className="flex-1 p-3 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />

                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!inputText.trim()}
                    className="p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition-all shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-40 disabled:scale-100 cursor-pointer shrink-0"
                    title="Enviar Mensagem"
                  >
                    <Send size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO: EXCLUIR MENSAGEM */}
      {selectedMsgToDelete && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md p-4 flex items-center justify-center animate-fade-in">
          <div className={`w-full max-w-sm p-6 rounded-3xl border shadow-2xl space-y-4 ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between">
              <h4 className="font-black text-sm text-rose-500 flex items-center gap-2">
                <Trash2 size={18} /> Excluir Mensagem
              </h4>
              <button onClick={() => setSelectedMsgToDelete(null)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Escolha como deseja remover esta mensagem:
            </p>

            <div className="space-y-2">
              <button
                onClick={() => {
                  if (onDeleteMessageForEveryone) {
                    onDeleteMessageForEveryone(selectedMsgToDelete.id);
                  } else if (onDeleteMessage) {
                    onDeleteMessage(selectedMsgToDelete.id);
                  }
                  setSelectedMsgToDelete(null);
                }}
                className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Trash2 size={16} /> Apagar Para Todos
              </button>

              <button
                onClick={() => {
                  if (onDeleteMessageForMe) {
                    onDeleteMessageForMe(selectedMsgToDelete.id);
                  }
                  setSelectedMsgToDelete(null);
                }}
                className="w-full py-2.5 px-4 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-2xl text-xs transition-all cursor-pointer"
              >
                Apagar Apenas Para Mim
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL SALA CLÍNICA GOOGLE MEET */}
      {isMeetModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md p-4 flex items-center justify-center animate-fade-in">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between">
              <h4 className="font-black text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <Video size={20} /> Sala Clínica & Passagem de Plantão Online
              </h4>
              <button onClick={() => setIsMeetModalOpen(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Inicie uma reunião ao vivo no Google Meet para passagem de plantão multiprofissional, discussão de casos clínicos e alinhamento de condutas.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Link Personalizado do Meet (Opcional):
                </label>
                <input
                  type="url"
                  placeholder="Ex: https://meet.google.com/abc-defg-hij"
                  value={customMeetUrl}
                  onChange={(e) => setCustomMeetUrl(e.target.value)}
                  className="w-full p-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <button
                onClick={() => createGoogleMeetCall(customMeetUrl)}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Video size={16} /> Criar e Enviar Convite no Chat
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL CONFIRMAÇÃO: LIMPAR TODAS AS MENSAGENS */}
      {confirmClearAllModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md p-4 flex items-center justify-center animate-fade-in">
          <div className={`w-full max-w-sm p-6 rounded-3xl border shadow-2xl space-y-4 ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h4 className="font-black text-sm text-rose-500 flex items-center gap-2">
              <Trash2 size={18} /> Limpar Todas as Mensagens
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Deseja realmente apagar todas as mensagens do chat de plantão?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (onClearAllMessages) onClearAllMessages();
                  setConfirmClearAllModalOpen(false);
                }}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs cursor-pointer"
              >
                Confirmar
              </button>
              <button
                onClick={() => setConfirmClearAllModalOpen(false)}
                className="flex-1 py-3 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-2xl text-xs cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL POSTAGEM DE VÍDEO NO CHAT */}
      {isVideoModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md p-4 flex items-center justify-center animate-fade-in">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between">
              <h4 className="font-black text-base text-emerald-500 flex items-center gap-2">
                <Video size={20} /> Postar Vídeo / Procedimento Clínico
              </h4>
              <button 
                onClick={() => {
                  setIsVideoModalOpen(false);
                  setVideoLinkUrl('');
                  setVideoTitleText('');
                }} 
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Compartilhe orientações de procedimentos, vídeos de treinamento ou passagens gravadas no canal <strong className="text-emerald-500">{activeChannel.name}</strong>.
            </p>

            <div className="space-y-3">
              {/* Título do Vídeo */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Título ou Descrição do Vídeo (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ex: Treinamento Bomba de Infusão ou Orientação de Protocolo"
                  value={videoTitleText}
                  onChange={(e) => setVideoTitleText(e.target.value)}
                  className="w-full p-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              {/* OPÇÃO 1: ARQUIVO DE VÍDEO DO CELULAR OU PC */}
              <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Film size={14} /> Arquivo de Vídeo (até 500MB)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-500 rounded-full">
                    Qualquer Duração
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => videoFileInputRef.current?.click()}
                  disabled={isUploadingVideo}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isUploadingVideo ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Enviando Vídeo ({videoUploadProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      <span>Selecionar Vídeo do Celular / Computador (500MB)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ChatCommunityView;
