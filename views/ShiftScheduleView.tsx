import React, { useState } from 'react';
import { ShiftItem, UserProfile } from '../types';
import { Calendar as CalendarIcon, Clock, Plus, Building2, MapPin, Download, Bell, BellOff, CheckCircle2, FileText, X, AlertCircle, Share2, FileDown, Trash2 } from 'lucide-react';
import { downloadShiftSchedulePDF, shareShiftSchedulePDF } from '../utils/pdfExport';

interface ShiftScheduleViewProps {
  shifts: ShiftItem[];
  user?: UserProfile;
  onAddShift: (shift: ShiftItem) => void;
  onUpdateShift: (shift: ShiftItem) => void;
  onDeleteShift?: (shiftId: string) => void;
  darkMode?: boolean;
}

export const ShiftScheduleView: React.FC<ShiftScheduleViewProps> = ({
  shifts,
  user,
  onAddShift,
  onUpdateShift,
  onDeleteShift,
  darkMode
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('TODOS');
  const [shiftToDelete, setShiftToDelete] = useState<ShiftItem | null>(null);
  
  // FORM STATE
  const [hospitalName, setHospitalName] = useState('Hospital das Clínicas - HCFMUSP');
  const [unitSector, setUnitSector] = useState('UTI Adulto - Leito 01 a 06');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('19:00');
  const [shiftType, setShiftType] = useState<ShiftItem['shiftType']>('12x36_DIURNO');
  const [notes, setNotes] = useState('');
  const [valueEst, setValueEst] = useState(450);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newShift: ShiftItem = {
      id: `s_${Date.now()}`,
      hospitalName,
      unitSector,
      date,
      startTime,
      endTime,
      shiftType,
      status: 'AGENDADO',
      notes,
      reminderEnabled: true,
      userId: 'usr_101',
      userName: 'Enfª. Amanda Oliveira',
      valueEst: Number(valueEst)
    };

    onAddShift(newShift);
    setIsModalOpen(false);
    setNotes('');
  };

  const handleExportPDF = () => {
    const textContent = `=== NURSECARE PRO - RELATÓRIO DE ESCALA DE PLANTÕES ===\nGerado em: ${new Date().toLocaleString()}\n\n` + 
      shifts.map(s => `• Data: ${s.date} (${s.startTime}h - ${s.endTime}h)\n  Hospital: ${s.hospitalName}\n  Setor: ${s.unitSector}\n  Tipo: ${s.shiftType}\n  Status: ${s.status}\n  Observações: ${s.notes || 'Nenhuma'}\n----------------------------------`).join('\n');

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Escala_Plantoes_Enfermagem_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  const filteredShifts = shifts.filter(s => {
    if (filterType === 'TODOS') return true;
    return s.shiftType === filterType;
  });

  return (
    <div className="space-y-6 animate-slide-up pb-24">
      {/* HEADER DA PÁGINA DE PLANTÕES */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="text-emerald-500" size={22} /> Agenda de Plantões & Escala
          </h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Controle de escalas hospitalares, trocas de turno e lembretes automáticos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => downloadShiftSchedulePDF(shifts, user)}
            className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
            title="Baixar Escala em PDF"
          >
            <FileDown size={15} className="text-emerald-400" /> Baixar Escala (PDF)
          </button>

          <button
            onClick={() => shareShiftSchedulePDF(shifts, user)}
            className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
            title="Enviar Escala em PDF via WhatsApp/E-mail"
          >
            <Share2 size={15} /> Enviar PDF
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Plus size={16} /> Novo Plantão
          </button>
        </div>
      </div>

      {/* FILTROS DE TURNO */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {['TODOS', '12x36_DIURNO', '12x36_NOTURNO', '24H', '6H_MANHA', 'SOBREAVISO'].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
              filterType === t 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                : darkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t === 'TODOS' ? 'Todos os Turnos' : t.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* LISTA DE PLANTÕES */}
      <div className="space-y-3">
        {filteredShifts.map((shift) => (
          <div
            key={shift.id}
            className={`p-5 rounded-3xl border transition-all space-y-3 relative overflow-hidden shadow-sm ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                  shift.status === 'EM_ANDAMENTO' ? 'bg-emerald-500/10 text-emerald-600 animate-pulse' :
                  shift.status === 'CONCLUIDO' ? 'bg-slate-500/10 text-slate-500' :
                  'bg-blue-500/10 text-blue-600'
                }`}>
                  ● {shift.status.replace('_', ' ')}
                </span>
                <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1">
                  <CalendarIcon size={14} className="text-emerald-500" /> {shift.date}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdateShift({ ...shift, reminderEnabled: !shift.reminderEnabled })}
                  className={`p-1.5 rounded-xl text-xs font-bold transition-all ${
                    shift.reminderEnabled ? 'bg-amber-500/10 text-amber-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                  title={shift.reminderEnabled ? 'Lembrete Ativo' : 'Lembrete Desativado'}
                >
                  {shift.reminderEnabled ? <Bell size={15} /> : <BellOff size={15} />}
                </button>

                {onDeleteShift && (
                  <button
                    onClick={() => setShiftToDelete(shift)}
                    className="p-1.5 rounded-xl text-xs font-bold transition-all bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400"
                    title="Excluir Plantão da Agenda"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400">Hospital / Instituição</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Building2 size={14} className="text-emerald-500 shrink-0" /> {shift.hospitalName}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400">Setor & Unidade</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <MapPin size={14} className="text-blue-500 shrink-0" /> {shift.unitSector}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400">Horário & Tipo</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Clock size={14} className="text-purple-500 shrink-0" /> {shift.startTime}h às {shift.endTime}h ({shift.shiftType})
                </p>
              </div>
            </div>

            {shift.notes && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-xs text-slate-600 dark:text-slate-300 font-medium">
                <strong>Observações:</strong> {shift.notes}
              </div>
            )}
          </div>
        ))}

        {filteredShifts.length === 0 && (
          <div className={`p-8 text-center rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-100 text-slate-500'} space-y-3`}>
            <CalendarIcon size={38} className="mx-auto text-emerald-500 opacity-60" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Nenhum plantão cadastrado na agenda.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Os plantões de teste foram limpos. Você pode cadastrar novos plantões para gerenciar sua escala de enfermagem.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all uppercase tracking-wider mt-2"
            >
              <Plus size={15} /> Cadastrar Novo Plantão
            </button>
          </div>
        )}
      </div>

      {/* MODAL DE NOVO PLANTÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-[2.5rem] p-6 space-y-5 shadow-2xl border relative max-h-[90vh] overflow-y-auto animate-slide-up ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
          }`}>
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 dark:bg-slate-800 rounded-full"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <CalendarIcon size={20} className="text-emerald-500" /> Cadastrar Plantão
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Hospital / Instituição</label>
                <input 
                  type="text" 
                  value={hospitalName} 
                  onChange={(e) => setHospitalName(e.target.value)} 
                  required
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-emerald-500" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Unidade / Setor / Leitos</label>
                <input 
                  type="text" 
                  value={unitSector} 
                  onChange={(e) => setUnitSector(e.target.value)} 
                  required
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-emerald-500" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Data</label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    required
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-emerald-500" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Tipo de Turno</label>
                  <select 
                    value={shiftType} 
                    onChange={(e) => setShiftType(e.target.value as any)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-emerald-500"
                  >
                    <option value="12x36_DIURNO">12x36 Diurno (07h às 19h)</option>
                    <option value="12x36_NOTURNO">12x36 Noturno (19h às 07h)</option>
                    <option value="24H">Plantão 24 Horas</option>
                    <option value="6H_MANHA">Turno 6 Horas (Manhã)</option>
                    <option value="SOBREAVISO">Sobreaviso / Chamada</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Horário Início</label>
                  <input 
                    type="time" 
                    value={startTime} 
                    onChange={(e) => setStartTime(e.target.value)} 
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-emerald-500" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Horário Fim</label>
                  <input 
                    type="time" 
                    value={endTime} 
                    onChange={(e) => setEndTime(e.target.value)} 
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-emerald-500" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Observações do Plantão</label>
                <textarea 
                  rows={2} 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="Instruções para troca de plantão ou observações da unidade..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-emerald-500" 
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black p-3.5 rounded-2xl uppercase tracking-wider shadow-lg shadow-emerald-600/20 active:scale-95 transition-all mt-2"
              >
                Salvar Plantão na Agenda
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE PLANTÃO */}
      {shiftToDelete && (
        <div className="fixed inset-0 z-[180] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-[2.5rem] p-6 space-y-4 shadow-2xl border text-center relative animate-slide-up ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
          }`}>
            <div className="w-14 h-14 bg-rose-500/10 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={26} />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black uppercase text-slate-900 dark:text-white">
                Excluir Plantão da Agenda?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Tem certeza que deseja remover o plantão de <strong className="text-slate-800 dark:text-slate-200">{shiftToDelete.hospitalName}</strong> do dia <strong>{shiftToDelete.date}</strong>?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShiftToDelete(null)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (onDeleteShift && shiftToDelete) {
                    onDeleteShift(shiftToDelete.id);
                  }
                  setShiftToDelete(null);
                }}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-rose-600/20 transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Trash2 size={15} /> Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
