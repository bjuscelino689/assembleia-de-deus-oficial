import { UserProfile, ShiftItem, PatientItem, MedicationRecord, MedicationReminder, NursingNote, ChatChannel, ChatMessage, ChecklistItem, DocumentItem, SystemAuditLog, HospitalInfo, PRIMARY_ADMIN_EMAIL } from '../types';

export const GUEST_UNAUTHENTICATED_USER: UserProfile = {
  id: 'usr_guest_unauthenticated',
  name: 'Visitante (Não Autenticado)',
  email: 'visitante@nursecare.app',
  phone: '',
  password: '',
  corenNumber: '000.000-VIS',
  corenUF: 'SP',
  corenStatus: 'ATIVO',
  accessStatus: 'LIBERADO',
  deviceType: 'CELULAR',
  state: 'SP',
  city: 'São Paulo',
  photoUrl: '',
  specialty: 'Aguardando Cadastro ou Login',
  hospital: 'Meu Plantão Pro',
  bio: 'Seja bem-vindo. Crie sua conta no celular ou entre como Administrador.',
  isOnline: false,
  isAdmin: false,
  isBlocked: false,
  createdAt: new Date().toISOString().split('T')[0],
  twoFactorEnabled: false
};

export const INITIAL_USER: UserProfile = {
  id: 'usr_admin_master',
  name: 'Enf. Juscelino (Admin)',
  email: PRIMARY_ADMIN_EMAIL,
  phone: '(11) 99876-5432',
  password: 'admin',
  corenNumber: '001.000-ADM',
  corenUF: 'SP',
  corenStatus: 'ATIVO',
  accessStatus: 'LIBERADO',
  deviceType: 'NOTEBOOK',
  state: 'SP',
  city: 'São Paulo',
  photoUrl: '',
  specialty: 'Gestão de Enfermagem & Auditoria',
  hospital: 'Hospital das Clínicas - HCFMUSP',
  bio: 'Administrador Principal e Coordenador de Enfermagem. Gestão de acessos via Notebook.',
  isOnline: true,
  isAdmin: true,
  isBlocked: false,
  createdAt: '2024-01-01',
  twoFactorEnabled: true
};

export const INITIAL_REGISTERED_USERS: UserProfile[] = [
  INITIAL_USER
];

export const INITIAL_HOSPITALS: HospitalInfo[] = [
  { id: 'hosp_1', name: 'Hospital das Clínicas - HCFMUSP', city: 'São Paulo', state: 'SP', totalBeds: 1200, activeUnits: ['UTI Adulto', 'UTI Cardio', 'Pronto Socorro', 'Centro Cirúrgico'] },
  { id: 'hosp_2', name: 'Hospital Sírio-Libanês', city: 'São Paulo', state: 'SP', totalBeds: 500, activeUnits: ['UTI Neonatal', 'Oncologia', 'SMI', 'Unidade Coronariana'] },
  { id: 'hosp_3', name: 'Hospital Albert Einstein', city: 'São Paulo', state: 'SP', totalBeds: 650, activeUnits: ['Pediatria', 'Trauma', 'Semi-Intensiva'] },
];

export const INITIAL_SHIFTS: ShiftItem[] = [];

export const INITIAL_PATIENTS: PatientItem[] = [];

export const INITIAL_MEDICATIONS: MedicationRecord[] = [];

export const INITIAL_REMINDERS: MedicationReminder[] = [
  {
    id: 'rem_sample_1',
    patientName: 'Luis Silva',
    medicationName: 'Dipirona Sódica',
    dosage: '1g EV diluído em 100ml SF 0.9%',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '14:30',
    voiceGender: 'female',
    repeatCount: 2,
    volume: 100,
    isActive: true,
    isTriggered: false,
    notes: 'Injetar em bomba de infusão lenta.',
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_NOTES: NursingNote[] = [];

export const INITIAL_CHANNELS: ChatChannel[] = [
  {
    id: 'c_uti',
    name: 'UTI Adulto - Equipe Multidisciplinar',
    isGroup: true,
    participants: ['usr_101', 'usr_102'],
    unreadCount: 0,
    lastMessage: 'Nenhuma mensagem ainda',
    lastTimestamp: ''
  },
  {
    id: 'c_troca',
    name: 'Troca de Plantão & Escalas',
    isGroup: true,
    participants: ['usr_101', 'usr_102'],
    unreadCount: 0,
    lastMessage: 'Nenhuma mensagem ainda',
    lastTimestamp: ''
  },
  {
    id: 'c_carlos',
    name: 'Gabinete de Enfermagem',
    isGroup: false,
    participants: ['usr_101', 'usr_102'],
    unreadCount: 0,
    lastMessage: 'Nenhuma mensagem ainda',
    lastTimestamp: ''
  }
];

export const INITIAL_MESSAGES: ChatMessage[] = [];

export const INITIAL_CHECKLISTS: ChecklistItem[] = [
  {
    id: 'chk_1',
    category: 'TURNO',
    title: 'Checklist de Passagem de Turno (SBAR)',
    description: 'Sua garantia de passagem de plantão segura e sem perda de informações clínicas.',
    lastCheckedBy: 'Enfª. Amanda Oliveira',
    updatedAt: new Date().toISOString().split('T')[0],
    items: [
      { id: 'i_1', label: 'Conferência de Prontuários e Identificação Beira-Leito', checked: true },
      { id: 'i_2', label: 'Verificação de Soluções Contínuas e Bombas de Infusão', checked: true },
      { id: 'i_3', label: 'Checagem de Dispositivos Invazivos (SVD, CVC, PAV)', checked: true },
      { id: 'i_4', label: 'Verificação da Integridade Cutânea e Curativos', checked: true },
      { id: 'i_5', label: 'Conferência de Medicamentos Controlados e Psicotrópicos', checked: true },
      { id: 'i_6', label: 'Balanço Hídrico Parcial/Total Fechado', checked: false }
    ]
  },
  {
    id: 'chk_2',
    category: 'CARRINHO_PARADA',
    title: 'Checklist do Carrinho de Parada Cardiorrespiratória (PCR)',
    description: 'Conferência diária obrigatória da gaveta de emergência e desfibrilador.',
    lastCheckedBy: 'Tec. Bruno Costa',
    updatedAt: new Date().toISOString().split('T')[0],
    items: [
      { id: 'i_20', label: 'Laringoscópio testado com lâminas e pilhas operantes', checked: true },
      { id: 'i_21', label: 'Desfibrilador/DEA testado em bateria e carga', checked: true },
      { id: 'i_22', label: 'Cânulas endotraqueais e guias de intubação lacrados', checked: true },
      { id: 'i_23', label: 'Ambu com reservatório de O2 e máscaras testadas', checked: true },
      { id: 'i_24', label: 'Ampolas de Adrenalina, Atropina e Amiodarona validadas', checked: true }
    ]
  }
];

export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc_1',
    title: 'POP-ENF-012: Higienização de Mãos e Paramentação em UTI',
    category: 'POP',
    fileSize: '1.4 MB',
    uploadedBy: 'Comissão de Controle de Infecção Hospitalar (CCIH)',
    timestamp: '2026-06-10',
    description: 'Procedimento Operacional Padrão atualizado conforme RDC nº 36/2013 da ANVISA.'
  },
  {
    id: 'doc_2',
    title: 'Diretriz COFEN nº 001/2024: Dimensionamento de Enfermagem (Fugulin)',
    category: 'PROTOCOLO',
    fileSize: '2.8 MB',
    uploadedBy: 'Conselho Federal de Enfermagem',
    timestamp: '2026-05-20',
    description: 'Manual para cálculo da carga de trabalho e classificação de pacientes.'
  },
  {
    id: 'doc_3',
    title: 'Manual de Prevenção de Lesão por Pressão (LPP) e Ferramenta Braden',
    category: 'MANUAL',
    fileSize: '3.1 MB',
    uploadedBy: 'NÚCLEO DE SEGURANÇA DO PACIENTE',
    timestamp: '2026-04-15',
    description: 'Guia ilustrado de coberturas, curativos e estadiamento de lesões.'
  }
];

export const INITIAL_AUDIT_LOGS: SystemAuditLog[] = [
  {
    id: 'log_1',
    action: 'LOGIN_SUCESSO',
    user: 'amanda.enfermagem@nursecare.com.br',
    details: 'Login realizado com sucesso no app mobile. Autenticação 2FA verificada.',
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    ipAddress: '189.122.45.10',
    level: 'INFO'
  },
  {
    id: 'log_2',
    action: 'REGISTRO_EVOLUCAO',
    user: 'Enfª. Amanda Oliveira (COREN-SP 123.456)',
    details: 'Registro assinado digitalmente para o leito 02 (José Roberto Santos). Hash: SHA256-NURSE-99812A7C3F22',
    timestamp: new Date(Date.now() - 3600000).toISOString().replace('T', ' ').substring(0, 19),
    ipAddress: '189.122.45.10',
    level: 'INFO'
  },
  {
    id: 'log_3',
    action: 'CHECK_MEDICACAO',
    user: 'Enfª. Amanda Oliveira',
    details: 'Administração confirmada: Ceftriaxona 1g EV.',
    timestamp: new Date(Date.now() - 7200000).toISOString().replace('T', ' ').substring(0, 19),
    ipAddress: '189.122.45.10',
    level: 'INFO'
  }
];
