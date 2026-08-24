export const PRIMARY_ADMIN_EMAIL = 'bjuscelino33@gmail.com';

export const isMasterAdminEmail = (email?: string): boolean => {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return clean === PRIMARY_ADMIN_EMAIL.toLowerCase();
};

export enum UserRole {
  PASTOR = 'PASTOR',
  MEMBRO = 'MEMBRO',
  VISITANTE = 'VISITANTE',
  ADMIN = 'ADMIN',
  ENFERMEIRO = 'ENFERMEIRO',
  TECNICO = 'TECNICO',
  GESTOR = 'GESTOR'
}

export interface ChurchInfo {
  name: string;
  pastorName: string;
  photoUrl?: string;
  address?: string;
  phone?: string;
  pastorAdminEmail?: string;
  pastorAdminId?: string;
  pastorAdminName?: string;
  pastorAccessCode?: string;
}

export interface Member {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  password?: string;
  accessStatus?: 'LIBERADO' | 'PENDENTE_LIBERACAO' | 'BLOQUEADO';
  role?: string;
  createdAt?: string;
  photoUrl?: string;
  isBlocked?: boolean;
  blockedReason?: string;
  deviceType?: 'NOTEBOOK' | 'CELULAR' | 'DESKTOP' | string;
  lastActiveAt?: number;
  isOnline?: boolean;
  isPastorAdmin?: boolean;
  pastorAccessCode?: string;
}

export interface PastoralVisit {
  id: string;
  memberName: string;
  address?: string;
  date: string;
  time: string;
  status: 'AGENDADO' | 'CONCLUIDO' | 'CANCELADO' | 'AGENDADA';
  notes?: string;
  purpose?: string;
}

export interface Cult {
  id: string;
  title: string;
  date: string;
  time: string;
  description?: string;
  desc?: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  description?: string;
  desc?: string;
}

export interface Festival {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  description?: string;
  desc?: string;
}

export interface PrayerCampaign {
  id: string;
  title: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  desc?: string;
  reason?: string;
}

export interface BibleVerse {
  id: string;
  memberName: string;
  verse: string;
  reference: string;
  timestamp: number;
}

export interface Hymn {
  id: string;
  number?: number | string;
  title: string;
  artist: string;
  category?: 'harpa' | 'adoracao' | 'pentecostal' | 'classico' | 'congregacional' | string;
  audioUrl?: string;
  youtubeId?: string;
  duration?: string;
  lyrics?: string;
  coverUrl?: string;
  tags?: string[];
}

export type ChurchDepartmentId = 
  | 'geral' 
  | 'jovens' 
  | 'circulo_oracao' 
  | 'varoes' 
  | 'infantil' 
  | 'louvor' 
  | 'diaconia' 
  | 'lideranca' 
  | 'oracao';

export interface ChurchDepartment {
  id: ChurchDepartmentId;
  label: string;
  shortName: string;
  icon: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  description: string;
}

export const CHURCH_DEPARTMENTS: ChurchDepartment[] = [
  { 
    id: 'geral', 
    label: '⛪ Toda a Igreja (Geral & Comunhão)', 
    shortName: 'Geral', 
    icon: '⛪', 
    color: 'emerald', 
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700', 
    badgeText: 'text-emerald-800 dark:text-emerald-200', 
    description: 'Avisos e mensagens para toda a igreja' 
  },
  { 
    id: 'jovens', 
    label: '🔥 Mocidade & Jovens (UMAD)', 
    shortName: 'Jovens', 
    icon: '🔥', 
    color: 'amber', 
    badgeBg: 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700', 
    badgeText: 'text-amber-800 dark:text-amber-200', 
    description: 'Encontros, vigílias e eventos da juventude' 
  },
  { 
    id: 'circulo_oracao', 
    label: '🕊️ Círculo de Oração (Irmãs / UFAD)', 
    shortName: 'Círculo de Oração', 
    icon: '🕊️', 
    color: 'rose', 
    badgeBg: 'bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700', 
    badgeText: 'text-rose-800 dark:text-rose-200', 
    description: 'Reuniões de clamor e irmãs intercessoras' 
  },
  { 
    id: 'varoes', 
    label: '🛡️ Varões & Homens de Fé (UNIFAM)', 
    shortName: 'Varões', 
    icon: '🛡️', 
    color: 'blue', 
    badgeBg: 'bg-blue-100 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700', 
    badgeText: 'text-blue-800 dark:text-blue-200', 
    description: 'Grupo de homens, cultos e trabalhos dos varões' 
  },
  { 
    id: 'infantil', 
    label: '👶 Crianças & Ministério Infantil (EBD)', 
    shortName: 'Infantil / EBD', 
    icon: '👶', 
    color: 'cyan', 
    badgeBg: 'bg-cyan-100 dark:bg-cyan-950/60 border-cyan-300 dark:border-cyan-700', 
    badgeText: 'text-cyan-800 dark:text-cyan-200', 
    description: 'Escola Bíblica Dominical e cultos infantis' 
  },
  { 
    id: 'louvor', 
    label: '🎵 Ministério de Louvor & Músicos', 
    shortName: 'Louvor & Banda', 
    icon: '🎵', 
    color: 'purple', 
    badgeBg: 'bg-purple-100 dark:bg-purple-950/60 border-purple-300 dark:border-purple-700', 
    badgeText: 'text-purple-800 dark:text-purple-200', 
    description: 'Ensaios, escalas musicais e louvores' 
  },
  { 
    id: 'diaconia', 
    label: '🤝 Diaconia, Obreiros & Portaria', 
    shortName: 'Diaconia & Obreiros', 
    icon: '🤝', 
    color: 'teal', 
    badgeBg: 'bg-teal-100 dark:bg-teal-950/60 border-teal-300 dark:border-teal-700', 
    badgeText: 'text-teal-800 dark:text-teal-200', 
    description: 'Escalas de serviço, recepção e obreiros' 
  },
  { 
    id: 'lideranca', 
    label: '📖 Gabinete Pastoral & Liderança', 
    shortName: 'Gabinete Pastoral', 
    icon: '📖', 
    color: 'indigo', 
    badgeBg: 'bg-indigo-100 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700', 
    badgeText: 'text-indigo-800 dark:text-indigo-200', 
    description: 'Orientações da diretoria e pastor presidente' 
  },
  { 
    id: 'oracao', 
    label: '🙏 Pedidos de Oração & Clamor', 
    shortName: 'Oração & Clamor', 
    icon: '🙏', 
    color: 'sky', 
    badgeBg: 'bg-sky-100 dark:bg-sky-950/60 border-sky-300 dark:border-sky-700', 
    badgeText: 'text-sky-800 dark:text-sky-200', 
    description: 'Pedidos de saúde, causas e libertação' 
  }
];

export interface ChatMessage {
  id: string;
  senderName: string;
  senderRole?: string;
  text?: string;
  audioUrl?: string;
  audioDuration?: number;
  listenedBy?: string[];
  isListened?: boolean;
  isRead?: boolean;
  department?: ChurchDepartmentId;
  departmentLabel?: string;
  targetAudience?: 'all' | 'specific';
  mediaUrl?: string;
  channelId?: string;
  senderId?: string;
  senderEmail?: string;
  senderDeviceId?: string;
  deletedForSelf?: boolean;
  timestamp: number | string;
}

export interface GalleryItem {
  id: string;
  url: string;
  title: string;
  author: string;
  timestamp: number;
  type?: 'image' | 'video';
}

export interface VideoItem {
  id: string;
  url?: string;
  videoUrl?: string;
  title: string;
  author: string;
  timestamp: number;
  thumbnailUrl?: string;
  duration?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  corenNumber?: string;
  corenUF?: string;
  corenStatus: 'ATIVO' | 'EM_ANALISE' | 'SUSPENSO';
  accessStatus?: 'LIBERADO' | 'PENDENTE_LIBERACAO' | 'BLOQUEADO';
  deviceType?: 'NOTEBOOK' | 'CELULAR' | 'DESKTOP';
  state: string;
  city: string;
  photoUrl?: string;
  specialty: string;
  hospital: string;
  bio?: string;
  isOnline: boolean;
  lastActiveAt?: number;
  isAdmin: boolean;
  isBlocked: boolean;
  createdAt: string;
  twoFactorEnabled?: boolean;
  adminMessage?: string;
  adminMessageRead?: boolean;
  adminMessageSentAt?: string;
  isPastorAdmin?: boolean;
  pastorAccessCode?: string;
}

export interface ShiftItem {
  id: string;
  hospitalName: string;
  unitSector: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  shiftType: '12x36_DIURNO' | '12x36_NOTURNO' | '24H' | '6H_MANHA' | '6H_TARDE' | 'SOBREAVISO';
  status: 'AGENDADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'TROCA_SOLICITADA';
  notes?: string;
  reminderEnabled: boolean;
  userId: string;
  userName?: string;
  valueEst?: number;
}

export interface TransferDetails {
  originHospital?: string;
  originBedRoom?: string;
  destinationHospital?: string;
  destinationBedRoom?: string;
  destinationCity?: string;
  destinationNeighborhood?: string;
  transferReason?: string;
  transportType?: string;
  transferredAt?: string;
  responsibleTransportStaff?: string;
}

export interface PatientItem {
  id: string;
  name: string;
  medicalRecordNumber: string; // Prontuário
  bed: string; // Leito
  room: string; // Quarto
  age: number;
  sex: 'M' | 'F' | 'Outro';
  diagnosis: string; // Diagnóstico fornecido pela instituição
  responsibleStaff: string; // Enf / Tec responsável
  notes?: string;
  status: 'INTERNADO' | 'ALTA' | 'TRANSFERIDO' | 'UTI';
  allergyAlerts?: string[];
  fallRisk?: boolean;
  pressureInjuryRisk?: boolean;
  createdAt: string;
  transferDetails?: TransferDetails;
}

export interface MedicationRecord {
  id: string;
  patientId: string;
  patientName: string;
  bed: string;
  medicationName: string;
  dosage: string;
  route: 'VO' | 'EV' | 'IM' | 'SC' | 'SL' | 'INALATORIO' | 'TOPICO' | 'OUTRA';
  scheduledTime: string; // HH:mm
  scheduledDate: string; // YYYY-MM-DD
  administeredBy?: string;
  status: 'PENDENTE' | 'ADMINISTRADO' | 'ATRASADO' | 'SUSPENSO';
  notes?: string;
  administeredAt?: string;
}

export interface MedicationReminder {
  id: string;
  patientName: string;
  medicationName: string;
  dosage: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  voiceGender: 'female' | 'male';
  repeatCount: number; // 1, 2, 3, 5
  volume: number; // 0 to 100
  isActive: boolean;
  isTriggered?: boolean;
  notes?: string;
  createdAt: string;
  patientId?: string;
  bed?: string;
}

export interface NursingNote {
  id: string;
  patientId: string;
  patientName: string;
  bed: string;
  entryType: 'ROTINA' | 'OCORRENCIA' | 'INTERCORRENCIA' | 'ADMISSAO' | 'TRANSFERENCIA' | 'ALTA' | 'OBITO';
  content: string;
  professionalName: string;
  corenNumber: string;
  digitalSignatureHash: string;
  timestamp: string;
  isEdited?: boolean;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderEmail?: string;
  senderRole: string;
  senderPhoto?: string;
  senderDeviceId?: string;
  text: string;
  audioUrl?: string;
  mediaUrl?: string;
  docUrl?: string;
  docName?: string;
  timestamp: string;
  isRead?: boolean;
  listenedBy?: string[];
  deletedForSelf?: boolean;
  deletedForEveryone?: boolean;
  replyToId?: string;
}

export interface ChatChannel {
  id: string;
  name: string;
  isGroup: boolean;
  participants: string[];
  unreadCount?: number;
  lastMessage?: string;
  lastTimestamp?: string;
  icon?: string;
}

export interface ChecklistItem {
  id: string;
  category: 'TURNO' | 'UTI' | 'CENTRO_CIRURGICO' | 'CARRINHO_PARADA' | 'MATERIAIS';
  title: string;
  description?: string;
  items: { id: string; label: string; checked: boolean }[];
  lastCheckedBy?: string;
  updatedAt?: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  category: 'POP' | 'PROTOCOLO' | 'MANUAL' | 'LAUDO' | 'RECEITA';
  fileUrl?: string;
  fileSize?: string;
  uploadedBy: string;
  timestamp: string;
  description?: string;
}

export interface SystemAuditLog {
  id: string;
  action: string;
  user: string;
  details: string;
  timestamp: string;
  ipAddress: string;
  level: 'INFO' | 'WARNING' | 'SECURITY';
  userId?: string;
  userName?: string;
  status?: string;
}

export type AuditLog = SystemAuditLog;

export interface HospitalInfo {
  id: string;
  name: string;
  city: string;
  state: string;
  totalBeds: number;
  activeUnits: string[];
}

export interface PaymentAccessInfo {
  dueDay: number;
  title: string;
  qrCodeUrl?: string;
  pixKey?: string;
  recipientName?: string;
  amount?: string;
  description?: string;
  updatedAt?: number;
  updatedBy?: string;
}
