
import React, { useState } from 'react';
import { UserRole, Cult, Meeting, Festival, PrayerCampaign, PastoralVisit } from '../types';
import { Plus, Clock, Calendar as CalIcon, ChevronLeft, Star, Heart, Users, X, Info, ArrowRight, AlignLeft, CalendarDays, CheckCircle2, AlertCircle, MapPin, User, ShieldCheck, Trash2 } from 'lucide-react';
import SwipeableItem from '../SwipeableItem';
import { deleteDocFromFirestore } from '../firebase';

interface ScheduleProps {
  view: string; 
  role: UserRole;
  cults: Cult[]; 
  setCults: React.Dispatch<React.SetStateAction<Cult[]>>;
  meetings: Meeting[]; 
  setMeetings: React.Dispatch<React.SetStateAction<Meeting[]>>;
  pastoralVisits?: PastoralVisit[];
  setPastoralVisits?: React.Dispatch<React.SetStateAction<PastoralVisit[]>>;
  festivals: Festival[]; 
  setFestivals: React.Dispatch<React.SetStateAction<Festival[]>>;
  campaigns: PrayerCampaign[]; 
  setCampaigns: React.Dispatch<React.SetStateAction<PrayerCampaign[]>>;
  onBack: () => void;
}

const ScheduleView: React.FC<ScheduleProps> = ({ 
  view: initialView, 
  role, 
  cults, 
  setCults, 
  meetings, 
  setMeetings, 
  pastoralVisits = [],
  setPastoralVisits,
  festivals, 
  setFestivals, 
  campaigns, 
  setCampaigns, 
  onBack 
}) => {
  const [currentCategory, setCurrentCategory] = useState<string>(initialView);
  const [showAdd, setShowAdd] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; title: string; isCategory?: boolean } | null>(null);
  
  // Estados do Form
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [time, setTime] = useState('');
  const [desc, setDesc] = useState('');
  const [memberName, setMemberName] = useState('');
  const [address, setAddress] = useState('');

  const isAdmin = 
    role === UserRole.PASTOR || 
    role === UserRole.ADMIN || 
    (role as string) === 'pastor' || 
    (role as string) === 'admin' || 
    (role as string) === 'PASTOR' || 
    (role as string) === 'ADMIN_MASTER';
  
  const colors: Record<string, string> = { 
    cults: 'bg-app-green', 
    meetings: 'bg-app-blue', 
    visits: 'bg-app-purple',
    campaigns: 'bg-app-red',
    festivals: 'bg-app-yellow' 
  };

  const labels: Record<string, string> = { 
    cults: 'Cultos', 
    meetings: 'Reuniões', 
    visits: 'Visitas Pastorais',
    campaigns: 'Campanhas de Oração', 
    festivals: 'Eventos' 
  };

  const resetForm = () => {
    setTitle('');
    setDate('');
    setEndDate('');
    setTime('');
    setDesc('');
    setMemberName('');
    setAddress('');
    setShowAdd(false);
  };

  const handleAdd = () => {
    const id = Date.now().toString();

    if (currentCategory === 'visits') {
      if (!memberName.trim() || !date) {
        alert("Informe o nome do membro ou família e a data da visita.");
        return;
      }
      if (setPastoralVisits) {
        const newVisit: PastoralVisit = {
          id,
          memberName: memberName.trim(),
          date,
          time: time || '19:00',
          address: address.trim() || undefined,
          purpose: desc.trim() || 'Visita Pastoral de Oração e Fortalecimento',
          status: 'AGENDADA'
        };
        setPastoralVisits(prev => [newVisit, ...prev]);
      }
    } else if (currentCategory === 'campaigns') {
      const trimmedTitle = title.trim();
      if (!trimmedTitle || !date || !endDate) {
        alert("Informe o título e as datas de início e término.");
        return;
      }
      const newCampaign: PrayerCampaign = {
        id,
        title: trimmedTitle,
        startDate: date,
        endDate: endDate,
        reason: desc.trim() || "Propósito Geral de Clamor e Oração"
      };
      setCampaigns(prev => [newCampaign, ...prev]);
    } else {
      const trimmedTitle = title.trim();
      if (!trimmedTitle || !date) {
        alert("Informe o título e a data.");
        return;
      }
      const newItem = {
        id,
        title: trimmedTitle,
        date,
        time: time || '19:30',
        description: desc.trim()
      };
      if (currentCategory === 'cults') setCults(prev => [newItem as Cult, ...prev]);
      else if (currentCategory === 'meetings') setMeetings(prev => [newItem as Meeting, ...prev]);
      else if (currentCategory === 'festivals') setFestivals(prev => [newItem as Festival, ...prev]);
    }
    
    resetForm();
  };

  const getList = () => {
    if (currentCategory === 'cults') return Array.isArray(cults) ? cults : [];
    if (currentCategory === 'meetings') return Array.isArray(meetings) ? meetings : [];
    if (currentCategory === 'visits') return Array.isArray(pastoralVisits) ? pastoralVisits : [];
    if (currentCategory === 'festivals') return Array.isArray(festivals) ? festivals : [];
    return Array.isArray(campaigns) ? campaigns : [];
  };

  const remove = (id: string) => {
    if (currentCategory === 'cults') setCults(prev => prev.filter(i => i.id !== id));
    else if (currentCategory === 'meetings') setMeetings(prev => prev.filter(i => i.id !== id));
    else if (currentCategory === 'visits' && setPastoralVisits) setPastoralVisits(prev => prev.filter(i => i.id !== id));
    else if (currentCategory === 'festivals') setFestivals(prev => prev.filter(i => i.id !== id));
    else if (currentCategory === 'campaigns') setCampaigns(prev => prev.filter(i => i.id !== id));
  };

  // Helper robusto e seguro para converter strings de data sem nunca estourar RangeError
  const parseDateSafe = (dateStr?: string | null): Date | null => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const clean = dateStr.trim();
    if (!clean) return null;

    // Se for formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      const parts = clean.split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
      if (!isNaN(d.getTime())) return d;
    }

    // Se for formato DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
      const parts = clean.split('/').map(Number);
      const d = new Date(parts[2], parts[1] - 1, parts[0], 12, 0, 0);
      if (!isNaN(d.getTime())) return d;
    }

    // Se for formato DD/MM (ex: 15/11)
    if (/^\d{1,2}\/\d{1,2}$/.test(clean)) {
      const parts = clean.split('/').map(Number);
      const currentYear = new Date().getFullYear();
      const d = new Date(currentYear, parts[1] - 1, parts[0], 12, 0, 0);
      if (!isNaN(d.getTime())) return d;
    }

    // Tentativa padrão com tratamento de erro
    try {
      const d = new Date(clean);
      if (!isNaN(d.getTime())) return d;
    } catch (e) {}

    return null;
  };

  const getDayMonth = (dateStr?: string | null) => {
    if (!dateStr || typeof dateStr !== 'string') return { day: '--', month: 'AGENDA' };
    const clean = dateStr.trim();
    const lower = clean.toLowerCase();

    // Dias da semana recorrentes
    if (lower.includes('domingo')) return { day: 'DOM', month: 'SEMANAL' };
    if (lower.includes('segunda')) return { day: 'SEG', month: 'SEMANAL' };
    if (lower.includes('terça') || lower.includes('terca')) return { day: 'TER', month: 'SEMANAL' };
    if (lower.includes('quarta')) return { day: 'QUA', month: 'SEMANAL' };
    if (lower.includes('quinta')) return { day: 'QUI', month: 'SEMANAL' };
    if (lower.includes('sexta')) return { day: 'SEX', month: 'SEMANAL' };
    if (lower.includes('sábado') || lower.includes('sabado')) return { day: 'SÁB', month: 'SEMANAL' };

    // Formato dia/mês (ex: 15/11)
    if (/^\d{1,2}\/\d{1,2}$/.test(clean)) {
      const [d, m] = clean.split('/');
      const monthNames = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      const mIdx = parseInt(m, 10) - 1;
      const monthLabel = (mIdx >= 0 && mIdx < 12) ? monthNames[mIdx] : m;
      return {
        day: d.padStart(2, '0'),
        month: monthLabel
      };
    }

    const dateObj = parseDateSafe(clean);
    if (dateObj) {
      try {
        const monthFormatted = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(dateObj).replace('.', '').toUpperCase();
        return {
          day: dateObj.getDate().toString().padStart(2, '0'),
          month: monthFormatted || 'DATA'
        };
      } catch (e) {
        return {
          day: dateObj.getDate().toString().padStart(2, '0'),
          month: 'DATA'
        };
      }
    }

    // Texto livre (ex: "Primeiro Sábado do Mês")
    return {
      day: clean.length > 3 ? clean.substring(0, 3).toUpperCase() : clean.toUpperCase(),
      month: 'AGENDA'
    };
  };

  const formatShortDate = (dateStr?: string | null) => {
    if (!dateStr || typeof dateStr !== 'string') return '';
    const clean = dateStr.trim();
    const dateObj = parseDateSafe(clean);
    if (dateObj) {
      try {
        return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).format(dateObj);
      } catch (e) {
        return clean;
      }
    }
    return clean;
  };

  const formatFullDate = (dateStr?: string | null) => {
    if (!dateStr || typeof dateStr !== 'string') return '';
    const clean = dateStr.trim();
    const dateObj = parseDateSafe(clean);
    if (dateObj) {
      try {
        return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(dateObj);
      } catch (e) {
        return clean;
      }
    }
    return clean;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto animate-slide-up">
      {/* Cabeçalho */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm active:scale-90 transition-transform"><ChevronLeft/></button>
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{labels[currentCategory]}</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Agenda Oficial da Igreja</p>
          </div>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowAdd(true)} 
            className={`${colors[currentCategory]} text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-all`}
            title="Novo Agendamento Pastoral"
          >
            <Plus size={24}/>
          </button>
        )}
      </header>

      {/* Seletor de Categoria da Agenda */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto gap-1">
        <button 
          onClick={() => setCurrentCategory('cults')} 
          className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${currentCategory === 'cults' ? 'bg-app-green text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Cultos
        </button>
        <button 
          onClick={() => setCurrentCategory('meetings')} 
          className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${currentCategory === 'meetings' ? 'bg-app-blue text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Reuniões
        </button>
        <button 
          onClick={() => setCurrentCategory('visits')} 
          className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${currentCategory === 'visits' ? 'bg-app-purple text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Visitas Pastorais
        </button>
        <button 
          onClick={() => setCurrentCategory('campaigns')} 
          className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${currentCategory === 'campaigns' ? 'bg-app-red text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Campanhas
        </button>
        <button 
          onClick={() => setCurrentCategory('festivals')} 
          className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${currentCategory === 'festivals' ? 'bg-app-yellow text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Eventos
        </button>
      </div>

      {/* Aviso de Origem */}
      <div className="bg-slate-100/80 p-3 rounded-2xl border border-slate-200 text-[11px] font-bold text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-app-purple" />
          Agendamentos cadastrados exclusivamente pela liderança pastoral.
        </span>
      </div>

      {/* Lista de Eventos / Agendamentos */}
      <div className="space-y-4">
        {getList().length === 0 ? (
          <div className="text-center py-16 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 text-slate-300 font-black flex flex-col items-center gap-3">
            <CalIcon size={40} className="opacity-20 text-slate-400" />
            <span className="uppercase tracking-widest text-[10px]">Nenhum agendamento cadastrado nesta categoria</span>
          </div>
        ) : getList().map((item: any) => {
          const isCampaign = currentCategory === 'campaigns';
          const isVisit = currentCategory === 'visits';
          const startDate = isCampaign ? item.startDate : item.date;
          const { day, month } = getDayMonth(startDate);
          
          return (
            <SwipeableItem 
              key={item.id} 
              onDelete={() => remove(item.id)} 
              disabled={!isAdmin}
              roundedClass="rounded-[2.5rem]"
            >
              <div className="p-5 border border-slate-100 flex items-start gap-4 relative bg-white hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col items-center justify-center w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 shrink-0 overflow-hidden sticky top-0">
                  <div className={`w-full h-4 ${colors[currentCategory]} flex items-center justify-center`}>
                    <span className="text-[8px] font-black text-white uppercase">{month}</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-xl font-black text-slate-800 leading-none">{day}</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[8px] font-black uppercase rounded-md flex items-center gap-1">
                      <ShieldCheck size={10} className="text-app-purple" /> Pastor
                    </span>
                  </div>

                  <h4 className="font-black text-slate-900 uppercase tracking-tight text-sm mb-2">
                    {isVisit ? `Visita: ${item.memberName}` : item.title}
                  </h4>
                  
                  <div className="space-y-3">
                    {isCampaign ? (
                      <>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <div className="flex-1">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <CheckCircle2 size={10} className="text-app-green" />
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Início</span>
                                </div>
                                <span className="text-[11px] font-black text-slate-700 block">{formatShortDate(item.startDate || item.date)}</span>
                            </div>
                            
                            <ArrowRight size={14} className="text-slate-200 shrink-0" />
                            
                            <div className="flex-1 text-right">
                                <div className="flex items-center gap-1.5 mb-1 justify-end">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Encerramento</span>
                                    <AlertCircle size={10} className="text-app-red" />
                                </div>
                                <span className="text-[11px] font-black text-slate-700 block">{formatShortDate(item.endDate)}</span>
                            </div>
                          </div>
                        </div>
                        
                        {(item.reason || item.description || item.desc) && (
                          <div className="bg-app-red/5 p-4 rounded-2xl border-l-4 border-app-red/40">
                            <div className="flex items-center gap-1.5 mb-1.5 opacity-60">
                              <AlignLeft size={12} className="text-app-red" />
                              <span className="text-[9px] font-black uppercase text-app-red tracking-wider">Propósito do Clamor</span>
                            </div>
                            <p className="text-xs text-slate-700 font-bold leading-relaxed italic whitespace-pre-wrap">
                              "{item.reason || item.description || item.desc}"
                            </p>
                          </div>
                        )}
                      </>
                    ) : isVisit ? (
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-500 capitalize block">
                          {formatFullDate(item.date)} às {item.time}h
                        </span>
                        {item.address && (
                          <p className="text-xs font-bold text-slate-600 flex items-center gap-1">
                            <MapPin size={12} className="text-app-purple" /> {item.address}
                          </p>
                        )}
                        {(item.purpose || item.notes || item.description || item.desc) && (
                          <div className="bg-app-purple/5 p-3 rounded-2xl border-l-4 border-app-purple">
                            <p className="text-xs text-slate-700 font-bold italic">
                              "{item.purpose || item.notes || item.description || item.desc}"
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <span className="text-[10px] font-bold text-slate-500 capitalize block mb-1">
                          {formatFullDate(item.date)}
                        </span>
                        {(item.description || item.desc) && (
                          <p className="text-xs text-slate-600 font-medium leading-relaxed">
                            {item.description || item.desc}
                          </p>
                        )}
                      </>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      {item.time && !isVisit && (
                        <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase flex items-center gap-1.5">
                          <Clock size={12}/> {item.time}h
                        </span>
                      )}
                      {isCampaign && (
                        <span className="px-3 py-1.5 bg-app-red text-white rounded-lg text-[9px] font-black uppercase shadow-md shadow-app-red/20">
                          Campanha Ativa
                        </span>
                      )}
                      {isVisit && (
                        <span className="px-3 py-1.5 bg-app-purple text-white rounded-lg text-[9px] font-black uppercase shadow-md shadow-app-purple/20">
                          Visita Agendada
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between gap-3 shrink-0">
                  <div className="p-2 text-slate-200">
                    {currentCategory === 'cults' && <Star size={24} fill="currentColor"/>}
                    {currentCategory === 'meetings' && <Users size={24} fill="currentColor"/>}
                    {currentCategory === 'visits' && <User size={24} fill="currentColor"/>}
                    {currentCategory === 'festivals' && <CalIcon size={24} fill="currentColor"/>}
                    {currentCategory === 'campaigns' && <Heart size={24} fill="currentColor"/>}
                  </div>
                  {isAdmin && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemToDelete({ 
                          id: item.id, 
                          title: isVisit ? `Visita: ${item.memberName}` : (item.title || 'este agendamento') 
                        });
                      }}
                      className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all border border-rose-200/60 active:scale-95 flex items-center justify-center shadow-sm"
                      title="Excluir Agendamento"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </SwipeableItem>
          );
        })}
      </div>

      {/* Modal Adicionar no ScheduleView */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end p-4">
          <div className="bg-white w-full max-w-md mx-auto rounded-t-[3rem] p-8 space-y-5 animate-slide-up shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">
                Agendar {labels[currentCategory]}
              </h3>
              <button onClick={resetForm} className="p-2 bg-slate-100 rounded-full text-slate-400 active:scale-90 transition-transform"><X size={20}/></button>
            </div>
            
            <div className="space-y-4">
              {currentCategory === 'visits' ? (
                <>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-2 block tracking-widest">Nome do Membro / Família</label>
                    <input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Ex: Família Silva / Ir. Maria" className="w-full p-5 bg-slate-50 rounded-2xl border-none outline-none font-bold text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-2 block tracking-widest">Data</label>
                      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-5 bg-slate-50 rounded-2xl border-none outline-none font-bold text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-2 block tracking-widest">Horário</label>
                      <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full p-5 bg-slate-50 rounded-2xl border-none outline-none font-bold text-xs" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-2 block tracking-widest">Endereço da Visita</label>
                    <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ex: Rua das Flores, 123" className="w-full p-5 bg-slate-50 rounded-2xl border-none outline-none font-bold text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-2 block tracking-widest">Propósito da Visita / Motivo</label>
                    <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Oração por saúde, fortalecimento espiritual..." className="w-full p-5 bg-slate-50 rounded-2xl border-none outline-none font-medium text-xs h-28 resize-none" />
                  </div>
                </>
              ) : currentCategory === 'campaigns' ? (
                <>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-2 block tracking-widest">Título da Campanha</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: 7 Dias de Clamor pela Família" className="w-full p-5 bg-slate-50 rounded-2xl border-none outline-none font-bold text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-2 block tracking-widest">Início</label>
                      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-5 bg-slate-50 rounded-2xl border-none outline-none font-bold text-xs text-app-green" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-2 block tracking-widest">Término</label>
                      <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-5 bg-slate-50 rounded-2xl border-none outline-none font-bold text-xs text-app-red" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-2 block tracking-widest">Motivo e Instruções da Campanha</label>
                    <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Instruções e jejum..." className="w-full p-5 bg-slate-50 rounded-2xl border-none outline-none font-medium text-xs h-28 resize-none" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-2 block tracking-widest">Título do Evento / Culto</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Culto de Santa Ceia" className="w-full p-5 bg-slate-50 rounded-2xl border-none outline-none font-bold text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-2 block tracking-widest">Data</label>
                      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-5 bg-slate-50 rounded-2xl border-none outline-none font-bold text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-2 block tracking-widest">Horário</label>
                      <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full p-5 bg-slate-50 rounded-2xl border-none outline-none font-bold text-xs" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-2 block tracking-widest">Descrição / Detalhes</label>
                    <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Detalhes da programação..." className="w-full p-5 bg-slate-50 rounded-2xl border-none outline-none font-medium text-xs h-28 resize-none" />
                  </div>
                </>
              )}
            </div>

            <button onClick={handleAdd} className={`${colors[currentCategory]} text-white w-full p-5 rounded-2xl font-black shadow-xl uppercase tracking-widest active:scale-95 transition-all text-xs mt-4`}>
              Salvar na Agenda do Plantão
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão Sem `window.confirm` */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 space-y-4 shadow-2xl animate-slide-up border-2 border-rose-100 text-center">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Trash2 size={28} />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black uppercase text-slate-900">Confirmar Exclusão</h3>
              <p className="text-xs font-bold text-slate-600">
                Tem certeza que deseja excluir <span className="text-rose-600 font-black">"{itemToDelete.title}"</span>?
              </p>
              <p className="text-[10px] font-bold text-slate-400">Esta ação não poderá ser desfeita e o item será removido da agenda oficial.</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 bg-slate-100 text-slate-700 font-black p-3.5 rounded-2xl text-xs uppercase hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={() => {
                  remove(itemToDelete.id);
                  setItemToDelete(null);
                }}
                className="flex-1 bg-rose-600 text-white font-black p-3.5 rounded-2xl text-xs uppercase shadow-lg shadow-rose-600/20 active:scale-95 hover:bg-rose-700 transition-all"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleView;

