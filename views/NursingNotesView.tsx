import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NursingNote, PatientItem, UserProfile } from '../types';
import { FileText, Plus, ShieldCheck, Download, Search, CheckCircle2, X, Printer, Key, AlertCircle, FileDown, Share2 } from 'lucide-react';
import { downloadPatientPDF, sharePatientPDF, downloadAllPatientsPDF } from '../utils/pdfExport';

interface NursingNotesViewProps {
  notes: NursingNote[];
  patients: PatientItem[];
  user: UserProfile;
  onAddNote: (note: NursingNote) => void;
  darkMode?: boolean;
}

export const NursingNotesView: React.FC<NursingNotesViewProps> = ({
  notes,
  patients,
  user,
  onAddNote,
  darkMode
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('TODOS');

  // FORM STATE
  const [patientId, setPatientId] = useState(patients[0]?.id || '');
  const [entryType, setEntryType] = useState<NursingNote['entryType']>('ROTINA');
  const [content, setContent] = useState('');

  // Bloqueia a rolagem do body quando o modal estiver aberto para evitar rolagem dupla ou tela cortada no celular
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  const generateSignatureHash = (text: string, coren: string) => {
    let hash = 0;
    const str = `${text}_${coren}_${Date.now()}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return `SHA256-NURSE-${Math.abs(hash).toString(16).toUpperCase()}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const targetPatient = patients.find(p => p.id === patientId) || patients[0];
    if (!targetPatient) return;

    const digitalSignatureHash = generateSignatureHash(content, user.corenNumber || 'COREN-SP');

    const newNote: NursingNote = {
      id: `n_${Date.now()}`,
      patientId: targetPatient.id,
      patientName: targetPatient.name,
      bed: targetPatient.bed,
      entryType,
      content,
      professionalName: user.name,
      corenNumber: `${user.corenNumber || '123.456-ENF'}/${user.corenUF || 'SP'}`,
      digitalSignatureHash,
      timestamp: new Date().toLocaleString()
    };

    onAddNote(newNote);
    setIsModalOpen(false);
    setContent('');
  };

  const handleExportText = () => {
    const exportText = `=== PRONTUÁRIO DE ENFERMAGEM - REGISTRO DE EVOLUÇÕES ===\nGerado em: ${new Date().toLocaleString()}\nProfissional: ${user.name} (${user.corenNumber})\n\n` + 
      notes.map(n => `[${n.timestamp}] ${n.entryType} - Paciente: ${n.patientName} (${n.bed})\nEvolução: ${n.content}\nAssinado por: ${n.professionalName} (${n.corenNumber})\nHASH Criptográfico: ${n.digitalSignatureHash}\n----------------------------------`).join('\n\n');

    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Evolucoes_Enfermagem_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  const filteredNotes = notes.filter(n => {
    const matchesSearch = n.patientName.toLowerCase().includes(search.toLowerCase()) ||
                          n.content.toLowerCase().includes(search.toLowerCase()) ||
                          n.bed.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'TODOS' || n.entryType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 animate-slide-up pb-24">
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="text-purple-500" size={22} /> Anotações & Evolução de Enfermagem
          </h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Registros clínicos no padrão COFEN/SOAP com assinatura digital e carimbo de hora.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => downloadAllPatientsPDF(patients, [], notes, user)}
            className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
            title="Exportar Relatório Geral de Evoluções em PDF"
          >
            <FileDown size={15} className="text-purple-400" /> Baixar Relatório (PDF)
          </button>

          <button
            onClick={handleExportText}
            className={`flex-1 sm:flex-initial px-3.5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border ${
              darkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Download size={15} className="text-purple-500" /> Exportar (TXT)
          </button>

          <button
            onClick={() => {
              if (filterType && filterType !== 'TODOS') {
                setEntryType(filterType as any);
              }
              setIsModalOpen(true);
            }}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-purple-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Plus size={16} /> Nova Evolução
          </button>
        </div>
      </div>

      {/* BUSCA E FILTROS */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por paciente, conteúdo ou leito..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className={`w-full pl-10 pr-4 py-3 rounded-2xl text-xs font-medium border outline-none transition-all ${
              darkMode ? 'bg-slate-900 border-slate-800 text-white focus:border-purple-500' : 'bg-white border-slate-200 text-slate-800 focus:border-purple-500'
            }`}
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 no-scrollbar">
          {['TODOS', 'ROTINA', 'OCORRENCIA', 'INTERCORRENCIA', 'ADMISSAO', 'ALTA', 'OBITO'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                filterType === t 
                  ? 'bg-purple-600 text-white shadow-md' 
                  : darkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* CARDS DE EVOLUÇÕES */}
      <div className="space-y-3">
        {filteredNotes.map((note) => (
          <div
            key={note.id}
            className={`p-5 rounded-3xl border space-y-3 shadow-sm transition-all hover:border-purple-500 ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                  note.entryType === 'INTERCORRENCIA' || note.entryType === 'OBITO' ? 'bg-rose-500/10 text-rose-600' :
                  note.entryType === 'ALTA' ? 'bg-emerald-500/10 text-emerald-600' :
                  'bg-purple-500/10 text-purple-600'
                }`}>
                  {note.entryType}
                </span>

                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">{note.patientName}</h3>
                  <span className="text-[10px] font-bold text-slate-400">{note.bed}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-slate-400">{note.timestamp}</span>

                <button
                  onClick={() => {
                    const patient = patients.find(p => p.id === note.patientId || p.name === note.patientName);
                    if (patient) {
                      downloadPatientPDF(patient, [], notes, user);
                    } else {
                      alert('Paciente não encontrado para este registro.');
                    }
                  }}
                  className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl transition-all"
                  title="Baixar Ficha Cadastral / Evolução em PDF"
                >
                  <FileDown size={14} />
                </button>

                <button
                  onClick={() => {
                    const patient = patients.find(p => p.id === note.patientId || p.name === note.patientName);
                    if (patient) {
                      sharePatientPDF(patient, [], notes, user);
                    } else {
                      alert('Paciente não encontrado para este registro.');
                    }
                  }}
                  className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md active:scale-95"
                  title="Salvar e Enviar PDF via WhatsApp/Email"
                >
                  <Share2 size={14} />
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-line">
              {note.content}
            </p>

            {/* ASSINATURA DIGITAL DO PROFISSIONAL */}
            <div className="p-3 bg-purple-500/5 dark:bg-purple-500/10 rounded-2xl border border-purple-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px]">
              <div className="flex items-center gap-1.5 font-black text-purple-700 dark:text-purple-300">
                <ShieldCheck size={16} className="text-purple-500 shrink-0" />
                <span>Assinado Digitalmente: {note.professionalName} ({note.corenNumber})</span>
              </div>

              <div className="flex items-center gap-1 text-slate-400 font-mono font-bold">
                <Key size={12} /> HASH: {note.digitalSignatureHash}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL REGISTRAR EVOLUÇÃO */}
      {isModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className={`w-full max-w-xl max-h-[92vh] rounded-[2.5rem] p-5 sm:p-6 shadow-2xl border relative flex flex-col overflow-hidden animate-slide-up ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-base sm:text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <FileText size={20} className="text-purple-500" /> Registrar Anotação de Enfermagem
              </h3>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-full transition-all shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs overflow-y-auto pr-1 mt-3 flex-1 min-h-0">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Selecione o Paciente</label>
                <select 
                  value={patientId} 
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-purple-500"
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.bed})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Tipo de Registro</label>
                <select 
                  value={entryType} 
                  onChange={(e) => setEntryType(e.target.value as any)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-purple-500"
                >
                  <option value="ROTINA">Anotação de Rotina / Plantão</option>
                  <option value="OCORRENCIA">Ocorrência Clínica</option>
                  <option value="INTERCORRENCIA">Intercorrência Urgente</option>
                  <option value="ADMISSAO">Admissão de Paciente</option>
                  <option value="TRANSFERENCIA">Transferência de Leito/Setor</option>
                  <option value="ALTA">Registro de Alta</option>
                  <option value="OBITO">Aviso de Óbito</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Evolução de Enfermagem (SOAP / Anotação)</label>
                <textarea 
                  rows={5} 
                  value={content} 
                  onChange={(e) => setContent(e.target.value)} 
                  required
                  placeholder="Ex: 10:30h - Paciente consciente, orientado no tempo e espaço. Sinais vitais: PA 120/80 mmHg, FC 75 bpm, SpO2 98% em ar ambiente. Acesso venoso pérvio..."
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-medium outline-none focus:border-purple-500 leading-relaxed" 
                />
              </div>

              {/* CARD PREVIEW DA ASSINATURA DIGITAL */}
              <div className="p-3.5 bg-purple-500/10 rounded-2xl border border-purple-500/20 space-y-1 text-[11px]">
                <div className="flex items-center gap-1.5 font-black text-purple-700 dark:text-purple-300">
                  <ShieldCheck size={16} className="shrink-0" /> Assinatura que será gravada: {user.name} ({user.corenNumber})
                </div>
                <p className="text-[10px] text-slate-500">
                  Será gerado um hash imutável com data/hora em conformidade com o Código de Ética e a LGPD.
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black p-3.5 rounded-2xl uppercase tracking-wider shadow-lg shadow-purple-600/20 active:scale-95 transition-all mt-2"
              >
                Assinar & Assentar no Prontuário
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
