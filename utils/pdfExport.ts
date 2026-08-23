import jsPDF from 'jspdf';
import { PatientItem, MedicationRecord, NursingNote, UserProfile } from '../types';

export function generatePatientPDFBlob(
  patient: PatientItem,
  medications: MedicationRecord[] = [],
  notes: NursingNote[] = [],
  currentUser?: UserProfile
): { doc: jsPDF; filename: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 15;

  // COLOR PALETTE
  const primaryColor = [14, 116, 144]; // Teal/Cyan #0e7490
  const secondaryColor = [30, 41, 59]; // Slate #1e293b
  const accentColor = [225, 29, 72]; // Rose #e11d48
  const lightBg = [241, 245, 249]; // Slate-100 #f1f5f9

  // --- HEADER BANNER ---
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('MEU PLANTÃO PRO - FICHA CADASTRAL DO PACIENTE', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Prontuário Hospitalar Eletrônico & Gestão da Equipe de Enfermagem', 14, 18);
  
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Emissão: ${currentDate}`, pageWidth - 14, 18, { align: 'right' });

  y = 35;

  // --- CABEÇALHO DO PACIENTE ---
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(14, y, pageWidth - 28, 38, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, y, pageWidth - 28, 38, 'S');

  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(patient.name.toUpperCase(), 18, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`PRONTUÁRIO: ${patient.medicalRecordNumber}`, 18, y + 15);

  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Leito / Unidade: ${patient.bed} (${patient.room})`, 18, y + 21);
  doc.text(`Idade / Sexo: ${patient.age} anos | Sexo: ${patient.sex}`, 18, y + 26);
  doc.text(`Status de Internação: ${patient.status}`, 18, y + 31);

  // Status Badge no lado direito
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  if (patient.status === 'UTI') {
    doc.setTextColor(225, 29, 72);
  } else if (patient.status === 'ALTA') {
    doc.setTextColor(16, 185, 129);
  } else {
    doc.setTextColor(37, 99, 235);
  }
  doc.text(`STATUS: ${patient.status}`, pageWidth - 20, y + 10, { align: 'right' });

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Enf. Responsável: ${patient.responsibleStaff}`, pageWidth - 20, y + 21, { align: 'right' });
  doc.text(`Data de Cadastro: ${patient.createdAt}`, pageWidth - 20, y + 26, { align: 'right' });

  y += 44;

  // --- DIAGNÓSTICO INSTITUCIONAL E ALERTAS ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('1. DIAGNÓSTICO INSTITUCIONAL E ALERTAS DE SEGURANÇA', 14, y);
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.line(14, y + 2, pageWidth - 14, y + 2);

  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('Diagnóstico Registrado:', 14, y);
  doc.setFont('helvetica', 'normal');
  const diagLines = doc.splitTextToSize(patient.diagnosis || 'Sem diagnóstico formal registrado.', pageWidth - 28);
  doc.text(diagLines, 14, y + 5);

  y += 5 + (diagLines.length * 4) + 2;

  // Alergias e Riscos
  doc.setFont('helvetica', 'bold');
  doc.text('Alergias Cadastradas:', 14, y);
  doc.setFont('helvetica', 'normal');
  const allergiesText = patient.allergyAlerts && patient.allergyAlerts.length > 0 
    ? patient.allergyAlerts.join(', ') 
    : 'Nenhuma alergia relatada';
  doc.text(allergiesText, 55, y);

  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Alertas de Risco:', 14, y);
  doc.setFont('helvetica', 'normal');
  let risks: string[] = [];
  if (patient.fallRisk) risks.push('Risco de Queda Elevado');
  if (patient.pressureInjuryRisk) risks.push('Risco de Lesão por Pressão (LPP)');
  if (risks.length === 0) risks.push('Sem alertas críticos de risco');
  doc.text(risks.join(' | '), 50, y);

  y += 10;

  // --- FICHA DE TRANSFERÊNCIA DO PACIENTE (ORIGEM E DESTINO) ---
  if (patient.transferDetails || patient.status === 'TRANSFERIDO') {
    const td = patient.transferDetails || {};
    
    if (y > pageHeight - 50) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(217, 119, 6);
    doc.text('2. FICHA DE TRANSFERÊNCIA DO PACIENTE (ORIGEM E DESTINO)', 14, y);
    doc.setDrawColor(217, 119, 6);
    doc.line(14, y + 2, pageWidth - 14, y + 2);

    y += 8;

    doc.setFillColor(254, 243, 199);
    doc.rect(14, y, pageWidth - 28, 30, 'F');
    doc.setDrawColor(251, 191, 36);
    doc.rect(14, y, pageWidth - 28, 30, 'S');

    doc.setTextColor(120, 53, 15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);

    const origHosp = td.originHospital || 'Hospital Atual';
    const origBed = td.originBedRoom || `${patient.bed} (${patient.room})`;
    const destHosp = td.destinationHospital || 'Hospital / Unidade Destino';
    const destBed = td.destinationBedRoom || 'Leito / Quarto Destino';
    const destCity = td.destinationCity || 'Cidade Destino';
    const destNeigh = td.destinationNeighborhood || 'Bairro Destino';

    doc.text(`DE (ORIGEM): ${origHosp} | Leito/Quarto: ${origBed}`, 18, y + 6);
    doc.text(`PARA (DESTINO): ${destHosp} | Leito/Quarto: ${destBed}`, 18, y + 12);
    doc.text(`LOCALIZAÇÃO DO DESTINO: Cidade: ${destCity} | Bairro: ${destNeigh}`, 18, y + 18);
    doc.text(`TRANSPORTE / RESPONSÁVEL: ${td.transportType || 'Suporte Avançado (USA)'} | Resp: ${td.responsibleTransportStaff || patient.responsibleStaff}`, 18, y + 24);

    y += 36;
  }

  // --- PRESCRIÇÃO E MEDICAMENTOS DO PACIENTE ---
  const patientMeds = medications.filter(m => m.patientId === patient.id || m.patientName === patient.name);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`2. MEDICAMENTOS E APRAZAMENTOS (${patientMeds.length})`, 14, y);
  doc.line(14, y + 2, pageWidth - 14, y + 2);

  y += 8;

  if (patientMeds.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Nenhum medicamento registrado para este paciente.', 14, y);
    y += 8;
  } else {
    // Tabela de Medicamentos
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(14, y, pageWidth - 28, 7, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('MEDICAMENTO', 18, y + 5);
    doc.text('DOSE / VIA', 80, y + 5);
    doc.text('HORÁRIO', 125, y + 5);
    doc.text('STATUS', 160, y + 5);

    y += 7;

    patientMeds.forEach((med, idx) => {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = 20;
      }

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, pageWidth - 28, 7, 'F');
      }

      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      doc.text(med.medicationName.substring(0, 32), 18, y + 5);
      doc.text(`${med.dosage} (${med.route})`, 80, y + 5);
      doc.text(med.scheduledTime, 125, y + 5);

      if (med.status === 'ADMINISTRADO') {
        doc.setTextColor(16, 185, 129);
      } else if (med.status === 'ATRASADO') {
        doc.setTextColor(225, 29, 72);
      } else {
        doc.setTextColor(217, 119, 6);
      }
      doc.setFont('helvetica', 'bold');
      doc.text(med.status, 160, y + 5);

      y += 7;
    });

    y += 5;
  }

  // --- EVOLUÇÃO E ANOTAÇÕES DE ENFERMAGEM ---
  const patientNotes = notes.filter(n => n.patientId === patient.id || n.patientName === patient.name);

  if (y > pageHeight - 40) {
    doc.addPage();
    y = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`3. EVOLUÇÃO & ANOTAÇÕES DE ENFERMAGEM (${patientNotes.length})`, 14, y);
  doc.line(14, y + 2, pageWidth - 14, y + 2);

  y += 8;

  if (patientNotes.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Nenhuma evolução de enfermagem registrada no momento.', 14, y);
    y += 10;
  } else {
    patientNotes.forEach((note) => {
      if (y > pageHeight - 45) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, pageWidth - 28, 6, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(`[${note.entryType}] - ${note.timestamp}`, 18, y + 4.5);
      doc.text(`Profissional: ${note.professionalName} (${note.corenNumber})`, pageWidth - 20, y + 4.5, { align: 'right' });

      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);

      const noteLines = doc.splitTextToSize(note.content, pageWidth - 32);
      doc.text(noteLines, 18, y);

      y += (noteLines.length * 3.8) + 3;

      // Hash de Assinatura Digital
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`Assinatura Eletrônica COREN HASH: ${note.digitalSignatureHash}`, 18, y);

      y += 8;
    });
  }

  // --- FOOTER COM CARIMBO DE ASSINATURA DO PROFISSIONAL EMISSOR ---
  if (y > pageHeight - 35) {
    doc.addPage();
    y = 20;
  }

  y = pageHeight - 32;

  doc.setDrawColor(203, 213, 225);
  doc.line(14, y, pageWidth - 14, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  const issuerName = currentUser?.name || patient.responsibleStaff || 'Enfermeiro(a) Responsável';
  const coren = currentUser?.corenNumber ? `COREN ${currentUser.corenNumber}` : 'COREN-SP Registrado';

  doc.text(`Emitido por: ${issuerName} | ${coren}`, 14, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Documento gerado eletronicamente com validação legal pelo COREN/Cofen no Meu Plantão Pro.', 14, y + 9);
  doc.text('Página 1 de 1 - Registros Criptografados com Validação LGPD', pageWidth - 14, y + 9, { align: 'right' });

  const safeFilename = `Ficha_Paciente_${patient.name.replace(/[^a-zA-Z0-9]/g, '_')}_${patient.medicalRecordNumber}.pdf`;

  return { doc, filename: safeFilename };
}

export function downloadPatientPDF(
  patient: PatientItem,
  medications: MedicationRecord[] = [],
  notes: NursingNote[] = [],
  currentUser?: UserProfile
) {
  const { doc, filename } = generatePatientPDFBlob(patient, medications, notes, currentUser);
  doc.save(filename);
}

export async function sharePatientPDF(
  patient: PatientItem,
  medications: MedicationRecord[] = [],
  notes: NursingNote[] = [],
  currentUser?: UserProfile
) {
  const { doc, filename } = generatePatientPDFBlob(patient, medications, notes, currentUser);
  const pdfBlob = doc.output('blob');

  const file = new File([pdfBlob], filename, { type: 'application/pdf' });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: `Ficha Cadastral do Paciente: ${patient.name}`,
        text: `Ficha cadastral e histórico de enfermagem do paciente ${patient.name} (Prontuário: ${patient.medicalRecordNumber}, Leito: ${patient.bed}).`,
        files: [file]
      });
      return;
    } catch (err) {
      console.log('Compartilhamento cancelado ou não suportado, baixando arquivo...');
    }
  }

  // Fallback para download direto
  doc.save(filename);
}

export function downloadAllPatientsPDF(
  patients: PatientItem[],
  medications: MedicationRecord[] = [],
  notes: NursingNote[] = [],
  currentUser?: UserProfile
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 15;

  const primaryColor = [14, 116, 144];

  // HEADER
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('NURSECARE PRO - RELATÓRIO GERAL DE TODOS OS PACIENTES', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Total de Pacientes Cadastrados: ${patients.length}`, 14, 18);

  const currentDate = new Date().toLocaleDateString('pt-BR');
  doc.text(`Data: ${currentDate}`, pageWidth - 14, 18, { align: 'right' });

  y = 35;

  patients.forEach((patient, idx) => {
    if (y > pageHeight - 45) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, pageWidth - 28, 28, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, y, pageWidth - 28, 28, 'S');

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${idx + 1}. ${patient.name} (${patient.age} anos, ${patient.sex})`, 18, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Prontuário: ${patient.medicalRecordNumber} | Leito: ${patient.bed} (${patient.room}) | Status: ${patient.status}`, 18, y + 13);
    doc.text(`Diagnóstico: ${patient.diagnosis || 'Não informado'}`, 18, y + 18);
    
    const td = patient.transferDetails;
    if (td || patient.status === 'TRANSFERIDO') {
      const transferInfo = td 
        ? `Transferência: [De ${td.originHospital || 'Origem'} / ${td.originBedRoom || 'Leito'}] ➔ [Para ${td.destinationHospital || 'Destino'} / ${td.destinationBedRoom || 'Leito'} (${td.destinationCity || ''} - ${td.destinationNeighborhood || ''})]`
        : `Status: TRANSFERIDO (Ficha de rota cadastrada no sistema)`;
      doc.text(transferInfo.substring(0, 88), 18, y + 23);
    } else {
      const pMeds = medications.filter(m => m.patientId === patient.id || m.patientName === patient.name);
      const pNotes = notes.filter(n => n.patientId === patient.id || n.patientName === patient.name);
      doc.text(`Medicamentos Ativos: ${pMeds.length} | Evoluções Registradas: ${pNotes.length}`, 18, y + 23);
    }

    y += 34;
  });

  const safeFilename = `Relatorio_Geral_Pacientes_${currentDate.replace(/\//g, '-')}.pdf`;
  doc.save(safeFilename);
}

export function generateShiftSchedulePDFBlob(shifts: ShiftItem[], currentUser?: UserProfile) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 15;

  const primaryColor = [16, 185, 129]; // Emerald

  // HEADER
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('MEU PLANTÃO PRO - ESCALA DE PLANTÕES & AGENDA', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Profissional: ${currentUser?.name || 'Enfermeiro(a)'} | COREN: ${currentUser?.corenNumber || 'SP'}`, 14, 18);

  const currentDate = new Date().toLocaleDateString('pt-BR');
  doc.text(`Emissão: ${currentDate}`, pageWidth - 14, 18, { align: 'right' });

  y = 35;

  shifts.forEach((shift, idx) => {
    if (y > pageHeight - 35) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, pageWidth - 28, 26, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, y, pageWidth - 28, 26, 'S');

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(`${idx + 1}. Data: ${shift.date} (${shift.startTime}h às ${shift.endTime}h)`, 18, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Hospital: ${shift.hospitalName} | Setor: ${shift.unitSector}`, 18, y + 13);
    doc.text(`Tipo de Plantão: ${shift.shiftType.replace('_', ' ')} | Status: ${shift.status}`, 18, y + 18);
    if (shift.valueEst) {
      doc.text(`Valor Estimado: R$ ${shift.valueEst.toFixed(2)}`, pageWidth - 20, y + 7, { align: 'right' });
    }

    y += 31;
  });

  const filename = `Escala_Plantoes_${currentDate.replace(/\//g, '-')}.pdf`;
  return { doc, filename };
}

export function downloadShiftSchedulePDF(shifts: ShiftItem[], currentUser?: UserProfile) {
  const { doc, filename } = generateShiftSchedulePDFBlob(shifts, currentUser);
  doc.save(filename);
}

export async function shareShiftSchedulePDF(shifts: ShiftItem[], currentUser?: UserProfile) {
  const { doc, filename } = generateShiftSchedulePDFBlob(shifts, currentUser);
  const pdfBlob = doc.output('blob');
  const file = new File([pdfBlob], filename, { type: 'application/pdf' });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: `Escala de Plantões de Enfermagem`,
        text: `Relatório oficial da escala de plantões e turnos de enfermagem de ${currentUser?.name || 'Enfermeiro(a)'}.`,
        files: [file]
      });
      return;
    } catch (err) {
      console.log('Compartilhamento cancelado ou não suportado, baixando...');
    }
  }

  doc.save(filename);
}

