import React, { useState } from 'react';
import { PatientItem, MedicationRecord, NursingNote, UserProfile } from '../types';
import { Users, Search, Plus, AlertTriangle, ShieldAlert, BedDouble, X, FileDown, Share2, FileText, Pill, ClipboardList, CheckCircle2, Trash2, ArrowRightLeft, MapPin, Building2, Truck, Navigation } from 'lucide-react';
import { downloadPatientPDF, sharePatientPDF, downloadAllPatientsPDF } from '../utils/pdfExport';

interface PatientsViewProps {
  patients: PatientItem[];
  medications?: MedicationRecord[];
  notes?: NursingNote[];
  user?: UserProfile;
  onAddPatient: (p: PatientItem) => void;
  onUpdatePatient: (p: PatientItem) => void;
  onDeletePatient?: (id: string) => void;
  darkMode?: boolean;
}

export const PatientsView: React.FC<PatientsViewProps> = ({
  patients,
  medications = [],
  notes = [],
  user,
  onAddPatient,
  onUpdatePatient,
  onDeletePatient,
  darkMode
}) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatientForDetail, setSelectedPatientForDetail] = useState<PatientItem | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<PatientItem | null>(null);

  // TRANSFER MODAL STATE
  const [transferModalPatient, setTransferModalPatient] = useState<PatientItem | null>(null);
  const [transOriginHospital, setTransOriginHospital] = useState('');
  const [transOriginBedRoom, setTransOriginBedRoom] = useState('');
  const [transDestHospital, setTransDestHospital] = useState('');
  const [transDestBedRoom, setTransDestBedRoom] = useState('');
  const [transDestCity, setTransDestCity] = useState('');
  const [transDestNeighborhood, setTransDestNeighborhood] = useState('');
  const [transReason, setTransReason] = useState('');
  const [transTransportType, setTransTransportType] = useState('USA - Suporte Avançado (UTI Móvel)');
  const [transStaff, setTransStaff] = useState('');

  // NEW PATIENT FORM STATE
  const [name, setName] = useState('');
  const [medicalRecordNumber, setMedicalRecordNumber] = useState(`PRONT-${Math.floor(10000 + Math.random() * 90000)}`);
  const [bed, setBed] = useState('Leito 03');
  const [room, setRoom] = useState('UTI 01');
  const [age, setAge] = useState(55);
  const [sex, setSex] = useState<'M' | 'F' | 'Outro'>('M');
  const [diagnosis, setDiagnosis] = useState('');
  const [responsibleStaff, setResponsibleStaff] = useState(user?.name || 'Enfª. Amanda Oliveira');
  const [status, setStatus] = useState<PatientItem['status']>('UTI');
  const [allergyInput, setAllergyInput] = useState('');
  const [fallRisk, setFallRisk] = useState(true);
  const [pressureInjuryRisk, setPressureInjuryRisk] = useState(true);
  const [formNotes, setFormNotes] = useState('');

  // TRANSFER FORM FIELDS WHEN CREATING PATIENT
  const [newTransOriginHospital, setNewTransOriginHospital] = useState(user?.hospital || 'Hospital Geral de Urgência');
  const [newTransOriginBedRoom, setNewTransOriginBedRoom] = useState('Leito 03 (UTI 01)');
  const [newTransDestHospital, setNewTransDestHospital] = useState('');
  const [newTransDestBedRoom, setNewTransDestBedRoom] = useState('');
  const [newTransDestCity, setNewTransDestCity] = useState(user?.city || 'São Luís');
  const [newTransDestNeighborhood, setNewTransDestNeighborhood] = useState('Centro');
  const [newTransReason, setNewTransReason] = useState('Encaminhamento para leito de alta complexidade / UTI');
  const [newTransTransportType, setNewTransTransportType] = useState('USA - Suporte Avançado (UTI Móvel)');

  const openTransferModal = (patient: PatientItem) => {
    setTransferModalPatient(patient);
    const td = patient.transferDetails;
    setTransOriginHospital(td?.originHospital || user?.hospital || 'Hospital Origem');
    setTransOriginBedRoom(td?.originBedRoom || `${patient.bed} (${patient.room})`);
    setTransDestHospital(td?.destinationHospital || '');
    setTransDestBedRoom(td?.destinationBedRoom || '');
    setTransDestCity(td?.destinationCity || user?.city || 'São Luís');
    setTransDestNeighborhood(td?.destinationNeighborhood || 'Centro');
    setTransReason(td?.transferReason || 'Transferência para leito de especialidade');
    setTransTransportType(td?.transportType || 'USA - Suporte Avançado (UTI Móvel)');
    setTransStaff(td?.responsibleTransportStaff || user?.name || patient.responsibleStaff);
  };

  const handleSaveTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferModalPatient) return;

    const nowStr = new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const updatedP: PatientItem = {
      ...transferModalPatient,
      status: 'TRANSFERIDO',
      transferDetails: {
        originHospital: transOriginHospital,
        originBedRoom: transOriginBedRoom,
        destinationHospital: transDestHospital,
        destinationBedRoom: transDestBedRoom,
        destinationCity: transDestCity,
        destinationNeighborhood: transDestNeighborhood,
        transferReason: transReason,
        transportType: transTransportType,
        transferredAt: nowStr,
        responsibleTransportStaff: transStaff
      }
    };

    onUpdatePatient(updatedP);
    if (selectedPatientForDetail?.id === updatedP.id) {
      setSelectedPatientForDetail(updatedP);
    }
    setTransferModalPatient(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const nowStr = new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const newP: PatientItem = {
      id: `p_${Date.now()}`,
      name,
      medicalRecordNumber,
      bed,
      room,
      age: Number(age),
      sex,
      diagnosis: diagnosis || 'Diagnóstico sob avaliação institucional',
      responsibleStaff,
      status,
      allergyAlerts: allergyInput ? allergyInput.split(',').map(s => s.trim()) : [],
      fallRisk,
      pressureInjuryRisk,
      notes: formNotes,
      createdAt: new Date().toISOString().split('T')[0],
      transferDetails: status === 'TRANSFERIDO' ? {
        originHospital: newTransOriginHospital,
        originBedRoom: newTransOriginBedRoom || `${bed} (${room})`,
        destinationHospital: newTransDestHospital || 'Hospital Destino Indefinido',
        destinationBedRoom: newTransDestBedRoom || 'Leito Destino Indefinido',
        destinationCity: newTransDestCity || 'São Luís',
        destinationNeighborhood: newTransDestNeighborhood || 'Centro',
        transferReason: newTransReason,
        transportType: newTransTransportType,
        transferredAt: nowStr,
        responsibleTransportStaff: responsibleStaff
      } : undefined
    };

    onAddPatient(newP);
    setIsModalOpen(false);
    setName('');
    setDiagnosis('');
    setFormNotes('');
  };

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.medicalRecordNumber.toLowerCase().includes(search.toLowerCase()) ||
                          p.bed.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'TODOS' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-slide-up pb-24">
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="text-blue-500" size={22} /> Gestão de Pacientes & Leitos
          </h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Mapeamento de leitos, histórico clínico e exportação de Fichas Cadastrais em PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => downloadAllPatientsPDF(patients, medications, notes, user)}
            className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
            title="Exportar relatório completo de todos os pacientes em PDF"
          >
            <FileDown size={15} /> Baixar Relatório Geral (PDF)
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Plus size={16} /> Cadastrar Paciente
          </button>
        </div>
      </div>

      {/* BANNER AVISO COFEN & RECURSO DE PDF */}
      <div className="bg-blue-500/10 border border-blue-500/20 p-3.5 rounded-2xl text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} className="text-blue-500 shrink-0" />
          <p className="text-[11px] font-medium leading-relaxed">
            <strong>Fichas Cadastrais em PDF:</strong> Baixe ou compartilhe a ficha oficial do paciente contendo dados cadastrais, prescrições e evoluções de enfermagem em tempo real.
          </p>
        </div>
      </div>

      {/* BUSCA E FILTROS */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar paciente por nome, prontuário ou leito..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className={`w-full pl-10 pr-4 py-3 rounded-2xl text-xs font-medium border outline-none transition-all ${
              darkMode ? 'bg-slate-900 border-slate-800 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-800 focus:border-blue-500'
            }`}
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 no-scrollbar">
          {['TODOS', 'UTI', 'INTERNADO', 'ALTA', 'TRANSFERIDO'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                filterStatus === st 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : darkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* CARDS DE PACIENTES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPatients.map((patient) => {
          const pMeds = medications.filter(m => m.patientId === patient.id || m.patientName === patient.name);
          const pNotes = notes.filter(n => n.patientId === patient.id || n.patientName === patient.name);

          return (
            <div 
              key={patient.id}
              className={`p-5 rounded-3xl border space-y-3 relative overflow-hidden shadow-sm transition-all hover:border-blue-500 ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
              }`}
            >
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-slate-900 dark:text-white">{patient.name}</h3>
                    <span className="text-[10px] font-bold text-slate-400">({patient.age} anos, {patient.sex})</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 mt-0.5">
                    <span className="text-blue-600 dark:text-blue-400 font-mono">{patient.medicalRecordNumber}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><BedDouble size={13} /> {patient.bed} ({patient.room})</span>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                  patient.status === 'UTI' ? 'bg-rose-500/10 text-rose-600 font-black' :
                  patient.status === 'ALTA' ? 'bg-emerald-500/10 text-emerald-600' :
                  'bg-blue-500/10 text-blue-600'
                }`}>
                  {patient.status}
                </span>
              </div>

              {/* DIAGNÓSTICO INSTITUCIONAL */}
              <div className="space-y-1 text-xs">
                <span className="text-[10px] font-black uppercase text-slate-400">Diagnóstico da Instituição</span>
                <p className="font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                  {patient.diagnosis}
                </p>
              </div>

              {/* BADGES DE ALERTA DE SEGURANÇA */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {patient.allergyAlerts && patient.allergyAlerts.length > 0 && (
                  <span className="px-2.5 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black rounded-md text-[10px] uppercase flex items-center gap-1 border border-rose-500/20">
                    <AlertTriangle size={11} /> Alergia: {patient.allergyAlerts.join(', ')}
                  </span>
                )}

                {patient.fallRisk && (
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold rounded-md text-[10px] uppercase border border-amber-500/20">
                    ⚠️ Risco de Queda
                  </span>
                )}

                {patient.pressureInjuryRisk && (
                  <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold rounded-md text-[10px] uppercase border border-purple-500/20">
                    🩺 Risco LPP
                  </span>
                )}
              </div>

              {/* PAINEL DE ROTA DE TRANSFERÊNCIA (CASO PACIENTE SEJA TRANSFERIDO OU TENHA DADOS DE TRANSFERÊNCIA) */}
              {(patient.status === 'TRANSFERIDO' || patient.transferDetails) && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs space-y-1 text-amber-900 dark:text-amber-200">
                  <div className="flex items-center justify-between font-black text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    <span className="flex items-center gap-1"><ArrowRightLeft size={13} /> Ficha de Transferência / Destino</span>
                    <span className="font-mono">{patient.transferDetails?.transferredAt || 'Registrado'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="bg-white/60 dark:bg-slate-800/60 p-2 rounded-xl border border-amber-500/20">
                      <span className="text-[9px] font-black uppercase text-slate-400 block">De (Origem):</span>
                      <strong className="text-slate-800 dark:text-slate-200 block truncate">{patient.transferDetails?.originHospital || user?.hospital || 'Hospital Origem'}</strong>
                      <span className="text-[10px] font-bold text-slate-500">{patient.transferDetails?.originBedRoom || `${patient.bed} (${patient.room})`}</span>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 p-2 rounded-xl border border-amber-500/20">
                      <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 block">Para (Destino):</span>
                      <strong className="text-slate-900 dark:text-white block truncate">{patient.transferDetails?.destinationHospital || 'Hospital Destino'}</strong>
                      <span className="text-[10px] font-bold text-slate-500">{patient.transferDetails?.destinationBedRoom || 'Leito Destino'}</span>
                    </div>
                  </div>
                  {(patient.transferDetails?.destinationCity || patient.transferDetails?.destinationNeighborhood) && (
                    <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 pt-1 border-t border-amber-500/10">
                      <MapPin size={12} className="text-rose-500 shrink-0" />
                      <span>Cidade Destino: <strong>{patient.transferDetails?.destinationCity || 'Não informada'}</strong> | Bairro: <strong>{patient.transferDetails?.destinationNeighborhood || 'Não informado'}</strong></span>
                    </div>
                  )}
                </div>
              )}

              {/* BOTÕES DE AÇÃO: EXPORTAR FICHA EM PDF / TRANSFERIR / COMPARTILHAR / EXCLUIR */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setSelectedPatientForDetail(patient)}
                  className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-[11px] transition-all flex items-center justify-center gap-1.5"
                >
                  <FileText size={13} className="text-blue-500" /> Ver Ficha
                </button>

                <button
                  onClick={() => openTransferModal(patient)}
                  className="py-2 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-[11px] transition-all flex items-center justify-center gap-1 shadow-md shadow-amber-500/20 active:scale-95"
                  title="Registrar ou Editar Ficha de Transferência (Origem e Destino)"
                >
                  <ArrowRightLeft size={13} /> {patient.status === 'TRANSFERIDO' ? 'Editar Rota' : 'Transferir'}
                </button>

                <button
                  onClick={() => downloadPatientPDF(patient, pMeds, pNotes, user)}
                  className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[11px] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95"
                  title="Salvar Ficha Cadastral em PDF"
                >
                  <FileDown size={13} /> PDF
                </button>

                <button
                  onClick={() => sharePatientPDF(patient, pMeds, pNotes, user)}
                  className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[11px] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-95"
                  title="Salvar e Enviar PDF via WhatsApp ou Email"
                >
                  <Share2 size={13} /> Enviar
                </button>

                {onDeletePatient && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPatientToDelete(patient);
                    }}
                    className="py-2 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold rounded-xl text-[11px] transition-all flex items-center justify-center gap-1"
                    title="Excluir Ficha do Paciente"
                  >
                    <Trash2 size={13} /> Excluir
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold pt-1">
                <span>Responsável: {patient.responsibleStaff}</span>
                <span>Cadastrado: {patient.createdAt}</span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredPatients.length === 0 && (
        <div className={`p-8 text-center rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'} space-y-3`}>
          <Users size={40} className="mx-auto text-slate-400 opacity-60" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Nenhuma ficha de paciente cadastrada.
          </p>
          <p className="text-xs">
            As fichas de teste foram removidas para evitar confusões. Clique no botão abaixo para cadastrar novos pacientes.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition-all uppercase tracking-wider"
          >
            <Plus size={15} /> Cadastrar Novo Paciente
          </button>
        </div>
      )}

      {/* MODAL DE DETALHES / FICHA CADASTRAL COMPLETA DO PACIENTE */}
      {selectedPatientForDetail && (
        <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl rounded-[2.5rem] p-6 space-y-5 shadow-2xl border relative max-h-[90vh] overflow-y-auto animate-slide-up ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
          }`}>
            <button 
              onClick={() => setSelectedPatientForDetail(null)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 dark:bg-slate-800 rounded-full"
            >
              <X size={18} />
            </button>

            <div className="flex items-center justify-between border-b pb-4 border-slate-100 dark:border-slate-800 pr-8">
              <div>
                <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-600 font-black rounded-md text-[10px] uppercase tracking-wider">
                  Ficha Cadastral do Paciente
                </span>
                <h2 className="text-lg font-black uppercase text-slate-900 dark:text-white mt-1">
                  {selectedPatientForDetail.name}
                </h2>
                <p className="text-xs font-mono text-blue-600 dark:text-blue-400 font-bold">
                  Prontuário: {selectedPatientForDetail.medicalRecordNumber} | Leito: {selectedPatientForDetail.bed}
                </p>
              </div>

              {/* BOTOES DE PDF NO HEADER DO MODAL */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const pMeds = medications.filter(m => m.patientId === selectedPatientForDetail.id || m.patientName === selectedPatientForDetail.name);
                    const pNotes = notes.filter(n => n.patientId === selectedPatientForDetail.id || n.patientName === selectedPatientForDetail.name);
                    downloadPatientPDF(selectedPatientForDetail, pMeds, pNotes, user);
                  }}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase flex items-center gap-1.5 shadow-md active:scale-95"
                >
                  <FileDown size={14} /> Baixar PDF
                </button>

                <button
                  onClick={() => {
                    const pMeds = medications.filter(m => m.patientId === selectedPatientForDetail.id || m.patientName === selectedPatientForDetail.name);
                    const pNotes = notes.filter(n => n.patientId === selectedPatientForDetail.id || n.patientName === selectedPatientForDetail.name);
                    sharePatientPDF(selectedPatientForDetail, pMeds, pNotes, user);
                  }}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs uppercase flex items-center gap-1.5 shadow-md active:scale-95"
                >
                  <Share2 size={14} /> Enviar PDF
                </button>
              </div>
            </div>

            {/* CONTEÚDO DA FICHA CADASTRAL */}
            <div className="space-y-4 text-xs">
              {/* DADOS GERAIS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase">Idade & Sexo</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedPatientForDetail.age} anos ({selectedPatientForDetail.sex})</span>
                </div>
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase">Status</span>
                  <span className="font-bold text-blue-600">{selectedPatientForDetail.status}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase">Quarto/Unidade</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedPatientForDetail.room}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase">Enf. Responsável</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedPatientForDetail.responsibleStaff}</span>
                </div>
              </div>

              {/* FICHA DE TRANSFERÊNCIA DE PACIENTE (ORIGEM E DESTINO) */}
              {(selectedPatientForDetail.status === 'TRANSFERIDO' || selectedPatientForDetail.transferDetails) && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                    <span className="font-black text-xs uppercase text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <ArrowRightLeft size={16} /> Ficha Oficial de Transferência do Paciente
                    </span>
                    <button
                      onClick={() => openTransferModal(selectedPatientForDetail)}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] uppercase rounded-lg shadow transition-all"
                    >
                      Editar Dados da Transferência
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white/70 dark:bg-slate-800/80 rounded-xl border border-amber-500/20 space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Hospital & Leito de Origem</span>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {selectedPatientForDetail.transferDetails?.originHospital || user?.hospital || 'Hospital Origem'}
                      </p>
                      <p className="text-slate-500 font-medium">
                        Leito/Quarto: {selectedPatientForDetail.transferDetails?.originBedRoom || `${selectedPatientForDetail.bed} (${selectedPatientForDetail.room})`}
                      </p>
                    </div>

                    <div className="p-3 bg-white/70 dark:bg-slate-800/80 rounded-xl border border-amber-500/20 space-y-1">
                      <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 block">Hospital & Leito de Destino</span>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {selectedPatientForDetail.transferDetails?.destinationHospital || 'Hospital Destino Não Informado'}
                      </p>
                      <p className="text-slate-500 font-medium">
                        Leito/Quarto: {selectedPatientForDetail.transferDetails?.destinationBedRoom || 'A definir'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    <div className="p-2.5 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-amber-500/10">
                      <span className="text-[9px] font-black uppercase text-slate-400 block">Localidade do Destino</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                        <MapPin size={13} className="text-rose-500" /> Cidade: {selectedPatientForDetail.transferDetails?.destinationCity || 'Não informada'} | Bairro: {selectedPatientForDetail.transferDetails?.destinationNeighborhood || 'Não informado'}
                      </p>
                    </div>

                    <div className="p-2.5 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-amber-500/10">
                      <span className="text-[9px] font-black uppercase text-slate-400 block">Meio de Transporte & Resp.</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                        <Truck size={13} className="text-amber-600" /> {selectedPatientForDetail.transferDetails?.transportType || 'Suporte Avançado'} ({selectedPatientForDetail.transferDetails?.responsibleTransportStaff || selectedPatientForDetail.responsibleStaff})
                      </p>
                    </div>
                  </div>

                  {selectedPatientForDetail.transferDetails?.transferReason && (
                    <div className="text-[11px] p-2.5 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-amber-500/10 text-slate-700 dark:text-slate-300">
                      <strong>Motivo da Transferência:</strong> {selectedPatientForDetail.transferDetails.transferReason}
                    </div>
                  )}
                </div>
              )}

              {/* DIAGNÓSTICO */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="block text-[10px] font-black text-slate-400 uppercase">Diagnóstico Institucional</span>
                <p className="font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                  {selectedPatientForDetail.diagnosis}
                </p>
              </div>

              {/* MEDICAMENTOS DO PACIENTE */}
              <div className="space-y-2">
                <h4 className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Pill size={14} className="text-rose-500" /> Prescrição de Medicamentos Registrada
                </h4>
                {(() => {
                  const pMeds = medications.filter(m => m.patientId === selectedPatientForDetail.id || m.patientName === selectedPatientForDetail.name);
                  if (pMeds.length === 0) {
                    return <p className="text-slate-400 italic text-[11px] p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">Nenhum medicamento registrado para este paciente.</p>;
                  }
                  return (
                    <div className="space-y-1.5">
                      {pMeds.map(m => (
                        <div key={m.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">{m.medicationName}</span>
                            <span className="text-slate-400 ml-2">({m.dosage} - Via {m.route})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-500 font-bold">{m.scheduledTime}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                              m.status === 'ADMINISTRADO' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                            }`}>
                              {m.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* EVOLUÇÃO E ANOTAÇÕES */}
              <div className="space-y-2">
                <h4 className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ClipboardList size={14} className="text-purple-500" /> Evoluções & Anotações de Enfermagem
                </h4>
                {(() => {
                  const pNotes = notes.filter(n => n.patientId === selectedPatientForDetail.id || n.patientName === selectedPatientForDetail.name);
                  if (pNotes.length === 0) {
                    return <p className="text-slate-400 italic text-[11px] p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">Nenhuma anotação registrada ainda.</p>;
                  }
                  return (
                    <div className="space-y-2">
                      {pNotes.map(n => (
                        <div key={n.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] space-y-1">
                          <div className="flex items-center justify-between font-bold text-[10px] text-slate-400">
                            <span>{n.entryType} • {n.timestamp}</span>
                            <span>{n.professionalName} ({n.corenNumber})</span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300">{n.content}</p>
                          <p className="text-[9px] text-emerald-600 font-mono">HASH: {n.digitalSignatureHash}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* RODAPÉ DO MODAL DE FICHA */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedPatientForDetail(null)}
                className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-bold rounded-2xl text-xs uppercase"
              >
                Fechar
              </button>

              <button
                onClick={() => {
                  const pMeds = medications.filter(m => m.patientId === selectedPatientForDetail.id || m.patientName === selectedPatientForDetail.name);
                  const pNotes = notes.filter(n => n.patientId === selectedPatientForDetail.id || n.patientName === selectedPatientForDetail.name);
                  sharePatientPDF(selectedPatientForDetail, pMeds, pNotes, user);
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-xs uppercase shadow-lg shadow-blue-600/20 active:scale-95 flex items-center gap-1.5"
              >
                <Share2 size={15} /> Salvar e Enviar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CADASTRO DE PACIENTE */}
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
              <Users size={20} className="text-blue-500" /> Cadastrar Novo Paciente
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Nome Completo do Paciente</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required
                  placeholder="Ex: João da Silva"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-blue-500" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Número do Prontuário</label>
                  <input 
                    type="text" 
                    value={medicalRecordNumber} 
                    onChange={(e) => setMedicalRecordNumber(e.target.value)} 
                    required
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-blue-500" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Status Internação</label>
                  <select 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-blue-500"
                  >
                    <option value="UTI">UTI Adulto / Pediátrica</option>
                    <option value="INTERNADO">Enfermaria / Leito</option>
                    <option value="ALTA">Alta Médica</option>
                    <option value="TRANSFERIDO">Transferido</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Leito</label>
                  <input 
                    type="text" 
                    value={bed} 
                    onChange={(e) => setBed(e.target.value)} 
                    required
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-blue-500" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Quarto/Unidade</label>
                  <input 
                    type="text" 
                    value={room} 
                    onChange={(e) => setRoom(e.target.value)} 
                    required
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-blue-500" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Idade</label>
                  <input 
                    type="number" 
                    value={age} 
                    onChange={(e) => setAge(Number(e.target.value))} 
                    required
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-blue-500" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Diagnóstico (Fornecido pelo Hospital)</label>
                <textarea 
                  rows={2}
                  value={diagnosis} 
                  onChange={(e) => setDiagnosis(e.target.value)} 
                  placeholder="Ex: Pós-op de Apendicectomia, hipertensão controlada..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-blue-500" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Alergias (separadas por vírgula)</label>
                <input 
                  type="text" 
                  value={allergyInput} 
                  onChange={(e) => setAllergyInput(e.target.value)} 
                  placeholder="Ex: Dipirona, Penicilina, Iodo"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-blue-500" 
                />
              </div>

              <div className="flex items-center gap-4 py-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                  <input type="checkbox" checked={fallRisk} onChange={(e) => setFallRisk(e.target.checked)} className="rounded" />
                  <span>Risco de Queda</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                  <input type="checkbox" checked={pressureInjuryRisk} onChange={(e) => setPressureInjuryRisk(e.target.checked)} className="rounded" />
                  <span>Risco de Lesão por Pressão (LPP)</span>
                </label>
              </div>

              {status === 'TRANSFERIDO' && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3 my-2">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase text-amber-700 dark:text-amber-400 border-b border-amber-500/20 pb-2">
                    <ArrowRightLeft size={16} /> Rota e Ficha de Transferência do Paciente
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">Hospital Origem</label>
                      <input 
                        type="text" 
                        value={newTransOriginHospital} 
                        onChange={(e) => setNewTransOriginHospital(e.target.value)} 
                        placeholder="Ex: Hospital Municipal"
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">Leito/Quarto Origem</label>
                      <input 
                        type="text" 
                        value={newTransOriginBedRoom} 
                        onChange={(e) => setNewTransOriginBedRoom(e.target.value)} 
                        placeholder="Ex: Leito 03 (UTI 01)"
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase ml-1 mb-1">Hospital / Unidade Destino</label>
                      <input 
                        type="text" 
                        value={newTransDestHospital} 
                        onChange={(e) => setNewTransDestHospital(e.target.value)} 
                        placeholder="Ex: Hospital de Traumatologia"
                        required
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase ml-1 mb-1">Leito / Quarto Destino</label>
                      <input 
                        type="text" 
                        value={newTransDestBedRoom} 
                        onChange={(e) => setNewTransDestBedRoom(e.target.value)} 
                        placeholder="Ex: Leito 12 / Quarto 304"
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">Cidade Destino</label>
                      <input 
                        type="text" 
                        value={newTransDestCity} 
                        onChange={(e) => setNewTransDestCity(e.target.value)} 
                        placeholder="Ex: São Luís"
                        required
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">Bairro Destino</label>
                      <input 
                        type="text" 
                        value={newTransDestNeighborhood} 
                        onChange={(e) => setNewTransDestNeighborhood(e.target.value)} 
                        placeholder="Ex: Renascença"
                        required
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">Tipo de Transporte</label>
                      <select 
                        value={newTransTransportType} 
                        onChange={(e) => setNewTransTransportType(e.target.value)} 
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                      >
                        <option value="USA - Suporte Avançado (UTI Móvel)">USA - Suporte Avançado (UTI Móvel)</option>
                        <option value="USB - Suporte Básico">USB - Suporte Básico</option>
                        <option value="Ambulância Simples">Ambulância Simples</option>
                        <option value="Transferência Interna (Maca/Cadeira)">Transferência Interna (Maca/Cadeira)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">Motivo da Transferência</label>
                      <input 
                        type="text" 
                        value={newTransReason} 
                        onChange={(e) => setNewTransReason(e.target.value)} 
                        placeholder="Ex: Leito de UTI especializado"
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium" 
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black p-3.5 rounded-2xl uppercase tracking-wider shadow-lg shadow-blue-600/20 active:scale-95 transition-all mt-2"
              >
                Confirmar Cadastro de Paciente
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE DADOS DE TRANSFERÊNCIA DE PACIENTE (ORIGEM -> DESTINO, LEITO, CIDADE E BAIRRO) */}
      {transferModalPatient && (
        <div className="fixed inset-0 z-[160] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-[2.5rem] p-6 space-y-5 shadow-2xl border relative max-h-[90vh] overflow-y-auto animate-slide-up ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
          }`}>
            <button 
              onClick={() => setTransferModalPatient(null)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 dark:bg-slate-800 rounded-full"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 border-b border-amber-500/20 pb-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-2xl">
                <ArrowRightLeft size={20} />
              </div>
              <div>
                <h3 className="text-base font-black uppercase text-slate-900 dark:text-white">
                  Ficha de Transferência de Paciente
                </h3>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                  {transferModalPatient.name} ({transferModalPatient.medicalRecordNumber})
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveTransfer} className="space-y-3 text-xs">
              {/* DADOS DE ORIGEM */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                  <Building2 size={12} /> Origem (Hospital e Leito Atual)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Hospital de Origem</label>
                    <input 
                      type="text" 
                      value={transOriginHospital} 
                      onChange={(e) => setTransOriginHospital(e.target.value)} 
                      required
                      placeholder="Ex: Hospital Municipal"
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium" 
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Leito / Quarto Origem</label>
                    <input 
                      type="text" 
                      value={transOriginBedRoom} 
                      onChange={(e) => setTransOriginBedRoom(e.target.value)} 
                      required
                      placeholder="Ex: Leito 03 (UTI 01)"
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium" 
                    />
                  </div>
                </div>
              </div>

              {/* DADOS DE DESTINO */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2">
                <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <Navigation size={12} /> Destino (Hospital, Leito, Cidade e Bairro)
                </span>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase mb-1">Hospital de Destino</label>
                    <input 
                      type="text" 
                      value={transDestHospital} 
                      onChange={(e) => setTransDestHospital(e.target.value)} 
                      required
                      placeholder="Ex: Hospital de Traumatologia"
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium" 
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase mb-1">Leito / Quarto Destino</label>
                    <input 
                      type="text" 
                      value={transDestBedRoom} 
                      onChange={(e) => setTransDestBedRoom(e.target.value)} 
                      required
                      placeholder="Ex: Leito 12 / Quarto 304"
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Cidade de Destino</label>
                    <input 
                      type="text" 
                      value={transDestCity} 
                      onChange={(e) => setTransDestCity(e.target.value)} 
                      required
                      placeholder="Ex: São Luís"
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium" 
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Bairro de Destino</label>
                    <input 
                      type="text" 
                      value={transDestNeighborhood} 
                      onChange={(e) => setTransDestNeighborhood(e.target.value)} 
                      required
                      placeholder="Ex: Renascença"
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium" 
                    />
                  </div>
                </div>
              </div>

              {/* DETALHES DE TRANSPORTE E MOTIVO */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Tipo de Transporte</label>
                  <select 
                    value={transTransportType} 
                    onChange={(e) => setTransTransportType(e.target.value)} 
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                  >
                    <option value="USA - Suporte Avançado (UTI Móvel)">USA - Suporte Avançado (UTI Móvel)</option>
                    <option value="USB - Suporte Básico">USB - Suporte Básico</option>
                    <option value="Ambulância Simples">Ambulância Simples</option>
                    <option value="Transferência Interna (Maca/Cadeira)">Transferência Interna (Maca/Cadeira)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Responsável Transporte</label>
                  <input 
                    type="text" 
                    value={transStaff} 
                    onChange={(e) => setTransStaff(e.target.value)} 
                    required
                    placeholder="Ex: Enf. Marcos / Equipe SAMU"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Motivo da Transferência</label>
                <textarea 
                  rows={2}
                  value={transReason} 
                  onChange={(e) => setTransReason(e.target.value)} 
                  placeholder="Ex: Encaminhado para vaga de UTI de alta complexidade ortopédica..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium" 
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black p-3.5 rounded-2xl uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all mt-2 flex items-center justify-center gap-2"
              >
                <ArrowRightLeft size={16} /> Salvar Ficha de Transferência
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE PACIENTE */}
      {patientToDelete && (
        <div className="fixed inset-0 z-[180] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-[2.5rem] p-6 space-y-4 shadow-2xl border text-center relative animate-slide-up ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
          }`}>
            <div className="w-14 h-14 bg-rose-500/10 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={26} />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black uppercase text-slate-900 dark:text-white">
                Excluir Ficha do Paciente?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Tem certeza que deseja excluir permanentemente o cadastro do paciente <strong className="text-slate-800 dark:text-slate-200">{patientToDelete.name}</strong> ({patientToDelete.medicalRecordNumber})?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setPatientToDelete(null)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (onDeletePatient && patientToDelete) {
                    onDeletePatient(patientToDelete.id);
                  }
                  if (selectedPatientForDetail?.id === patientToDelete.id) {
                    setSelectedPatientForDetail(null);
                  }
                  setPatientToDelete(null);
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
