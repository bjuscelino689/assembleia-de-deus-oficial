import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { VideoItem, UserRole } from '../types';
import { uploadVideoWithProgress } from '../utils/videoUploader';
import { resolveVideoPlaybackUrl, deleteVideoRecordLocally, findVideoRecord, getAllVideoRecordsLocally } from '../utils/videoStorage';
import { 
  Plus, ChevronLeft, User, Calendar, Upload, X, Film, 
  Download, Loader2, Play, AlertCircle, 
  Trash2, RefreshCw, Video, Camera, StopCircle, 
  RotateCcw, SwitchCamera, Check, Share2, Eye, Maximize2
} from 'lucide-react';
import { markVideoDeleted } from '../utils/deletedSync';

interface VideoProps { 
  items: VideoItem[]; 
  setItems?: React.Dispatch<React.SetStateAction<VideoItem[]>>; 
  onAddVideo?: (video: VideoItem) => Promise<void> | void;
  onDeleteVideo?: (videoId: string) => Promise<void> | void;
  role: UserRole;
  onBack: () => void; 
}

export const MAX_RECORDING_SECONDS = 300; // 5 minutos

function formatBytes(bytes?: number) {
  if (!bytes || bytes === 0) return '';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Player de Vídeo Ultra-Resiliente com Multi-Camadas de Resolução (IndexedDB Blob + Server Stream + Cache)
const SafeVideoPlayer: React.FC<{ 
  src: string; 
  title: string; 
  id?: string;
  onExpand?: () => void;
}> = ({ src, title, id, onExpand }) => {
  const [resolvedSrc, setResolvedSrc] = useState<string>(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const triedBlobFallbackRef = useRef(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setHasError(false);
    triedBlobFallbackRef.current = false;

    resolveVideoPlaybackUrl(id, src).then((url) => {
      if (active) {
        if (url) {
          setResolvedSrc(url);
        } else {
          setResolvedSrc(src);
        }
        setIsLoading(false);
      }
    }).catch(() => {
      if (active) {
        setResolvedSrc(src);
        setIsLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [id, src, reloadKey]);

  // Se a tag <video> falhar no carregamento da URL remota, tenta puxar do IndexedDB local como fallback de emergência
  const handleVideoError = async () => {
    if (!triedBlobFallbackRef.current && id) {
      triedBlobFallbackRef.current = true;
      try {
        const localRec = await findVideoRecord(id);
        if (localRec?.blob) {
          const freshBlobUrl = URL.createObjectURL(localRec.blob);
          setResolvedSrc(freshBlobUrl);
          setHasError(false);
          setIsLoading(false);
          if (videoRef.current) {
            videoRef.current.load();
          }
          return;
        }
      } catch (e) {}
    }

    setIsLoading(false);
    setHasError(true);
  };

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    triedBlobFallbackRef.current = false;
    setReloadKey(k => k + 1);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  return (
    <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden rounded-2xl shadow-inner group">
      {isLoading && (
        <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-2">
          <Loader2 size={28} className="animate-spin text-purple-400" />
          <span className="text-xs font-bold text-zinc-300">Carregando vídeo...</span>
        </div>
      )}

      {hasError ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-white p-5 text-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <AlertCircle size={26} />
          </div>
          <div>
            <p className="font-black text-sm text-zinc-200">Falha ao reproduzir o vídeo</p>
            <p className="text-xs text-zinc-400 mt-0.5">O arquivo pode estar sincronizando ou a conexão oscilou.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-center mt-1">
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-app-purple hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-md cursor-pointer"
            >
              <RefreshCw size={13} /> Recarregar
            </button>
            <a
              href={resolvedSrc || src}
              download={`${title || 'video'}.mp4`}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-md cursor-pointer"
            >
              <Download size={13} /> Baixar
            </a>
          </div>
        </div>
      ) : (
        <>
          <video 
            key={`${resolvedSrc}_${reloadKey}`}
            ref={videoRef}
            src={resolvedSrc} 
            controls 
            preload="metadata"
            playsInline
            onLoadedData={() => setIsLoading(false)}
            onCanPlay={() => setIsLoading(false)}
            onError={handleVideoError}
            className="w-full h-full object-contain bg-black" 
          />
          {onExpand && (
            <button
              onClick={onExpand}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 backdrop-blur-sm"
              title="Expandir Vídeo"
            >
              <Maximize2 size={16} />
            </button>
          )}
        </>
      )}
    </div>
  );
};

const VideosView: React.FC<VideoProps> = ({ 
  items, 
  setItems, 
  onAddVideo, 
  onDeleteVideo, 
  role, 
  onBack 
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [uploadMode, setUploadMode] = useState<'record' | 'file'>('record');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [selectedFileObj, setSelectedFileObj] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activePlaybackVideo, setActivePlaybackVideo] = useState<VideoItem | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Exclusão Segura
  const [videoToDelete, setVideoToDelete] = useState<VideoItem | null>(null);
  const [hiddenLocalVideoIds, setHiddenLocalVideoIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ad_hidden_video_ids');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // ESTADOS DA CÂMERA DO APP
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedPreviewUrl, setRecordedPreviewUrl] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // Inicia ou desliga a câmera conforme o modal
  useEffect(() => {
    if (showAdd && uploadMode === 'record' && !recordedBlob && !isProcessing) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [showAdd, uploadMode, facingMode, recordedBlob]);

  const startCamera = async () => {
    stopCamera();
    setCameraPermissionError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        },
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.play().catch(e => console.warn("Aviso ao iniciar câmera:", e));
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Erro ao acessar câmera:", err);
      setCameraPermissionError(
        "Permissão da câmera ou microfone negada. Verifique as configurações do seu navegador ou selecione um vídeo da galeria usando a opção 'Arquivo da Galeria'."
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch (e) {}
      });
      mediaStreamRef.current = null;
    }
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const handleFlipCamera = () => {
    if (isRecording) return;
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleStartRecording = () => {
    if (!mediaStreamRef.current) {
      setErrorMessage("Câmera não conectada. Tente recarregar a tela.");
      return;
    }

    recordedChunksRef.current = [];
    setErrorMessage(null);

    try {
      let mimeType = 'video/mp4';
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a')) {
        mimeType = 'video/mp4;codecs=avc1,mp4a';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264,opus')) {
        mimeType = 'video/webm;codecs=h264,opus';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
        mimeType = 'video/webm;codecs=vp8,opus';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
      }

      const recorder = new MediaRecorder(mediaStreamRef.current, {
        mimeType,
        videoBitsPerSecond: 2000000
      });

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(recordedChunksRef.current, { type: mimeType });
        setRecordedBlob(fullBlob);
        const url = URL.createObjectURL(fullBlob);
        setRecordedPreviewUrl(url);
        stopCamera();
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setIsRecording(true);
      setRecordingSeconds(0);

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          const nextSec = prev + 1;
          if (nextSec >= MAX_RECORDING_SECONDS) {
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
            return MAX_RECORDING_SECONDS;
          }
          return nextSec;
        });
      }, 1000);
    } catch (err: any) {
      console.error("Erro ao iniciar gravação de vídeo:", err);
      setErrorMessage("Não foi possível iniciar o gravador de vídeo.");
    }
  };

  const handleStopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleRetake = () => {
    if (recordedPreviewUrl) {
      try { URL.revokeObjectURL(recordedPreviewUrl); } catch (e) {}
    }
    setRecordedBlob(null);
    setRecordedPreviewUrl(null);
    setRecordingSeconds(0);
    setErrorMessage(null);
    startCamera();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024 * 1024) {
        setErrorMessage(`O arquivo selecionado tem ${(file.size / (1024 * 1024)).toFixed(1)}MB, excedendo a capacidade máxima de 500MB.`);
        return;
      }
      setErrorMessage(null);
      setSelectedFileObj(file);
      if (!title.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    }
  };

  const handleAdd = async () => {
    setErrorMessage(null);
    let fileToUpload: File | Blob | null = null;
    let videoTitle = title.trim();
    const videoAuthor = author.trim() || (role === 'pastor' ? 'Pastor Presidente' : 'Membro da Igreja');

    if (uploadMode === 'record') {
      if (!recordedBlob) {
        setErrorMessage("Por favor, grave um vídeo usando a câmera ou selecione um arquivo da galeria.");
        return;
      }
      fileToUpload = recordedBlob;
      if (!videoTitle) {
        const now = new Date();
        videoTitle = `Mensagem em Vídeo (${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})`;
      }
    } else {
      if (!selectedFileObj) {
        setErrorMessage("Por favor, selecione um arquivo de vídeo do seu dispositivo.");
        return;
      }
      fileToUpload = selectedFileObj;
      if (!videoTitle) {
        videoTitle = selectedFileObj.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      }
    }

    setIsProcessing(true);
    setUploadProgress(1);

    // GERA O ID ÚNICO ANTECIPADAMENTE PARA GARANTIR CONSISTÊNCIA ENTRE INDEXEDDB, FIRESTORE E SERVER
    const fixedVideoId = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let uploadResult: { videoId: string; playbackUrl: string; serverUrl?: string };

    try {
      uploadResult = await uploadVideoWithProgress(
        fileToUpload, 
        videoTitle, 
        videoAuthor, 
        (pct) => setUploadProgress(pct),
        fixedVideoId
      );
    } catch (err: any) {
      console.error("Erro no upload do vídeo:", err);
      setIsProcessing(false);
      setErrorMessage(err.message || "Erro ao salvar o vídeo. Tente novamente.");
      return;
    }

    const finalPlaybackUrl = uploadResult.playbackUrl || uploadResult.serverUrl || `idb://${fixedVideoId}`;

    const newItem: VideoItem = {
      id: fixedVideoId,
      title: videoTitle,
      videoUrl: finalPlaybackUrl,
      author: videoAuthor,
      timestamp: Date.now()
    };

    // Atualiza imediatamente na lista visual
    if (setItems) {
      setItems(prev => [newItem, ...prev.filter(v => v.id !== newItem.id)]);
    }

    if (onAddVideo) {
      try {
        await onAddVideo(newItem);
      } catch (e) {
        console.warn("Aviso ao sincronizar vídeo com App:", e);
      }
    }

    // Limpeza de estados
    setIsProcessing(false);
    setShowAdd(false);
    setTitle('');
    setAuthor('');
    setSelectedFileObj(null);
    setRecordedBlob(null);
    if (recordedPreviewUrl) {
      try { URL.revokeObjectURL(recordedPreviewUrl); } catch (e) {}
    }
    setRecordedPreviewUrl(null);
    setUploadProgress(0);
    stopCamera();
  };

  const remove = async (id: string) => {
    await deleteVideoRecordLocally(id);
    if (onDeleteVideo) {
      await onDeleteVideo(id);
    } else if (setItems) {
      setItems(prev => prev.filter(i => i.id !== id));
      await markVideoDeleted(id);
    }
  };

  const handleDeleteForMe = (video: VideoItem) => {
    const next = [...hiddenLocalVideoIds, video.id];
    setHiddenLocalVideoIds(next);
    try {
      localStorage.setItem('ad_hidden_video_ids', JSON.stringify(next));
    } catch (e) {}
    setVideoToDelete(null);
  };

  const handleDeleteForAll = async (video: VideoItem) => {
    setVideoToDelete(null);
    await remove(video.id);
  };

  const handleManualSync = async () => {
    setIsRefreshing(true);
    try {
      const localRecords = await getAllVideoRecordsLocally();
      if (setItems && Array.isArray(localRecords) && localRecords.length > 0) {
        setItems(prev => {
          const map = new Map<string, VideoItem>();
          prev.forEach(v => { if (v && v.id) map.set(v.id, v); });
          localRecords.forEach(r => {
            if (r && r.id) {
              const existing = map.get(r.id);
              map.set(r.id, {
                id: r.id,
                title: r.title || existing?.title || 'Vídeo da Igreja',
                author: r.author || existing?.author || 'Pastor / Membro',
                videoUrl: r.serverUrl || existing?.videoUrl || `idb://${r.id}`,
                timestamp: r.timestamp || existing?.timestamp || Date.now()
              });
            }
          });
          return Array.from(map.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        });
      }

      const res = await fetch('/api/videos').catch(() => null);
      if (res && res.ok) {
        const sVideos = await res.json();
        if (setItems && Array.isArray(sVideos)) {
          setItems(prev => {
            const map = new Map<string, VideoItem>();
            prev.forEach(v => { if (v && v.id) map.set(v.id, v); });
            sVideos.forEach((v: any) => {
              if (v && v.id) {
                const existing = map.get(v.id);
                map.set(v.id, {
                  ...existing,
                  ...v,
                  videoUrl: v.videoUrl || existing?.videoUrl || ''
                });
              }
            });
            return Array.from(map.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          });
        }
      }
    } catch (e) {
      console.warn("Aviso na sincronização manual de vídeos:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filtragem dos vídeos visíveis (sem os excluídos)
  const visibleVideos = items.filter(v => v && v.id && !hiddenLocalVideoIds.includes(v.id));

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* CABEÇALHO */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-[2rem] border border-slate-100 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-300 transition-all active:scale-95 cursor-pointer"
            title="Voltar ao Início"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-app-purple">
              Galeria Audiovisual
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Film className="text-app-purple" size={24} /> Vídeos & Pregações
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualSync}
            disabled={isRefreshing}
            className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            title="Atualizar e Sincronizar Vídeos"
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin text-app-purple" : ""} />
          </button>

          <button 
            onClick={() => {
              setErrorMessage(null);
              setShowAdd(true);
            }}
            className="bg-app-purple hover:bg-purple-700 text-white font-black px-4 py-2.5 rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-app-purple/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={16} /> Publicar Vídeo
          </button>
        </div>
      </div>

      {/* LISTA DE VÍDEOS */}
      {visibleVideos.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-[2.5rem] p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-purple-50 dark:bg-purple-950/40 text-app-purple flex items-center justify-center mx-auto shadow-inner">
            <Film size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-800 dark:text-zinc-200">
              Nenhum vídeo publicado ainda
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
              Grave uma mensagem em vídeo usando a câmera do app ou envie pregações e cultos da galeria do seu celular.
            </p>
          </div>
          <button 
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 bg-app-purple hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider px-5 py-3 rounded-2xl shadow-lg shadow-app-purple/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={16} /> Gravar ou Enviar Vídeo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleVideos.map((item) => (
            <div 
              key={item.id}
              className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-all group"
            >
              {/* PLAYER DE VÍDEO SEGURO COM FALLBACK RESILIENTE */}
              <div className="p-3">
                <SafeVideoPlayer 
                  src={item.videoUrl} 
                  title={item.title} 
                  id={item.id}
                  onExpand={() => setActivePlaybackVideo(item)}
                />
              </div>

              {/* DETALHES DO VÍDEO */}
              <div className="p-4 sm:p-5 pt-0 space-y-3">
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white leading-snug line-clamp-2">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-zinc-400 mt-2 font-semibold flex-wrap">
                    <span className="flex items-center gap-1">
                      <User size={13} className="text-app-purple" /> {item.author || 'Pastor / Membro'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={13} /> {new Date(item.timestamp).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* AÇÕES */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActivePlaybackVideo(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-app-purple rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                    >
                      <Play size={13} /> Assistir
                    </button>
                    <a
                      href={item.videoUrl}
                      download={`${item.title || 'video'}.mp4`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                    >
                      <Download size={13} /> Baixar
                    </a>
                  </div>

                  <button
                    onClick={() => setVideoToDelete(item)}
                    className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                    title="Excluir Vídeo"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE PLAYER EXPANDIDO (TELA CHEIA / CINEMA) */}
      {activePlaybackVideo && createPortal(
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950/60">
              <div>
                <h3 className="font-black text-base sm:text-lg text-white line-clamp-1">
                  {activePlaybackVideo.title}
                </h3>
                <p className="text-xs text-zinc-400">
                  {activePlaybackVideo.author || 'Pastor / Membro'} • {new Date(activePlaybackVideo.timestamp).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <button
                onClick={() => setActivePlaybackVideo(null)}
                className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-3 sm:p-4 flex-1 flex items-center justify-center bg-black">
              <div className="w-full max-w-3xl">
                <SafeVideoPlayer
                  src={activePlaybackVideo.videoUrl}
                  title={activePlaybackVideo.title}
                  id={activePlaybackVideo.id}
                />
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
              <a
                href={activePlaybackVideo.videoUrl}
                download={`${activePlaybackVideo.title || 'video'}.mp4`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95"
              >
                <Download size={15} /> Baixar no Celular
              </a>
              <button
                onClick={() => setActivePlaybackVideo(null)}
                className="px-4 py-2 bg-app-purple hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL DE ADICIONAR / GRAVAR VÍDEO */}
      {showAdd && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-[2.5rem] p-5 sm:p-7 max-w-lg w-full space-y-5 shadow-2xl animate-slide-up my-auto max-h-[92vh] overflow-y-auto">
            
            {/* CABEÇALHO DO MODAL */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-app-purple flex items-center justify-center">
                  <Film size={20} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Publicar Novo Vídeo
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Grave pela câmera do app ou selecione da galeria
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  if (isRecording) handleStopRecording();
                  stopCamera();
                  setShowAdd(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 flex items-center justify-center transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* ABAS: GRAVAR CÂMERA OU IMPORTAR ARQUIVO */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-zinc-800/70 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  if (isRecording) handleStopRecording();
                  setUploadMode('record');
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  uploadMode === 'record'
                    ? 'bg-white dark:bg-zinc-900 text-app-purple shadow-sm'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                }`}
              >
                <Camera size={15} /> Gravar na Câmera
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isRecording) handleStopRecording();
                  stopCamera();
                  setUploadMode('file');
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  uploadMode === 'file'
                    ? 'bg-white dark:bg-zinc-900 text-app-purple shadow-sm'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                }`}
              >
                <Upload size={15} /> Arquivo da Galeria
              </button>
            </div>

            {/* CONTEÚDO DA ABA: GRAVAR CÂMERA */}
            {uploadMode === 'record' && (
              <div className="space-y-4">
                {cameraPermissionError ? (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-xs text-rose-800 dark:text-rose-300 space-y-2">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertCircle size={16} /> Acesso à Câmera
                    </p>
                    <p>{cameraPermissionError}</p>
                    <button
                      type="button"
                      onClick={() => setUploadMode('file')}
                      className="mt-2 w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl uppercase tracking-wider text-xs cursor-pointer"
                    >
                      Escolher Vídeo da Galeria
                    </button>
                  </div>
                ) : recordedPreviewUrl ? (
                  /* PRÉ-VISUALIZAÇÃO DO VÍDEO GRAVADO */
                  <div className="space-y-3">
                    <div className="aspect-video bg-black rounded-2xl overflow-hidden relative shadow-inner">
                      <video 
                        src={recordedPreviewUrl} 
                        controls 
                        playsInline
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 p-3 rounded-2xl text-xs">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <Check size={16} /> Vídeo gravado com sucesso ({formatTime(recordingSeconds)})
                      </span>
                      <button
                        type="button"
                        onClick={handleRetake}
                        className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-black hover:underline cursor-pointer"
                      >
                        <RotateCcw size={13} /> Regravar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* TELA AO VIVO DA CÂMERA */
                  <div className="space-y-3">
                    <div className="aspect-video bg-black rounded-2xl overflow-hidden relative shadow-inner flex items-center justify-center">
                      <video 
                        ref={liveVideoRef}
                        playsInline
                        muted
                        autoPlay
                        className="w-full h-full object-cover mirror"
                      />
                      
                      {/* CRONÔMETRO DE GRAVAÇÃO */}
                      {isRecording && (
                        <div className="absolute top-3 left-3 bg-red-600/90 text-white px-3 py-1 rounded-full text-xs font-black tracking-wider flex items-center gap-2 animate-pulse shadow-md">
                          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                          REC {formatTime(recordingSeconds)} / 05:00
                        </div>
                      )}

                      {/* BOTÃO FLIP CÂMERA */}
                      {!isRecording && (
                        <button
                          type="button"
                          onClick={handleFlipCamera}
                          className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm transition-all cursor-pointer"
                          title="Alternar Câmera"
                        >
                          <SwitchCamera size={16} />
                        </button>
                      )}
                    </div>

                    {/* CONTROLES DE GRAVAÇÃO */}
                    <div className="flex items-center justify-center gap-3">
                      {!isRecording ? (
                        <button
                          type="button"
                          onClick={handleStartRecording}
                          className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 active:scale-95 transition-all cursor-pointer"
                        >
                          <span className="w-3 h-3 rounded-full bg-white animate-pulse" />
                          Iniciar Gravação
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleStopRecording}
                          className="w-full py-3.5 bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
                        >
                          <StopCircle size={18} className="text-red-500" />
                          Finalizar e Salvar Vídeo ({formatTime(recordingSeconds)})
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CONTEÚDO DA ABA: ARQUIVO DA GALERIA */}
            {uploadMode === 'file' && (
              <div className="space-y-3">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="video/mp4,video/quicktime,video/webm,video/3gpp,video/x-matroska,video/x-msvideo,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-purple-300 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 rounded-2xl p-6 text-center cursor-pointer hover:bg-purple-50 transition-all space-y-2"
                >
                  <div className="w-12 h-12 rounded-2xl bg-app-purple text-white flex items-center justify-center mx-auto shadow-md shadow-app-purple/20">
                    <Upload size={22} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-zinc-200">
                      {selectedFileObj ? selectedFileObj.name : "Clique para escolher vídeo da galeria"}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                      {selectedFileObj ? `Tamanho: ${formatBytes(selectedFileObj.size)}` : "Suporta MP4, MOV, WEBM, 3GP até 500MB"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* CAMPOS DE METADADOS */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1">
                  Título do Vídeo
                </label>
                <input 
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Mensagem de Domingo, Vigília, Estudo Bíblico..."
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-bold outline-none focus:border-app-purple"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1">
                  Ministrador / Autor
                </label>
                <input 
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder={role === 'pastor' ? 'Pastor Presidente' : 'Seu Nome / Departamento'}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-bold outline-none focus:border-app-purple"
                />
              </div>
            </div>

            {/* ERRO / PROGRESSO */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {isProcessing && (
              <div className="space-y-2 p-3.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 rounded-2xl">
                <div className="flex items-center justify-between text-xs font-black text-app-purple">
                  <span className="flex items-center gap-1.5">
                    <Loader2 size={14} className="animate-spin" /> Salvando vídeo e sincronizando...
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-purple-200 dark:bg-purple-900/60 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-app-purple h-full transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* BOTÃO FINAL DE PUBLICAÇÃO */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleAdd}
                disabled={isProcessing || isRecording || (uploadMode === 'record' && !recordedBlob) || (uploadMode === 'file' && !selectedFileObj)}
                className="w-full bg-app-purple hover:bg-purple-700 disabled:opacity-50 text-white font-black py-3.5 px-4 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-app-purple/20 transition-all active:scale-95 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Publicando Vídeo...
                  </>
                ) : (
                  <>
                    <Check size={16} /> Publicar Vídeo na Igreja
                  </>
                )}
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {videoToDelete && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-[2.5rem] p-6 max-w-sm w-full text-center space-y-4 shadow-2xl animate-slide-up">
            <div className="w-14 h-14 rounded-3xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto shadow-lg shadow-rose-600/10">
              <Trash2 size={26} />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Excluir Vídeo
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                "{videoToDelete.title}"
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleDeleteForMe(videoToDelete)}
                className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-bold py-3 rounded-2xl text-xs uppercase transition-all cursor-pointer"
              >
                Ocultar / Excluir Apenas para Mim
              </button>

              <button
                type="button"
                onClick={() => handleDeleteForAll(videoToDelete)}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black py-3 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-rose-600/20 active:scale-95 transition-all cursor-pointer"
              >
                Excluir Definitivamente para Todos
              </button>

              <button
                type="button"
                onClick={() => setVideoToDelete(null)}
                className="w-full text-slate-500 dark:text-zinc-500 font-bold py-2 text-xs hover:text-slate-800 dark:hover:text-zinc-300 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default VideosView;
