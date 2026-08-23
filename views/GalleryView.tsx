import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GalleryItem, UserRole } from '../types';
import { 
  Plus, Image as ImageIcon, ChevronLeft, User, Calendar, Upload, X, 
  Download, Loader2, Send, Trash2, Maximize2, ZoomIn, ZoomOut, Check
} from 'lucide-react';
import { 
  savePhotoBlobLocally, 
  getAllPhotoRecordsLocally, 
  deletePhotoBlobLocally 
} from '../utils/galleryStorage';
import { 
  syncDocToFirestore, 
  deleteDocFromFirestore, 
  fetchCollectionFromFirestore, 
  subscribeToCollection 
} from '../utils/clientFirebase';
import { 
  initDeletedIdsSync, 
  isGalleryDeleted, 
  markGalleryDeleted, 
  filterActiveGallery 
} from '../utils/deletedSync';

interface GalleryProps { 
  items: GalleryItem[]; 
  setItems: React.Dispatch<React.SetStateAction<GalleryItem[]>>; 
  role: UserRole;
  onBack: () => void; 
}

const GalleryView: React.FC<GalleryProps> = ({ items, setItems, role, onBack }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [localPhotoBlobs, setLocalPhotoBlobs] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado para Visualizador em Tela Cheia
  const [fullscreenPhoto, setFullscreenPhoto] = useState<{ url: string; title: string; author: string; timestamp: number } | null>(null);

  // Estado para Modal de Confirmação de Exclusão (Excluir para mim ou para todos)
  const [photoToDelete, setPhotoToDelete] = useState<GalleryItem | null>(null);

  // Lista de IDs excluídos apenas localmente ("Excluir para mim")
  const [hiddenLocalIds, setHiddenLocalIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ad_hidden_gallery_ids');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // 1. CARREGAMENTO INICIAL: Restaura do IndexedDB, Firestore e Servidor
  useEffect(() => {
    // 0. Sincroniza lista central de IDs excluídos
    initDeletedIdsSync().then(() => {
      setItems(prev => filterActiveGallery(prev));
    });

    // 1. Carrega todas as fotos do IndexedDB (armazenamento de alta capacidade local)
    getAllPhotoRecordsLocally().then(async records => {
      if (Array.isArray(records) && records.length > 0) {
        const blobsMap: Record<string, string> = {};
        const localItems: GalleryItem[] = [];

        for (const r of records) {
          if (r && r.id) {
            if (isGalleryDeleted(r.id)) {
              await deletePhotoBlobLocally(r.id).catch(() => {});
            } else {
              if (r.dataUrl) blobsMap[r.id] = r.dataUrl;
              localItems.push({
                id: r.id,
                title: r.title || 'Foto da Igreja',
                author: r.author || 'Membro da Igreja',
                url: r.dataUrl || '',
                type: 'image',
                timestamp: r.timestamp || r.createdAt || Date.now()
              });
            }
          }
        }

        setLocalPhotoBlobs(prev => ({ ...prev, ...blobsMap }));

        // Mescla com os itens atuais
        setItems(prev => {
          const map = new Map<string, GalleryItem>();
          prev.forEach(item => {
            if (item && item.id && !isGalleryDeleted(item.id)) {
              map.set(item.id, item);
            }
          });
          localItems.forEach(item => {
            const existing = map.get(item.id);
            const preservedUrl = (item.url && item.url.length > 10) ? item.url : (existing?.url || '');
            map.set(item.id, {
              ...existing,
              ...item,
              url: preservedUrl
            });
          });
          return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
        });
      }
    });

    // 2. Busca da API do Servidor Node.js
    fetch('/api/gallery')
      .then(res => res.json())
      .then(serverGallery => {
        if (Array.isArray(serverGallery) && serverGallery.length > 0) {
          setItems(prev => {
            const map = new Map<string, GalleryItem>();
            prev.forEach(item => {
              if (item && item.id && !isGalleryDeleted(item.id)) {
                map.set(item.id, item);
              }
            });
            serverGallery.forEach((item: any) => {
              if (item && item.id && !isGalleryDeleted(item.id)) {
                const existing = map.get(item.id);
                const preservedUrl = (item.url && item.url.length > 10) ? item.url : (existing?.url || '');
                map.set(item.id, {
                  id: item.id,
                  title: item.title || existing?.title || 'Foto da Igreja',
                  author: item.author || existing?.author || 'Membro da Igreja',
                  type: 'image',
                  url: preservedUrl,
                  timestamp: item.timestamp || existing?.timestamp || Date.now()
                });
              }
            });
            return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
          });
        }
      })
      .catch(() => {});

    // 3. Ouve em tempo real / sincroniza com o Firestore na Nuvem
    const unsubscribe = subscribeToCollection<GalleryItem>('gallery', (remoteItems) => {
      if (Array.isArray(remoteItems) && remoteItems.length > 0) {
        setItems(prev => {
          const map = new Map<string, GalleryItem>();
          prev.forEach(item => {
            if (item && item.id && !isGalleryDeleted(item.id)) {
              map.set(item.id, item);
            }
          });
          remoteItems.forEach(item => {
            if (item && item.id && !isGalleryDeleted(item.id)) {
              const existing = map.get(item.id);
              const preservedUrl = (item.url && item.url.length > 10) ? item.url : (existing?.url || '');
              map.set(item.id, {
                id: item.id,
                title: item.title || existing?.title || 'Foto da Igreja',
                author: item.author || existing?.author || 'Membro da Igreja',
                type: 'image',
                url: preservedUrl,
                timestamp: item.timestamp || existing?.timestamp || Date.now()
              });
            }
          });
          return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
        });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 200 * 1024 * 1024) {
        alert("Arquivo muito grande! Tente uma foto menor que 200MB.");
        return;
      }
      setIsProcessing(true);

      const reader = new FileReader();
      reader.onloadend = () => {
        const rawBase64 = reader.result as string;
        
        // Comprime a imagem mantendo excelente definição (máx 1280px e JPEG 0.80)
        // Isso reduz fotos de celular de 10MB para ~140KB, garantindo que o Firestore e todos os celulares salvem com 100% de sucesso
        const img = new Image();
        img.onload = () => {
          const maxDim = 1280;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.80);
            setSelectedMedia(optimizedBase64);
          } else {
            setSelectedMedia(rawBase64);
          }
          setIsProcessing(false);
        };
        img.onerror = () => {
          setSelectedMedia(rawBase64);
          setIsProcessing(false);
        };
        img.src = rawBase64;
      };
      reader.onerror = () => {
        alert("Erro ao ler a foto.");
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdd = async () => {
    if(!title.trim()) return alert("Por favor, insira um título para a foto.");
    if(!selectedMedia) return alert("Por favor, selecione uma foto do seu dispositivo.");
    
    const itemId = `gal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const finalTitle = title.trim();
    const finalAuthor = author.trim() || "Membro da Igreja";
    const now = Date.now();

    // 1. Salva a foto COMPLETA com metadados no IndexedDB
    await savePhotoBlobLocally(itemId, selectedMedia, finalTitle, finalAuthor, now);
    setLocalPhotoBlobs(prev => ({ ...prev, [itemId]: selectedMedia }));

    const newItem: GalleryItem = { 
      id: itemId, 
      title: finalTitle, 
      url: selectedMedia, 
      type: 'image',
      author: finalAuthor, 
      timestamp: now 
    };

    // 2. Atualiza estado React imediatamente
    setItems(prev => [newItem, ...prev.filter(i => i.id !== itemId)]);
    setShowAdd(false); 
    setTitle(''); 
    setAuthor(''); 
    setSelectedMedia(null);

    // 3. Sincroniza com Firestore na Nuvem (com a foto completa em Base64 de alta resolução)
    syncDocToFirestore('gallery', itemId, {
      id: itemId,
      title: newItem.title,
      type: 'image',
      author: newItem.author,
      timestamp: newItem.timestamp,
      url: selectedMedia
    }).catch((err) => {
      console.error("Erro ao sincronizar foto com Firestore:", err);
    });

    // 4. Salva no servidor se disponível
    try {
      fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      })
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.item && data.item.url) {
          // Salva url do servidor se fornecida
          setItems(prev => prev.map(i => i.id === itemId ? { ...i, url: data.item.url } : i));
          syncDocToFirestore('gallery', itemId, {
            id: itemId,
            title: newItem.title,
            type: 'image',
            author: newItem.author,
            timestamp: newItem.timestamp,
            url: data.item.url
          }).catch(() => {});
        }
      })
      .catch(() => {});
    } catch(e) {}
  };

  // EXCLUIR APENAS PARA MIM (oculta no dispositivo e limpa cache local)
  const handleDeleteForMe = async (item: GalleryItem) => {
    const updatedHidden = [...new Set([...hiddenLocalIds, item.id])];
    setHiddenLocalIds(updatedHidden);
    localStorage.setItem('ad_hidden_gallery_ids', JSON.stringify(updatedHidden));

    setItems(prev => prev.filter(i => i.id !== item.id));
    setLocalPhotoBlobs(prev => {
      const copy = { ...prev };
      delete copy[item.id];
      return copy;
    });
    await deletePhotoBlobLocally(item.id);
    setPhotoToDelete(null);
  };

  // EXCLUIR PARA TODOS (apaga do Firestore, servidor e IndexedDB local)
  const handleDeleteForAll = async (item: GalleryItem) => {
    setItems(prev => prev.filter(i => i.id !== item.id));
    setLocalPhotoBlobs(prev => {
      const copy = { ...prev };
      delete copy[item.id];
      return copy;
    });
    setPhotoToDelete(null);
    await markGalleryDeleted(item.id);
  };

  const handleDownload = (url: string, title: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_').toLowerCase()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtra itens ocultados apenas localmente
  const displayedItems = items.filter(item => !hiddenLocalIds.includes(item.id));

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto animate-slide-up">
      <header className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm active:scale-95 transition-transform cursor-pointer"
          >
            <ChevronLeft size={20} className="text-slate-700 dark:text-zinc-300"/>
          </button>
          <div className="flex flex-col">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
              Galeria de Fotos
            </h2>
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              Momentos da Assembleia de Deus ({displayedItems.length} {displayedItems.length === 1 ? 'Foto' : 'Fotos'})
            </span>
          </div>
        </div>
        <button 
          onClick={() => setShowAdd(true)} 
          className="bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-2xl shadow-lg shadow-blue-600/30 active:scale-95 transition-all flex items-center gap-1.5 font-black text-xs uppercase cursor-pointer"
        >
          <Plus size={18}/>
          <span className="hidden sm:inline">Nova Foto</span>
        </button>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {displayedItems.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-zinc-800 text-slate-400 font-bold flex flex-col items-center gap-3">
            <ImageIcon size={48} className="opacity-30" />
            <span className="uppercase tracking-wider text-xs">Nenhuma foto na galeria ainda</span>
            <p className="text-[11px] font-normal text-slate-500">Toque no botão azul "+" acima para registrar a primeira foto da igreja!</p>
          </div>
        ) : displayedItems.map(item => {
          // Obtém a foto do estado do item ou do mapa do IndexedDB
          const resolvedMediaUrl = item.url || localPhotoBlobs[item.id] || '';

          return (
            <div 
              key={item.id} 
              className="border border-slate-200 dark:border-zinc-800 rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm transition-all"
            >
              {/* ÁREA DA FOTO COM CLIQUE PARA TELA CHEIA */}
              <div 
                className="relative aspect-video overflow-hidden bg-slate-950 flex items-center justify-center cursor-pointer group"
                onClick={() => {
                  if (resolvedMediaUrl) {
                    setFullscreenPhoto({
                      url: resolvedMediaUrl,
                      title: item.title,
                      author: item.author,
                      timestamp: item.timestamp
                    });
                  }
                }}
              >
                {resolvedMediaUrl ? (
                  <img 
                    src={resolvedMediaUrl} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    alt={item.title} 
                    loading="lazy"
                  />
                ) : (
                  <div className="text-slate-400 text-xs font-bold flex flex-col items-center gap-2">
                    <ImageIcon size={32} className="opacity-40" />
                    <span>Carregando foto...</span>
                  </div>
                )}
                
                {/* Tag de Foto */}
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 border border-white/20">
                  <ImageIcon size={12}/>
                  <span>Foto</span>
                </div>

                {/* Botão de Tela Cheia sobre a imagem */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (resolvedMediaUrl) {
                      setFullscreenPhoto({
                        url: resolvedMediaUrl,
                        title: item.title,
                        author: item.author,
                        timestamp: item.timestamp
                      });
                    }
                  }}
                  className="absolute bottom-3 left-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-md transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase border border-white/20 cursor-pointer"
                  title="Ver em Tela Cheia"
                >
                  <Maximize2 size={13} />
                  <span>Tela Cheia</span>
                </button>

                {/* Botão de Excluir */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPhotoToDelete(item);
                  }}
                  className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-rose-600 text-white rounded-full backdrop-blur-md transition-colors active:scale-90 cursor-pointer border border-white/20"
                  title="Opções de Excluir Foto"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="p-4 sm:p-5 flex justify-between items-center gap-4">
                <div className="flex-1 space-y-1">
                  <h4 className="font-black text-lg text-slate-800 dark:text-zinc-100 uppercase tracking-tight leading-snug">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-3 text-[10px] font-bold uppercase text-slate-400 dark:text-zinc-500">
                    <span className="flex items-center gap-1"><User size={12}/> {item.author}</span>
                    <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(item.timestamp).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Botão Ver em Tela Cheia */}
                  {resolvedMediaUrl && (
                    <button 
                      onClick={() => setFullscreenPhoto({
                        url: resolvedMediaUrl,
                        title: item.title,
                        author: item.author,
                        timestamp: item.timestamp
                      })}
                      className="p-3 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-2xl hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all active:scale-90 shadow-sm border border-slate-200 dark:border-zinc-700 cursor-pointer"
                      title="Abrir em Tela Cheia"
                    >
                      <Maximize2 size={18} />
                    </button>
                  )}

                  {/* Botão Baixar Foto */}
                  {resolvedMediaUrl && (
                    <button 
                      onClick={() => handleDownload(resolvedMediaUrl, item.title)}
                      className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl hover:bg-blue-600 hover:text-white transition-all active:scale-90 shadow-sm border border-blue-100 dark:border-blue-900 cursor-pointer"
                      title="Baixar Foto"
                    >
                      <Download size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL VISUALIZADOR DE FOTO (FUNDO PRETO DO TAMANHO DA IMAGEM) */}
      {fullscreenPhoto && typeof document !== 'undefined' && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            zIndex: 999999,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
            boxSizing: 'border-box'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setFullscreenPhoto(null);
          }}
        >
          {/* Card com fundo escuro que se molda exatamente ao tamanho da foto */}
          <div 
            style={{
              width: 'fit-content',
              maxWidth: '94vw',
              maxHeight: '90vh',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column'
            }}
            className="bg-black rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Barra Superior Integrada à Foto */}
            <div className="flex items-center justify-between p-3 sm:p-4 bg-zinc-950/95 border-b border-zinc-800/80 gap-3 z-10 shrink-0">
              <div className="flex flex-col text-white min-w-0 pr-2">
                <h3 className="font-black text-sm sm:text-base uppercase tracking-tight truncate max-w-[200px] sm:max-w-xs">
                  {fullscreenPhoto.title}
                </h3>
                <div className="flex items-center gap-2 text-[10px] sm:text-xs text-zinc-400 font-bold uppercase mt-0.5 truncate">
                  <span>{fullscreenPhoto.author}</span>
                  <span>•</span>
                  <span>{new Date(fullscreenPhoto.timestamp).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={() => handleDownload(fullscreenPhoto.url, fullscreenPhoto.title)}
                  className="p-2 sm:p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 rounded-xl transition-colors cursor-pointer border border-zinc-700/60 flex items-center gap-1.5 text-xs font-bold active:scale-95"
                  title="Baixar Imagem"
                >
                  <Download size={15} />
                  <span className="hidden sm:inline">Baixar</span>
                </button>
                <button 
                  onClick={() => setFullscreenPhoto(null)}
                  className="p-2 sm:p-2.5 bg-zinc-900 hover:bg-rose-600 text-zinc-300 hover:text-white rounded-xl transition-colors cursor-pointer border border-zinc-700/60 active:scale-95"
                  title="Fechar"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Imagem Centralizada com Fundo Preto Justo ao Tamanho da Foto */}
            <div className="relative bg-black flex items-center justify-center p-1 sm:p-2 select-none overflow-hidden">
              <img 
                src={fullscreenPhoto.url} 
                alt={fullscreenPhoto.title} 
                style={{ maxHeight: '62vh', maxWidth: '88vw' }}
                className="w-auto h-auto object-contain rounded-xl block mx-auto shadow-md" 
              />
            </div>

            {/* Rodapé Integrado */}
            <div className="p-2.5 sm:p-3 bg-zinc-950/95 border-t border-zinc-800/80 flex items-center justify-between gap-3 text-[11px] font-bold text-zinc-400 shrink-0">
              <span className="truncate text-[10px] sm:text-xs">Assembleia de Deus Nacional</span>
              <button
                onClick={() => setFullscreenPhoto(null)}
                className="text-blue-400 hover:text-blue-300 text-[11px] font-black uppercase cursor-pointer"
              >
                Fechar Foto
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: EXCLUIR PARA MIM OU PARA TODOS - 100% CENTRALIZADO NO CENTRO DA TELA NO CELULAR E PC */}
      {photoToDelete && typeof document !== 'undefined' && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            zIndex: 999999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPhotoToDelete(null);
          }}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '360px',
              maxHeight: '90vh',
              overflowY: 'auto',
              margin: '0 auto'
            }}
            className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-zinc-800 space-y-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 size={20} />
                <h3 className="font-black text-base uppercase">Excluir Foto</h3>
              </div>
              <button 
                onClick={() => setPhotoToDelete(null)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-300 font-medium">
              Como você deseja apagar a foto <strong className="text-slate-900 dark:text-white">"{photoToDelete.title}"</strong>?
            </p>

            <div className="space-y-2.5 pt-1">
              {/* Opção 1: Excluir para Mim */}
              <button
                onClick={() => handleDeleteForMe(photoToDelete)}
                className="w-full p-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-100 rounded-2xl font-bold text-xs uppercase flex items-center justify-between transition-all active:scale-98 cursor-pointer"
              >
                <div className="text-left">
                  <p className="font-black">Excluir para Mim</p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-normal lowercase">Apaga apenas deste aparelho</p>
                </div>
                <User size={16} className="text-slate-400" />
              </button>

              {/* Opção 2: Excluir para Todos */}
              <button
                onClick={() => handleDeleteForAll(photoToDelete)}
                className="w-full p-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold text-xs uppercase flex items-center justify-between shadow-lg shadow-rose-600/30 transition-all active:scale-98 cursor-pointer"
              >
                <div className="text-left">
                  <p className="font-black">Excluir para Todos</p>
                  <p className="text-[10px] text-rose-100 font-normal lowercase">Remove da nuvem e de todos os membros</p>
                </div>
                <Trash2 size={16} />
              </button>

              {/* Cancelar */}
              <button
                onClick={() => setPhotoToDelete(null)}
                className="w-full py-2.5 text-center text-slate-400 hover:text-slate-600 font-bold text-xs uppercase cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL EXCLUSIVO PARA PUBLICAR FOTO */}
      {showAdd && typeof document !== 'undefined' && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            zIndex: 999999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAdd(false);
          }}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '440px',
              maxHeight: '90vh',
              margin: '0 auto'
            }}
            className="bg-white dark:bg-zinc-900 flex flex-col rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
                  <ImageIcon size={18} />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Publicar Foto na Galeria
                </h3>
              </div>
              <button 
                onClick={() => setShowAdd(false)} 
                className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18}/>
              </button>
            </div>

            <div className="space-y-4 py-3 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-3">
                <div 
                  onClick={() => !isProcessing && fileInputRef.current?.click()} 
                  className="w-full aspect-video max-h-52 bg-slate-50 dark:bg-zinc-800/50 border-2 border-dashed border-slate-300 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors relative"
                >
                  {isProcessing ? (
                    <Loader2 className="animate-spin text-blue-600" />
                  ) : selectedMedia ? (
                    <img src={selectedMedia} className="w-full h-full object-cover" alt="Prévia da foto" />
                  ) : (
                    <>
                      <Upload className="text-blue-600 mb-2" size={32}/>
                      <span className="text-xs font-black text-slate-700 dark:text-zinc-200 uppercase text-center px-4">
                        Toque aqui para escolher a Foto do seu celular
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold mt-1">PNG, JPG, JPEG</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Título da Foto</label>
                  <input 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="Ex: Culto de Celebração de Domingo" 
                    className="w-full p-3.5 bg-slate-50 dark:bg-zinc-800 rounded-2xl border border-slate-200 dark:border-zinc-700 outline-none font-bold text-slate-800 dark:text-zinc-100 text-sm" 
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Nome de Quem Postou</label>
                  <input 
                    value={author} 
                    onChange={(e) => setAuthor(e.target.value)} 
                    placeholder="Ex: Pr. Juscelino ou Diácono" 
                    className="w-full p-3.5 bg-slate-50 dark:bg-zinc-800 rounded-2xl border border-slate-200 dark:border-zinc-700 outline-none font-bold text-slate-800 dark:text-zinc-100 text-sm" 
                  />
                </div>
              </div>
            </div>
            
            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 shrink-0">
              <button 
                onClick={handleAdd} 
                disabled={isProcessing || !selectedMedia}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white w-full p-4 rounded-2xl font-black shadow-lg shadow-blue-600/30 transition-all active:scale-95 uppercase tracking-wider flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                {isProcessing ? 'Processando foto...' : (
                  <>
                    <Send size={18} />
                    <span>Publicar Foto na Galeria</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default GalleryView;
