import React, { useState } from 'react';
import { MedicationRecord, MedicationReminder, PatientItem, UserProfile } from '../types';
import { Pill, Clock, Plus, CheckCircle2, AlertCircle, Search, Filter, X, ShieldCheck, FileDown, Share2, Volume2, VolumeX, Volume1, Bell, Trash2, Edit2, Play, Calendar, User, Sparkles } from 'lucide-react';
import { downloadPatientPDF, sharePatientPDF, downloadAllPatientsPDF } from '../utils/pdfExport';
import { speakMedicationReminder, stopVoiceAnnouncement } from '../utils/voiceReminder';

interface MedicationViewProps {
  medications: MedicationRecord[];
  reminders?: MedicationReminder[];
  patients: PatientItem[];
  user?: UserProfile;
  onAddMedication: (m: MedicationRecord) => void;
  onUpdateMedication: (m: MedicationRecord) => void;
  onDeleteMedication?: (id: string) => void;
  onAddReminder?: (r: MedicationReminder) => void;
  onUpdateReminder?: (r: MedicationReminder) => void;
  onDeleteReminder?: (id: string) => void;
  darkMode?: boolean;
}

export const MedicationView: React.FC<MedicationViewProps> = ({
  medications,
  reminders = [],
  patients,
  user,
  onAddMedication,
  onUpdateMedication,
  onDeleteMedication,
  onAddReminder,
  onUpdateReminder,
  onDeleteReminder,
  darkMode
}) => {
  const [activeTab, setActiveTab] = useState<'reminders' | 'aprazamento'>('reminders');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [deleteModalReminder, setDeleteModalReminder] = useState<MedicationReminder | null>(null);
  const [deleteModalMedication, setDeleteModalMedication] = useState<MedicationRecord | null>(null);
  const [filterRoute, setFilterRoute] = useState<string>('TODAS');
  const [search, setSearch] = useState('');

  // FORM STATE - APRAZAMENTO TRADICIONAL
  const [patientId, setPatientId] = useState(patients[0]?.id || '');
  const [medicationName, setMedicationName] = useState('Ceftriaxona 1g');
  const [dosage, setDosage] = useState('1000mg EV');
  const [route, setRoute] = useState<MedicationRecord['route']>('EV');
  const [scheduledTime, setScheduledTime] = useState('14:00');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // FORM STATE - LEMBRETE COM ALERTA DE VOZ
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [remPatientName, setRemPatientName] = useState('Luis Silva');
  const [remMedicationName, setRemMedicationName] = useState('Dipirona Sódica');
  const [remDosage, setRemDosage] = useState('1g EV diluído em 100ml SF 0.9%');
  const [remDate, setRemDate] = useState(new Date().toISOString().split('T')[0]);
  const [remTime, setRemTime] = useState('14:30');
  const [remVoiceGender, setRemVoiceGender] = useState<'female' | 'male'>('female');
  const [remRepeatCount, setRemRepeatCount] = useState<number>(2);
  const [remVolume, setRemVolume] = useState<number>(100);
  const [remNotes, setRemNotes] = useState('');
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  // SUBMIT APRAZAMENTO
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPatient = patients.find(p => p.id === patientId) || patients[0];
    if (!targetPatient) return;

    const newMed: MedicationRecord = {
      id: `m_${Date.now()}`,
      patientId: targetPatient.id,
      patientName: targetPatient.name,
      bed: targetPatient.bed,
      medicationName,
      dosage,
      route,
      scheduledTime,
      scheduledDate,
      status: 'PENDENTE',
      notes
    };

    onAddMedication(newMed);
    setIsModalOpen(false);
    setNotes('');
  };

  // SUBMIT LEMBRETE DE VOZ
  const handleReminderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remPatientName.trim() || !remMedicationName.trim() || !remTime) {
      alert('Por favor, preencha o nome do paciente, nome do remédio e horário do lembrete.');
      return;
    }

    const newRem: MedicationReminder = {
      id: editingReminderId || `rem_${Date.now()}`,
      patientName: remPatientName.trim(),
      medicationName: remMedicationName.trim(),
      dosage: remDosage.trim(),
      scheduledDate: remDate,
      scheduledTime: remTime,
      voiceGender: remVoiceGender,
      repeatCount: Number(remRepeatCount),
      volume: Number(remVolume),
      isActive: true,
      isTriggered: false,
      notes: remNotes.trim(),
      createdAt: new Date().toISOString()
    };

    if (editingReminderId && onUpdateReminder) {
      onUpdateReminder(newRem);
    } else if (onAddReminder) {
      onAddReminder(newRem);
    }

    setIsReminderModalOpen(false);
    resetReminderForm();
  };

  const resetReminderForm = () => {
    setEditingReminderId(null);
    setRemPatientName(patients[0]?.name || 'Luis Silva');
    setRemMedicationName('Dipirona Sódica');
    setRemDosage('1g EV diluído em 100ml SF 0.9%');
    setRemDate(new Date().toISOString().split('T')[0]);
    setRemTime('14:30');
    setRemVoiceGender('female');
    setRemRepeatCount(2);
    setRemVolume(100);
    setRemNotes('');
    stopVoiceAnnouncement();
    setIsPlayingTest(false);
  };

  const handleOpenEditReminder = (rem: MedicationReminder) => {
    setEditingReminderId(rem.id);
    setRemPatientName(rem.patientName);
    setRemMedicationName(rem.medicationName);
    setRemDosage(rem.dosage);
    setRemDate(rem.scheduledDate);
    setRemTime(rem.scheduledTime);
    setRemVoiceGender(rem.voiceGender);
    setRemRepeatCount(rem.repeatCount);
    setRemVolume(rem.volume);
    setRemNotes(rem.notes || '');
    setIsReminderModalOpen(true);
  };

  const handleTestVoice = (patient: string, med: string, dos: string, gender: 'female' | 'male', count: number, vol: number) => {
    setIsPlayingTest(true);
    speakMedicationReminder({
      patientName: patient || 'Luis',
      medicationName: med || 'Dipirona',
      dosage: dos || '1g',
      voiceGender: gender,
      repeatCount: 1, // No teste fala 1 vez para prévia
      volume: vol,
      onEnd: () => setIsPlayingTest(false)
    });
  };

  const handleAdminister = (med: MedicationRecord) => {
    const updated: MedicationRecord = {
      ...med,
      status: 'ADMINISTRADO',
      administeredBy: user ? `${user.name} (${user.corenNumber || 'COREN'})` : 'Enfermeiro(a) Plantonista',
      administeredAt: new Date().toLocaleTimeString().substring(0, 5)
    };
    onUpdateMedication(updated);
  };

  const filteredMeds = medications.filter(m => {
    const matchesSearch = m.medicationName.toLowerCase().includes(search.toLowerCase()) ||
                          m.patientName.toLowerCase().includes(search.toLowerCase()) ||
                          m.bed.toLowerCase().includes(search.toLowerCase());
    const matchesRoute = filterRoute === 'TODAS' || m.route === filterRoute;
    return matchesSearch && matchesRoute;
  });

  const filteredReminders = reminders.filter(r => 
    r.patientName.toLowerCase().includes(search.toLowerCase()) ||
    r.medicationName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-slide-up pb-24">
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Pill className="text-rose-500" size={24} /> Controle de Medicação & Lembretes de Voz
          </h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Agendamento de horários com aviso sonoro em viva-voz de assistente e checagem de aprazamentos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => downloadAllPatientsPDF(patients, medications, [], user)}
            className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
            title="Exportar Relatório Geral de Medicações em PDF"
          >
            <FileDown size={15} className="text-rose-400" /> Baixar Relatório (PDF)
          </button>

          <button
            onClick={() => {
              resetReminderForm();
              setIsReminderModalOpen(true);
            }}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-rose-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Bell size={16} /> + Agendar Lembrete de Voz
          </button>
        </div>
      </div>

      {/* TABS DE NAVEGAÇÃO: LEMBRETES DE VOZ vs APRAZAMENTOS */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('reminders')}
          className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'reminders'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
              : darkMode ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Bell size={16} />
          <span>⏰ Lembretes & Alerta de Voz</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeTab === 'reminders' ? 'bg-white/20 text-white' : 'bg-rose-500/10 text-rose-500'
          }`}>
            {reminders.filter(r => r.isActive).length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('aprazamento')}
          className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'aprazamento'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
              : darkMode ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Pill size={16} />
          <span>📋 Todos os Aprazamentos</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeTab === 'aprazamento' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}>
            {medications.length}
          </span>
        </button>
      </div>

      {/* BUSCA DA PÁGINA */}
      <div className="relative w-full">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input 
          type="text" 
          placeholder="Buscar paciente, medicamento ou horário..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className={`w-full pl-10 pr-4 py-3 rounded-2xl text-xs font-medium border outline-none transition-all ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white focus:border-rose-500' : 'bg-white border-slate-200 text-slate-800 focus:border-rose-500'
          }`}
        />
      </div>

      {/* BANNER DE INSTRUÇÕES DE VOZ EM VIVA-VOZ */}
      {activeTab === 'reminders' && (
        <div className={`p-4 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          darkMode ? 'bg-rose-950/20 border-rose-500/30 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-md">
              <Volume2 size={22} className="animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" /> Sistema de Alerta por Voz em Viva-Voz
              </h3>
              <p className="text-[11px] font-medium opacity-90 mt-0.5">
                Cadastre o paciente, data, medicamento e horário. No minuto exato agendado, o aplicativo anunciará com voz de assistente: <br />
                <strong className="text-rose-700 dark:text-rose-300">"Olá Enfermeira, já está na hora do medicamento do paciente Luis..."</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => handleTestVoice('Luis', 'Dipirona 1g', 'EV', 'female', 1, 100)}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 w-full md:w-auto"
            >
              <Play size={14} /> Testar Voz Feminina
            </button>
            <button
              onClick={() => handleTestVoice('Luis', 'Dipirona 1g', 'EV', 'male', 1, 100)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 w-full md:w-auto"
            >
              <Play size={14} /> Testar Voz Masculina
            </button>
          </div>
        </div>
      )}

      {/* ABA 1: LEMBRETES DE VOZ DE MEDICAMENTOS */}
      {activeTab === 'reminders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Clock size={14} /> Lembretes Programados com Alerta Sonoro
            </h2>

            <button
              onClick={() => {
                resetReminderForm();
                setIsReminderModalOpen(true);
              }}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs uppercase flex items-center gap-1"
            >
              <Plus size={14} /> Criar Lembrete
            </button>
          </div>

          {filteredReminders.length === 0 ? (
            <div className={`p-8 text-center rounded-3xl border space-y-3 ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-100 text-slate-500'
            }`}>
              <Bell size={36} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p className="font-bold text-xs">Nenhum lembrete de voz agendado até o momento.</p>
              <button
                onClick={() => {
                  resetReminderForm();
                  setIsReminderModalOpen(true);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md transition-all"
              >
                + Agendar Primeiro Lembrete
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredReminders.map((rem) => (
                <div
                  key={rem.id}
                  className={`p-5 rounded-3xl border transition-all space-y-4 shadow-sm relative overflow-hidden ${
                    rem.isActive 
                      ? darkMode ? 'bg-slate-900 border-rose-500/30' : 'bg-white border-slate-200'
                      : darkMode ? 'bg-slate-900/40 border-slate-800 opacity-60' : 'bg-slate-50 border-slate-200 opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-3 rounded-2xl font-black text-sm ${
                        rem.isActive ? 'bg-rose-500/10 text-rose-600' : 'bg-slate-200 text-slate-500'
                      }`}>
                        <Bell size={20} className={rem.isActive ? 'animate-bounce' : ''} />
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          {rem.patientName}
                        </h3>
                        <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                          <Pill size={12} className="text-rose-500" /> {rem.medicationName} {rem.dosage ? `(${rem.dosage})` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditReminder(rem)}
                        className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-xl"
                        title="Editar Lembrete"
                      >
                        <Edit2 size={14} />
                      </button>

                      {onDeleteReminder && (
                        <button
                          onClick={() => setDeleteModalReminder(rem)}
                          className="p-2 text-rose-500 hover:text-rose-700 bg-rose-50 dark:bg-rose-900/30 rounded-xl transition-all active:scale-95 flex items-center justify-center"
                          title="Excluir Lembrete de Voz"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* INFORMAÇÕES DE HORÁRIO E VOZ */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                      <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                        <Calendar size={12} /> Data & Horário
                      </span>
                      <p className="font-black text-slate-900 dark:text-white mt-0.5">
                        {rem.scheduledDate.split('-').reverse().join('/')} às <strong className="text-rose-600 dark:text-rose-400 text-sm">{rem.scheduledTime}h</strong>
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                      <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                        <Volume2 size={12} /> Assistente de Voz
                      </span>
                      <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1">
                        {rem.voiceGender === 'female' ? '👩 Feminino' : '👨 Masculino'} • {rem.repeatCount}x • {rem.volume}%
                      </p>
                    </div>
                  </div>

                  {rem.notes && (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                      <strong>Obs:</strong> {rem.notes}
                    </div>
                  )}

                  {/* CONTROLES E BOTÃO DE OUVIR */}
                  <div className="flex items-center justify-between gap-2 pt-2">
                    <button
                      onClick={() => handleTestVoice(rem.patientName, rem.medicationName, rem.dosage, rem.voiceGender, rem.repeatCount, rem.volume)}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-xl text-[11px] uppercase tracking-wider shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <Play size={13} className="text-rose-400" /> Ouvir Alerta
                    </button>

                    <button
                      onClick={() => {
                        if (onUpdateReminder) {
                          onUpdateReminder({ ...rem, isActive: !rem.isActive });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all flex items-center gap-1 ${
                        rem.isActive 
                          ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' 
                          : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                      }`}
                    >
                      <CheckCircle2 size={13} /> {rem.isActive ? 'Ativo' : 'Pausado'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 2: APRAZAMENTO TRADICIONAL */}
      {activeTab === 'aprazamento' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar w-full sm:w-auto">
              {['TODAS', 'EV', 'IM', 'VO', 'SC', 'SL', 'INALATORIO'].map((r) => (
                <button
                  key={r}
                  onClick={() => setFilterRoute(r)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                    filterRoute === r 
                      ? 'bg-rose-600 text-white shadow-md' 
                      : darkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Via {r}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5 w-full sm:w-auto justify-center"
            >
              <Plus size={16} /> Aprazar Medicação
            </button>
          </div>

          {/* LISTA DE MEDICAÇÕES TRADICIONAL */}
          <div className="space-y-3">
            {filteredMeds.map((med) => (
              <div
                key={med.id}
                className={`p-5 rounded-3xl border transition-all space-y-3 shadow-sm ${
                  med.status === 'ADMINISTRADO' 
                    ? darkMode ? 'bg-slate-900/50 border-emerald-500/30' : 'bg-emerald-50/40 border-emerald-200'
                    : darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-rose-500/10 text-rose-600 rounded-xl font-black text-xs">
                      {med.route}
                    </span>
                    <div>
                      <h3 className="font-black text-sm text-slate-900 dark:text-white">{med.medicationName}</h3>
                      <p className="text-[11px] font-bold text-slate-500">{med.patientName} • <strong className="text-slate-800 dark:text-slate-200">{med.bed}</strong></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 ${
                      med.status === 'ADMINISTRADO' ? 'bg-emerald-500/10 text-emerald-600' :
                      med.status === 'ATRASADO' ? 'bg-rose-500/10 text-rose-600 animate-pulse' :
                      'bg-amber-500/10 text-amber-600'
                    }`}>
                      <Clock size={12} /> {med.scheduledTime}h ({med.status})
                    </span>

                    <button
                      onClick={() => {
                        const patient = patients.find(p => p.id === med.patientId || p.name === med.patientName);
                        if (patient) {
                          downloadPatientPDF(patient, medications, [], user);
                        } else {
                          alert('Paciente não encontrado para este registro.');
                        }
                      }}
                      className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl transition-all"
                      title="Baixar Ficha do Paciente em PDF"
                    >
                      <FileDown size={14} />
                    </button>

                    <button
                      onClick={() => {
                        const patient = patients.find(p => p.id === med.patientId || p.name === med.patientName);
                        if (patient) {
                          sharePatientPDF(patient, medications, [], user);
                        } else {
                          alert('Paciente não encontrado para este registro.');
                        }
                      }}
                      className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md active:scale-95"
                      title="Salvar e Enviar PDF via WhatsApp/Email"
                    >
                      <Share2 size={14} />
                    </button>

                    {onDeleteMedication && (
                      <button
                        onClick={() => setDeleteModalMedication(med)}
                        className="p-2 text-rose-500 hover:text-rose-700 bg-rose-50 dark:bg-rose-900/30 rounded-xl transition-all active:scale-95 flex items-center justify-center"
                        title="Excluir Aprazamento"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}

                    {med.status === 'PENDENTE' && (
                      <button
                        onClick={() => handleAdminister(med)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center gap-1"
                      >
                        <CheckCircle2 size={14} /> Administrar
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400">Dosagem & Prescrição</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{med.dosage}</p>
                  </div>

                  {med.administeredBy && (
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400">Administrado Por</span>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <ShieldCheck size={14} /> {med.administeredBy} às {med.administeredAt}h
                      </p>
                    </div>
                  )}
                </div>

                {med.notes && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-xs text-slate-600 dark:text-slate-300 font-medium">
                    <strong>Observação Terapêutica:</strong> {med.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: CADASTRAR/EDITAR LEMBRETE DE VOZ */}
      {isReminderModalOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-[2.5rem] p-6 space-y-5 shadow-2xl border relative max-h-[92vh] overflow-y-auto animate-slide-up ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
          }`}>
            <button 
              onClick={() => {
                stopVoiceAnnouncement();
                setIsReminderModalOpen(false);
              }}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 dark:bg-slate-800 rounded-full"
            >
              <X size={18} />
            </button>

            <div>
              <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <Bell size={22} /> {editingReminderId ? 'Editar Lembrete de Voz' : 'Agendar Lembrete com Alerta de Voz'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                Defina o paciente, horário e voz do assistente para o aplicativo avisar em viva-voz no momento do medicamento.
              </p>
            </div>

            <form onSubmit={handleReminderSubmit} className="space-y-4 text-xs">
              {/* NOME DO PACIENTE */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">
                  Nome do Paciente *
                </label>
                <div className="space-y-2">
                  {patients.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) setRemPatientName(e.target.value);
                      }}
                      className="w-full p-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none"
                    >
                      <option value="">-- Selecionar da lista de pacientes --</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.name}>{p.name} ({p.bed})</option>
                      ))}
                    </select>
                  )}
                  <input 
                    type="text" 
                    value={remPatientName} 
                    onChange={(e) => setRemPatientName(e.target.value)} 
                    required
                    placeholder="Ex: Luis Silva"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none focus:border-rose-500" 
                  />
                </div>
              </div>

              {/* REMÉDIO E DOSAGEM */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">
                    Nome do Remédio *
                  </label>
                  <input 
                    type="text" 
                    value={remMedicationName} 
                    onChange={(e) => setRemMedicationName(e.target.value)} 
                    required
                    placeholder="Ex: Dipirona, Ondansetrona"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none focus:border-rose-500" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">
                    Dosagem / Prescrição
                  </label>
                  <input 
                    type="text" 
                    value={remDosage} 
                    onChange={(e) => setRemDosage(e.target.value)} 
                    placeholder="Ex: 1g EV, 500mg VO"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none focus:border-rose-500" 
                  />
                </div>
              </div>

              {/* DATA E HORÁRIO */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">
                    Data do Medicamento *
                  </label>
                  <input 
                    type="date" 
                    value={remDate} 
                    onChange={(e) => setRemDate(e.target.value)} 
                    required
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none focus:border-rose-500" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">
                    Horário de Aplicação *
                  </label>
                  <input 
                    type="time" 
                    value={remTime} 
                    onChange={(e) => setRemTime(e.target.value)} 
                    required
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none focus:border-rose-500 text-rose-600 dark:text-rose-400" 
                  />
                </div>
              </div>

              {/* CONFIGURAÇÃO DA VOZ DO ASSISTENTE */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="font-black text-xs uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <Volume2 size={16} /> Configurações de Voz do Alerta
                </h4>

                {/* VOZ FEMININA / MASCULINA */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">
                    Selecione a Voz da Assistente:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRemVoiceGender('female')}
                      className={`p-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border ${
                        remVoiceGender === 'female'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      👩 Assistente Feminina
                    </button>

                    <button
                      type="button"
                      onClick={() => setRemVoiceGender('male')}
                      className={`p-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border ${
                        remVoiceGender === 'male'
                          ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      👨 Assistente Masculino
                    </button>
                  </div>
                </div>

                {/* SLIDER DE VOLUME */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400 mb-1">
                    <span className="flex items-center gap-1">
                      {remVolume === 0 ? <VolumeX size={12} /> : remVolume < 50 ? <Volume1 size={12} /> : <Volume2 size={12} />} Volume do Áudio
                    </span>
                    <strong className="text-slate-900 dark:text-white text-xs">{remVolume}%</strong>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={remVolume} 
                    onChange={(e) => setRemVolume(Number(e.target.value))} 
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                </div>

                {/* QUANTIDADE DE REPETIÇÕES */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">
                    Quantas vezes o áudio se repete:
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 2, 3, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setRemRepeatCount(num)}
                        className={`p-2 rounded-xl font-black text-xs transition-all border ${
                          remRepeatCount === num
                            ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {num}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* BOTÃO DE TESTE DE VOZ */}
                <button
                  type="button"
                  onClick={() => handleTestVoice(remPatientName, remMedicationName, remDosage, remVoiceGender, remRepeatCount, remVolume)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 mt-2"
                >
                  <Play size={15} className="text-rose-400" /> Testar Voz do Alerta Agora
                </button>
              </div>

              {/* OBSERVAÇÕES */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">
                  Observações de Enfermagem (Opcional)
                </label>
                <textarea 
                  rows={2} 
                  value={remNotes} 
                  onChange={(e) => setRemNotes(e.target.value)} 
                  placeholder="Ex: Verificar pressão arterial antes da infusão..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-rose-500" 
                />
              </div>

              <div className="flex items-center gap-2 mt-2">
                {editingReminderId && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = reminders.find(r => r.id === editingReminderId);
                      if (target) {
                        setIsReminderModalOpen(false);
                        setDeleteModalReminder(target);
                      }
                    }}
                    className="px-4 py-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-black rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                    title="Excluir Lembrete"
                  >
                    <Trash2 size={16} /> Excluir
                  </button>
                )}

                <button
                  type="submit"
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black p-3.5 rounded-2xl uppercase tracking-wider shadow-lg shadow-rose-600/20 active:scale-95 transition-all"
                >
                  {editingReminderId ? 'Atualizar Lembrete' : 'Salvar e Ativar Lembrete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL APRAZAMENTO TRADICIONAL */}
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
              <Pill size={20} className="text-rose-500" /> Cadastrar Aprazamento de Medicamento
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Selecione o Paciente</label>
                <select 
                  value={patientId} 
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-rose-500"
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.bed})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Medicamento</label>
                  <input 
                    type="text" 
                    value={medicationName} 
                    onChange={(e) => setMedicationName(e.target.value)} 
                    required
                    placeholder="Ex: Dipirona, Ondansetrona"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-rose-500" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Via de Administração</label>
                  <select 
                    value={route} 
                    onChange={(e) => setRoute(e.target.value as any)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-rose-500"
                  >
                    <option value="EV">EV - Endovenosa</option>
                    <option value="IM">IM - Intramuscular</option>
                    <option value="VO">VO - Via Oral</option>
                    <option value="SC">SC - Subcutânea</option>
                    <option value="SL">SL - Sublingual</option>
                    <option value="INALATORIO">Inalatório / Nebulização</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Dosagem & Diluição</label>
                  <input 
                    type="text" 
                    value={dosage} 
                    onChange={(e) => setDosage(e.target.value)} 
                    required
                    placeholder="Ex: 1g em 100ml de SF 0.9%"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-rose-500" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Horário Previsto</label>
                  <input 
                    type="time" 
                    value={scheduledTime} 
                    onChange={(e) => setScheduledTime(e.target.value)} 
                    required
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-rose-500" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Observações de Enfermagem</label>
                <textarea 
                  rows={2} 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="Ex: Injetar em bomba de infusão em 30 min..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-rose-500" 
                />
              </div>

              <button
                type="submit"
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black p-3.5 rounded-2xl uppercase tracking-wider shadow-lg shadow-rose-600/20 active:scale-95 transition-all mt-2"
              >
                Salvar Aprazamento
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO: EXCLUIR LEMBRETE DE VOZ */}
      {deleteModalReminder && (
        <div 
          className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-md overflow-y-auto p-2 sm:p-4 flex items-center justify-center animate-fade-in"
          onClick={() => setDeleteModalReminder(null)}
        >
          <div 
            className={`w-full max-w-sm my-auto max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden animate-scale-up ${
              darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2 font-black text-rose-500 text-xs sm:text-sm uppercase tracking-wide">
                <Trash2 size={18} />
                <span>Excluir Lembrete de Voz</span>
              </div>
              <button 
                onClick={() => setDeleteModalReminder(null)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto shrink-0">
                <Trash2 size={24} />
              </div>

              <div className="text-center space-y-1">
                <h3 className="font-black text-base sm:text-lg">Excluir Lembrete de Voz?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Deseja excluir o lembrete sonoro do paciente <strong className="text-slate-900 dark:text-white">{deleteModalReminder.patientName}</strong>?
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl text-xs space-y-1 border border-slate-100 dark:border-slate-700">
                <p><strong>Medicamento:</strong> {deleteModalReminder.medicationName} {deleteModalReminder.dosage ? `(${deleteModalReminder.dosage})` : ''}</p>
                <p><strong>Horário:</strong> {deleteModalReminder.scheduledTime}h ({deleteModalReminder.scheduledDate.split('-').reverse().join('/')})</p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalReminder(null)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-black text-xs uppercase rounded-xl transition-all min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDeleteReminder) {
                      onDeleteReminder(deleteModalReminder.id);
                    }
                    setDeleteModalReminder(null);
                  }}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase rounded-xl shadow-lg shadow-rose-600/30 active:scale-95 transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
                >
                  <Trash2 size={14} /> Sim, Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO: EXCLUIR APRAZAMENTO TRADICIONAL */}
      {deleteModalMedication && (
        <div 
          className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-md overflow-y-auto p-2 sm:p-4 flex items-center justify-center animate-fade-in"
          onClick={() => setDeleteModalMedication(null)}
        >
          <div 
            className={`w-full max-w-sm my-auto max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden animate-scale-up ${
              darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2 font-black text-rose-500 text-xs sm:text-sm uppercase tracking-wide">
                <Trash2 size={18} />
                <span>Excluir Aprazamento</span>
              </div>
              <button 
                onClick={() => setDeleteModalMedication(null)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto shrink-0">
                <Trash2 size={24} />
              </div>

              <div className="text-center space-y-1">
                <h3 className="font-black text-base sm:text-lg">Excluir Aprazamento?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Deseja remover o registro de medicação do paciente <strong className="text-slate-900 dark:text-white">{deleteModalMedication.patientName}</strong>?
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl text-xs space-y-1 border border-slate-100 dark:border-slate-700">
                <p><strong>Medicamento:</strong> {deleteModalMedication.medicationName} ({deleteModalMedication.route})</p>
                <p><strong>Dosagem:</strong> {deleteModalMedication.dosage}</p>
                <p><strong>Horário:</strong> {deleteModalMedication.scheduledTime}h</p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalMedication(null)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-black text-xs uppercase rounded-xl transition-all min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDeleteMedication) {
                      onDeleteMedication(deleteModalMedication.id);
                    }
                    setDeleteModalMedication(null);
                  }}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase rounded-xl shadow-lg shadow-rose-600/30 active:scale-95 transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
                >
                  <Trash2 size={14} /> Sim, Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
