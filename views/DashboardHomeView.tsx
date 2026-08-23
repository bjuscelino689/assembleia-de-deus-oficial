import React from 'react';
import { UserProfile, ShiftItem, PatientItem, MedicationRecord, NursingNote } from '../types';
import { 
  Calendar, Users, Pill, FileText, Sparkles, Calculator, 
  CheckSquare, MessageSquare, Folder, Activity, ShieldCheck, 
  ChevronRight, Clock, AlertTriangle, HeartPulse, Building2, ShieldAlert,
  ArrowRight, Plus, FileDown, Share2, Camera
} from 'lucide-react';
import { downloadAllPatientsPDF, sharePatientPDF } from '../utils/pdfExport';

interface DashboardHomeViewProps {
  user: UserProfile;
  shifts: ShiftItem[];
  patients: PatientItem[];
  medications: MedicationRecord[];
  notes: NursingNote[];
  onNavigate: (view: string) => void;
  onOpenLegal: () => void;
  darkMode?: boolean;
}

export const DashboardHomeView: React.FC<DashboardHomeViewProps> = ({
  user,
  shifts,
  patients,
  medications,
  notes,
  onNavigate,
  onOpenLegal,
  darkMode
}) => {
  const activeShift = shifts.find(s => s.status === 'EM_ANDAMENTO') || shifts[0];
  const pendingMeds = medications.filter(m => m.status === 'PENDENTE');
  const utiPatients = patients.filter(p => p.status === 'UTI');

  return (
    <div className="space-y-6 animate-slide-up pb-24">
      {/* CARD DE AVISO DE BOAS-VINDAS E AGUARDANDO LIBERAÇÃO DE ACESSO DE NOVO ENFERMEIRO */}
      {user.accessStatus === 'PENDENTE_LIBERACAO' && (
        <section className="p-5 sm:p-6 rounded-[2.5rem] bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white shadow-xl border border-amber-400/30 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md shrink-0">
              <Clock size={24} className="animate-spin-slow" />
            </div>
            <div>
              <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-wider text-amber-100">
                🎉 Bem-vindo(a) ao Meu Plantão PRO
              </span>
              <h3 className="text-lg sm:text-xl font-black tracking-tight mt-0.5">
                Aguardando Liberação de Acesso
              </h3>
            </div>
          </div>

          <p className="text-xs sm:text-sm font-medium text-amber-50 leading-relaxed bg-black/10 p-4 rounded-2xl border border-white/10">
            Olá, <strong>{user.name}</strong>! Seu cadastro foi recebido com sucesso no sistema. A sua conta está no status <strong>AGUARDANDO LIBERAÇÃO DE ACESSO</strong> pelo Administrador Master em até 12h. Para liberação imediata, você também pode enviar uma mensagem direta para o WhatsApp: <strong>(98) 97008-4240</strong>.
          </p>
        </section>
      )}

      {/* CARD DE BOAS-VINDAS & SHIFT STATUS */}
      <section className={`p-6 rounded-[2.5rem] border relative overflow-hidden shadow-xl ${
        darkMode 
          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-800 text-white' 
          : 'bg-gradient-to-br from-emerald-600 via-teal-700 to-blue-800 border-emerald-500/20 text-white'
      }`}>
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Activity size={180} />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="px-3.5 py-1.5 bg-white/15 backdrop-blur-md text-emerald-100 text-[10px] font-black uppercase tracking-widest rounded-full border border-white/20 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-300" /> COREN Regularizado • LGPD Ativo
            </span>
            <span className="text-[11px] font-bold text-emerald-100/80 flex items-center gap-1">
              <Building2 size={13} /> {user.hospital}
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Olá, {user.name.split(' ')[0]}! 👋
            </h1>
            <p className="text-xs sm:text-sm font-medium text-emerald-100/90 mt-1 max-w-xl">
              Tenha um excelente plantão. Seu painel profissional está sincronizado com a equipe do hospital.
            </p>
          </div>

          {/* CARD DE PLANTÃO ATIVO */}
          {activeShift ? (
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-300 flex items-center gap-1">
                  <Clock size={12} /> Plantão Atual ({activeShift.shiftType.replace('_', ' ')})
                </span>
                <h4 className="font-black text-sm text-white">{activeShift.unitSector}</h4>
                <p className="text-xs text-emerald-100/90 font-medium">Horário: {activeShift.startTime}h às {activeShift.endTime}h • {activeShift.hospitalName}</p>
              </div>

              <button
                onClick={() => onNavigate('shifts')}
                className="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 font-black rounded-xl text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all shrink-0 flex items-center gap-1.5"
              >
                Ver Escala Completa <ChevronRight size={14} />
              </button>
            </div>
          ) : (
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 text-xs font-bold text-emerald-100 flex items-center justify-between">
              <span>Nenhum plantão em andamento agendado para hoje.</span>
              <button onClick={() => onNavigate('shifts')} className="underline font-black">Agendar Plantão</button>
            </div>
          )}
        </div>
      </section>

      {/* PAINEL DE SALVAMENTO E ENVIO EM PDF - ACESSO RÁPIDO */}
      <section className={`p-4 sm:p-5 rounded-3xl border shadow-lg transition-all ${
        darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white border-slate-800'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 border border-emerald-500/30">
              <FileDown size={13} /> Exportação PDF Integrada
            </span>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
              Salvar & Enviar Fichas Cadastrais em PDF
            </h3>
            <p className="text-xs text-slate-300 font-medium">
              Gere relatórios completos com dados do paciente, medicamentos aprazados e evoluções em formato PDF oficial.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={() => downloadAllPatientsPDF(patients, medications, notes, user)}
              className="flex-1 md:flex-initial px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <FileDown size={16} /> Baixar Todas as Fichas (PDF)
            </button>

            {patients.length > 0 && (
              <button
                onClick={() => sharePatientPDF(patients[0], medications, notes, user)}
                className="flex-1 md:flex-initial px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Share2 size={16} /> Enviar PDF (WhatsApp/Email)
              </button>
            )}
          </div>
        </div>
      </section>

      {/* BANNER DE COMPLIANCE & LEGALIDADE */}
      <section className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
        <div className="flex items-center gap-2.5">
          <ShieldAlert size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="font-medium text-[11px] leading-relaxed">
            <strong>AVISO LEGAL & ÉTICA COFEN:</strong> As informações registradas são exclusivamente documentais. Este aplicativo não emite diagnósticos médicos nem prescreve tratamentos.
          </p>
        </div>
        <button 
          onClick={onOpenLegal} 
          className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 underline shrink-0 hover:text-amber-800"
        >
          Ler Termos LGPD
        </button>
      </section>

      {/* METRICAS RAPIDAS */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div 
          onClick={() => onNavigate('patients')}
          className={`p-4 rounded-2xl border cursor-pointer hover:border-emerald-500 transition-all shadow-sm ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">Pacientes Acompanhados</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl"><Users size={16} /></div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{patients.length}</p>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{utiPatients.length} em Leito UTI</span>
        </div>

        <div 
          onClick={() => onNavigate('medications')}
          className={`p-4 rounded-2xl border cursor-pointer hover:border-blue-500 transition-all shadow-sm ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">Medicações Pendentes</span>
            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl"><Pill size={16} /></div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{pendingMeds.length}</p>
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Próxima em breve</span>
        </div>

        <div 
          onClick={() => onNavigate('notes')}
          className={`p-4 rounded-2xl border cursor-pointer hover:border-purple-500 transition-all shadow-sm ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">Evoluções Assinadas</span>
            <div className="p-2 bg-purple-500/10 text-purple-600 rounded-xl"><FileText size={16} /></div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{notes.length}</p>
          <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">Assinatura Digital OK</span>
        </div>

        <div 
          onClick={() => onNavigate('ai')}
          className={`p-4 rounded-2xl border cursor-pointer hover:border-teal-500 transition-all shadow-sm ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">Florence AI Assistant</span>
            <div className="p-2 bg-teal-500/10 text-teal-600 rounded-xl"><Sparkles size={16} /></div>
          </div>
          <p className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-2">IA Ativa</p>
          <span className="text-[10px] font-bold text-slate-400">Tirar Dúvidas / Fórmulas</span>
        </div>
      </section>

      {/* GRID DE MÓDULOS PRINCIPAIS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Módulos Clínicos & Operacionais
          </h2>
          <span className="text-[10px] font-bold text-slate-400">Meu Plantão Pro 2026</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* BOTÃO AGENDA DE PLANTÕES */}
          <div 
            onClick={() => onNavigate('shifts')}
            className={`p-4 rounded-2xl border cursor-pointer hover:scale-[1.02] active:scale-95 transition-all shadow-sm flex flex-col justify-between group ${
              darkMode ? 'bg-slate-900 border-slate-800 hover:border-emerald-500' : 'bg-white border-slate-100 hover:border-emerald-500'
            }`}
          >
            <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl w-fit group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <Calendar size={22} />
            </div>
            <div className="mt-4">
              <h3 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-tight">Escala de Plantões</h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Gestão de turnos 12x36, troca e relatórios</p>
            </div>
          </div>

          {/* BOTÃO GESTÃO DE PACIENTES */}
          <div 
            onClick={() => onNavigate('patients')}
            className={`p-4 rounded-2xl border cursor-pointer hover:scale-[1.02] active:scale-95 transition-all shadow-sm flex flex-col justify-between group ${
              darkMode ? 'bg-slate-900 border-slate-800 hover:border-blue-500' : 'bg-white border-slate-100 hover:border-blue-500'
            }`}
          >
            <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl w-fit group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <Users size={22} />
            </div>
            <div className="mt-4">
              <h3 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-tight">Prontuário & Pacientes</h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Leitos, UTI, riscos de queda e alergias</p>
            </div>
          </div>

          {/* BOTÃO CONTROLE DE MEDICAÇÃO */}
          <div 
            onClick={() => onNavigate('medications')}
            className={`p-4 rounded-2xl border cursor-pointer hover:scale-[1.02] active:scale-95 transition-all shadow-sm flex flex-col justify-between group ${
              darkMode ? 'bg-slate-900 border-slate-800 hover:border-rose-500' : 'bg-white border-slate-100 hover:border-rose-500'
            }`}
          >
            <div className="p-3 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl w-fit group-hover:bg-rose-500 group-hover:text-white transition-colors">
              <Pill size={22} />
            </div>
            <div className="mt-4">
              <h3 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-tight">Horário de Medicação</h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Vias EV, IM, VO e alertas de aprazamento</p>
            </div>
          </div>

          {/* BOTÃO ANOTAÇÕES DE ENFERMAGEM */}
          <div 
            onClick={() => onNavigate('notes')}
            className={`p-4 rounded-2xl border cursor-pointer hover:scale-[1.02] active:scale-95 transition-all shadow-sm flex flex-col justify-between group ${
              darkMode ? 'bg-slate-900 border-slate-800 hover:border-purple-500' : 'bg-white border-slate-100 hover:border-purple-500'
            }`}
          >
            <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl w-fit group-hover:bg-purple-500 group-hover:text-white transition-colors">
              <FileText size={22} />
            </div>
            <div className="mt-4">
              <h3 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-tight">Evolução & Anotações</h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Assinatura digital COREN e registro SOAP</p>
            </div>
          </div>

          {/* BOTÃO CALCULADORAS E ESCALAS */}
          <div 
            onClick={() => onNavigate('calculators')}
            className={`p-4 rounded-2xl border cursor-pointer hover:scale-[1.02] active:scale-95 transition-all shadow-sm flex flex-col justify-between group ${
              darkMode ? 'bg-slate-900 border-slate-800 hover:border-amber-500' : 'bg-white border-slate-100 hover:border-amber-500'
            }`}
          >
            <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl w-fit group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <Calculator size={22} />
            </div>
            <div className="mt-4">
              <h3 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-tight">Calculadoras & Escalas</h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Gotejamento, Glasgow, Braden e Fugulin</p>
            </div>
          </div>

          {/* BOTÃO CHECKLISTS */}
          <div 
            onClick={() => onNavigate('checklists')}
            className={`p-4 rounded-2xl border cursor-pointer hover:scale-[1.02] active:scale-95 transition-all shadow-sm flex flex-col justify-between group ${
              darkMode ? 'bg-slate-900 border-slate-800 hover:border-indigo-500' : 'bg-white border-slate-100 hover:border-indigo-500'
            }`}
          >
            <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl w-fit group-hover:bg-indigo-500 group-hover:text-white transition-colors">
              <CheckSquare size={22} />
            </div>
            <div className="mt-4">
              <h3 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-tight">Checklists de Plantão</h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">SBAR, Carrinho de Parada e UTI</p>
            </div>
          </div>

          {/* BOTÃO CHAT DA EQUIPE */}
          <div 
            onClick={() => onNavigate('chat')}
            className={`p-4 rounded-2xl border cursor-pointer hover:scale-[1.02] active:scale-95 transition-all shadow-sm flex flex-col justify-between group ${
              darkMode ? 'bg-slate-900 border-slate-800 hover:border-teal-500' : 'bg-white border-slate-100 hover:border-teal-500'
            }`}
          >
            <div className="p-3 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-2xl w-fit group-hover:bg-teal-500 group-hover:text-white transition-colors">
              <MessageSquare size={22} />
            </div>
            <div className="mt-4">
              <h3 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-tight">Chat & Passagem</h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Comunicação criptografada da equipe</p>
            </div>
          </div>

          {/* BOTÃO DOCUMENTOS & POPS */}
          <div 
            onClick={() => onNavigate('documents')}
            className={`p-4 rounded-2xl border cursor-pointer hover:scale-[1.02] active:scale-95 transition-all shadow-sm flex flex-col justify-between group ${
              darkMode ? 'bg-slate-900 border-slate-800 hover:border-cyan-500' : 'bg-white border-slate-100 hover:border-cyan-500'
            }`}
          >
            <div className="p-3 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-2xl w-fit group-hover:bg-cyan-500 group-hover:text-white transition-colors">
              <Folder size={22} />
            </div>
            <div className="mt-4">
              <h3 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-tight">Biblioteca & POPs</h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Manuais e protocolos de procedimentos</p>
            </div>
          </div>

          {/* BOTÃO MURAL DE FOTOS E VÍDEOS */}
          <div 
            onClick={() => onNavigate('media')}
            className={`p-4 rounded-2xl border cursor-pointer hover:scale-[1.02] active:scale-95 transition-all shadow-sm flex flex-col justify-between group ${
              darkMode ? 'bg-slate-900 border-slate-800 hover:border-emerald-500' : 'bg-white border-slate-100 hover:border-emerald-500'
            }`}
          >
            <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl w-fit group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <Camera size={22} />
            </div>
            <div className="mt-4">
              <h3 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-tight">Mural Fotos & Vídeos</h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Postagem de fotos e vídeos do plantão</p>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO DE ÚLTIMOS REGISTROS DO PLANTÃO */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Últimas Anotações do Plantão
          </h2>
          <button 
            onClick={() => onNavigate('notes')}
            className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            Ver Todas <ArrowRight size={12} />
          </button>
        </div>

        <div className="space-y-2.5">
          {notes.slice(0, 2).map((note) => (
            <div 
              key={note.id}
              className={`p-4 rounded-2xl border space-y-2 text-xs shadow-sm ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-black rounded-md text-[10px] uppercase">
                    {note.entryType}
                  </span>
                  <span className="font-black text-slate-900 dark:text-white">{note.patientName}</span>
                  <span className="text-[10px] font-bold text-slate-400">({note.bed})</span>
                </div>
                <span className="text-[10px] font-medium text-slate-400">{note.timestamp}</span>
              </div>

              <p className="text-slate-600 dark:text-slate-300 font-medium line-clamp-2 leading-relaxed">
                {note.content}
              </p>

              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold border-t border-slate-100 dark:border-slate-800 pt-2">
                <span>Por: {note.professionalName}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono">HASH: {note.digitalSignatureHash}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
