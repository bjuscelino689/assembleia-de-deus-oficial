// HELPER DE SÍNTESE DE VOZ E ALERTAS SONOROS PARA LEMBRETES DE MEDICAMENTO DE ENFERMAGEM

let currentUtterance: SpeechSynthesisUtterance | null = null;
let repeatTimeoutId: any = null;

export interface VoiceReminderParams {
  patientName: string;
  medicationName: string;
  dosage?: string;
  voiceGender: 'female' | 'male';
  repeatCount: number;
  volume: number; // 0 to 100
  onStart?: () => void;
  onEnd?: () => void;
}

/**
 * Interrompe qualquer áudio de voz em execução imediatamente
 */
export const stopVoiceAnnouncement = () => {
  if (repeatTimeoutId) {
    clearTimeout(repeatTimeoutId);
    repeatTimeoutId = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

/**
 * Constrói a frase exata solicitada e reproduz via SpeechSynthesis
 * Texto exato: "Olá Enfermeira, já está na hora do medicamento do paciente [NOME], [REMÉDIO] [DOSAGEM]"
 */
export const speakMedicationReminder = (params: VoiceReminderParams) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Síntese de voz não suportada neste navegador.');
    return;
  }

  try {
    // Interrompe falas anteriores
    stopVoiceAnnouncement();

    const { 
      patientName = 'Paciente', 
      medicationName = 'Medicamento', 
      dosage = '', 
      voiceGender = 'female', 
      repeatCount = 1, 
      volume = 100, 
      onStart, 
      onEnd 
    } = params || {};

    const cleanPatient = String(patientName || 'Paciente').trim();
    const cleanMedication = String(medicationName || 'Medicamento').trim();
    const cleanDosage = String(dosage || '').trim();

    // Monta a frase conforme o gênero da assistente
    const salutation = voiceGender === 'female' ? 'Olá Enfermeira' : 'Olá Enfermeiro';
    const dosagePart = cleanDosage ? `, ${cleanDosage}` : '';
    const textToSpeak = `${salutation}, já está na hora do medicamento do paciente ${cleanPatient}, ${cleanMedication}${dosagePart}.`;

    const playUtterance = (remainingRepeats: number) => {
      try {
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'pt-BR';
        utterance.volume = Math.max(0, Math.min(1, Number(volume || 100) / 100));
        utterance.rate = 0.95; // Velocidade natural e pausada

        // Tenta obter as vozes disponíveis no sistema do navegador
        let voices: SpeechSynthesisVoice[] = [];
        try {
          voices = window.speechSynthesis.getVoices() || [];
        } catch (e) {}

        const ptVoices = voices.filter(v => v.lang && (v.lang.includes('pt') || v.lang.includes('PT')));

        if (ptVoices.length > 0) {
          if (voiceGender === 'female') {
            const femaleVoice = ptVoices.find(v => 
              /google|luciana|francisca|heloisa|maria|victoria|leticia|female|feminina/i.test(v.name)
            ) || ptVoices[0];
            utterance.voice = femaleVoice;
            utterance.pitch = 1.15; // Agudo natural para voz feminina
          } else {
            const maleVoice = ptVoices.find(v => 
              /daniel|ricardo|jorge|antonio|male|masculino/i.test(v.name)
            ) || ptVoices[ptVoices.length > 1 ? 1 : 0];
            utterance.voice = maleVoice;
            utterance.pitch = 0.85; // Grave natural para voz masculina
          }
        } else {
          utterance.pitch = voiceGender === 'female' ? 1.2 : 0.85;
        }

        utterance.onstart = () => {
          if (onStart && remainingRepeats === repeatCount) {
            try { onStart(); } catch (e) {}
          }
        };

        utterance.onend = () => {
          if (remainingRepeats > 1) {
            // Pausa de 1.2s entre repetições
            repeatTimeoutId = setTimeout(() => {
              playUtterance(remainingRepeats - 1);
            }, 1200);
          } else {
            if (onEnd) {
              try { onEnd(); } catch (e) {}
            }
          }
        };

        utterance.onerror = (e) => {
          console.warn('Aviso/Erro na reprodução da síntese de voz:', e);
          if (onEnd) {
            try { onEnd(); } catch (err) {}
          }
        };

        currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Exceção capturada ao tentar falar:', err);
        if (onEnd) {
          try { onEnd(); } catch (e) {}
        }
      }
    };

    let voicesAvailable = false;
    try {
      voicesAvailable = window.speechSynthesis.getVoices().length > 0;
    } catch (e) {}

    if (!voicesAvailable) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null; // evita chamadas repetidas
        playUtterance(repeatCount);
      };
    } else {
      playUtterance(repeatCount);
    }
  } catch (err) {
    console.warn('Erro ao inicializar alerta falado:', err);
  }
};
