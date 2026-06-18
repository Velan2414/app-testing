import React, { useRef, useState, useEffect } from 'react';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import type { PatientRecord, PrivacySettings } from '../types';

export const ScanQR: React.FC = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const liveQrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Real camera QR Scanner states and refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const isCameraActiveRef = useRef(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Sync state to ref to avoid stale closures in requestAnimationFrame loops
  useEffect(() => {
    isCameraActiveRef.current = isCameraActive;
  }, [isCameraActive]);

  // Clean up camera stream and anim frame on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const scanFrame = () => {
    if (videoRef.current && canvasRef.current && isCameraActiveRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code) {
          // Decoded QR successfully! Stop stream and process URL
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          setIsCameraActive(false);
          handleDecodedUrl(code.data);
          return;
        }
      }
      animationFrameRef.current = requestAnimationFrame(scanFrame);
    }
  };

  const startCameraScan = async () => {
    setErrorMsg('');
    setCameraError(null);
    setIsCameraActive(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        animationFrameRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err) {
      console.error('Failed to access camera', err);
      setCameraError('Camera access denied or device has no camera. Please upload an image.');
      setIsCameraActive(false);
    }
  };

  const stopCameraScan = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsCameraActive(false);
  };

  const [qrInput, setQrInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [liveQrText, setLiveQrText] = useState('');

  // Live QR preview: generate QR on canvas whenever input changes
  useEffect(() => {
    const trimmed = liveQrText.trim();
    if (!trimmed || !liveQrCanvasRef.current) return;
    QRCode.toCanvas(
      liveQrCanvasRef.current,
      trimmed,
      {
        width: 200,
        margin: 2,
        color: { dark: '#181c1e', light: '#ffffff' },
      },
      (err) => {
        if (err) console.error('Live QR error', err);
      }
    );
  }, [liveQrText]);


  // Scanned record state for inline display
  const [scannedRecord, setScannedRecord] = useState<{ patientRecord: PatientRecord; privacySettings: PrivacySettings } | null>(null);
  const [scannedRawText, setScannedRawText] = useState<string>('');

  const handleSimulateScan = () => {
    if (user && user.patientRecord.qrId) {
      setSuccessMsg('Decoding user QR Code...');
      setErrorMsg('');
      setTimeout(() => {
        handleDecodedUrl(user.patientRecord.qrId);
      }, 1000);
    } else {
      setErrorMsg('No active user profile found to simulate a scan.');
    }
  };

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setSuccessMsg('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas dimensions to match the image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, img.width, img.height);

        // Get image data and decode
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          handleDecodedUrl(code.data);
        } else {
          setErrorMsg('No valid QR code found in this image. Make sure it is clear and un-cropped.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDecodedUrl = async (urlText: string) => {
    const decodedText = urlText.trim();
    let id = '';

    // Regex to pull id from emergency path: e.g. /emergency/mqr-david-8823
    const match = decodedText.match(/\/emergency\/([a-zA-Z0-9_-]+)/);
    if (match) {
      id = match[1];
    } else if (/^[a-zA-Z0-9_-]+$/.test(decodedText)) {
      id = decodedText;
    }

    if (!id) {
      // If it doesn't match an ID but looks like medical details plain-text card
      if (decodedText.includes('===')) {
        setSuccessMsg('Offline plain-text medical card loaded.');
        setScannedRawText(decodedText);
        setScannedRecord(null);
      } else {
        setErrorMsg('Invalid QR code format. Could not decode ID or plain-text medical summary.');
        setSuccessMsg('');
      }
      return;
    }

    setSuccessMsg(`Validating record ID: ${id}...`);

    try {
      const response = await fetch(`/api/records/${id}`);
      if (response.ok) {
        const data = await response.json();
        setScannedRecord(data);
        setScannedRawText('');
        setSuccessMsg('Record verified and loaded successfully!');
      } else {
        // Fallback: If verification fails but we scanned a plain text card representation, display the raw text
        if (decodedText.includes('=== MediQR EMERGENCY CARD ===')) {
          setScannedRawText(decodedText);
          setScannedRecord(null);
          setErrorMsg(`Record ID "${id}" is not registered on this server, showing scanned offline card.`);
        } else {
          setErrorMsg(`Record ID "${id}" is not registered on this server.`);
        }
        setSuccessMsg('');
      }
    } catch (err) {
      console.error(err);
      // Fallback to raw text if present in the scanned content
      if (decodedText.includes('=== MediQR EMERGENCY CARD ===')) {
        setScannedRawText(decodedText);
        setScannedRecord(null);
        setErrorMsg('Could not verify against server, displaying scanned offline card.');
      } else {
        setErrorMsg('Could not connect to the backend server to validate the record.');
      }
      setSuccessMsg('');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInput.trim()) return;
    handleDecodedUrl(qrInput);
  };

  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case 'Severe':
        return 'bg-error/10 text-error border-error/20';
      case 'Moderate':
        return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
      case 'Mild':
      default:
        return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const handleDownloadPDF = () => {
    if (!scannedRecord) return;
    const { patientRecord: record, privacySettings: settings } = scannedRecord;
    const doc = new jsPDF();
    
    // Card Outer Boundary border (180mm x 90mm)
    doc.setDrawColor(0, 61, 155);
    doc.setLineWidth(0.8);
    doc.roundedRect(15, 15, 180, 90, 4, 4, 'D');
    
    // Card Header Banner (Medical Blue)
    doc.setFillColor(0, 61, 155);
    doc.rect(15.4, 15.4, 179.2, 14, 'F');
    
    // Header Title
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('MediQR EMERGENCY MEDICAL CARD', 22, 24.5);
    
    // Emergency view pill
    doc.setFillColor(186, 26, 26);
    doc.roundedRect(148, 18.5, 42, 8, 2, 2, 'F');
    doc.setFontSize(8);
    doc.text('ICE CLINICAL REPORT', 152, 24);
    
    // Patient Profile Photo
    doc.setDrawColor(220, 225, 230);
    doc.setLineWidth(0.3);
    doc.rect(20, 35, 22, 22, 'D');
    
    if (record.photo) {
      try {
        const format = record.photo.includes('png') ? 'PNG' : 'JPEG';
        doc.addImage(record.photo, format, 20.3, 35.3, 21.4, 21.4);
      } catch (e) {
        console.error('Error adding image to PDF', e);
        doc.setFillColor(240, 244, 248);
        doc.rect(20.3, 35.3, 21.4, 21.4, 'F');
        doc.setFontSize(6);
        doc.setTextColor(140, 145, 150);
        doc.text('IMG FAILED', 23, 47);
      }
    } else {
      doc.setFillColor(240, 244, 248);
      doc.rect(20.3, 35.3, 21.4, 21.4, 'F');
      doc.setFontSize(7);
      doc.setTextColor(120, 125, 130);
      doc.text('NO PHOTO', 23.5, 47);
    }
    
    // Patient Identity Details
    doc.setFontSize(13);
    doc.setTextColor(0, 61, 155);
    doc.setFont('helvetica', 'bold');
    doc.text(record.name, 47, 41);
    
    doc.setFontSize(9);
    doc.setTextColor(50, 55, 60);
    doc.setFont('helvetica', 'normal');
    
    if (settings.showVitals) {
      doc.text(`Age: ${record.age}y   Gender: ${record.gender}`, 47, 47);
      doc.text(`Height: ${record.height}cm   Weight: ${record.weight}kg`, 47, 53);
      
      // Prominent Blood Group Badge
      doc.setFillColor(186, 26, 26);
      doc.roundedRect(155, 35, 30, 22, 2, 2, 'F');
      
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('BLOOD TYPE', 161, 41);
      
      doc.setFontSize(13);
      doc.text(record.bloodGroup, 166, 51);
    } else {
      doc.setTextColor(140, 145, 150);
      doc.text('Vitals & demographics: Protected / Private', 47, 47);
    }
    
    // Separators
    doc.setDrawColor(220, 225, 230);
    doc.setLineWidth(0.3);
    doc.line(20, 62, 190, 62);
    doc.line(105, 65, 105, 83);
    
    // Conditions (Left)
    doc.setFontSize(9);
    doc.setTextColor(0, 61, 155);
    doc.setFont('helvetica', 'bold');
    doc.text('Active Medical Conditions', 20, 67);
    
    doc.setFontSize(8);
    doc.setTextColor(24, 28, 30);
    doc.setFont('helvetica', 'normal');
    
    let condListY = 72;
    if (settings.showConditions) {
      if (record.conditions.length > 0) {
        record.conditions.slice(0, 2).forEach((c) => {
          doc.text(`• ${c.name} [${c.severity}]`, 20, condListY);
          condListY += 5;
        });
        if (record.conditions.length > 2) {
          doc.text(`• and ${record.conditions.length - 2} more (see full report below)`, 20, condListY);
        }
      } else {
        doc.text('No chronic conditions listed.', 20, condListY);
      }
    } else {
      doc.setTextColor(140, 145, 150);
      doc.text('Protected by patient privacy settings.', 20, condListY);
    }
    
    // Allergies (Right)
    doc.setFontSize(9);
    doc.setTextColor(186, 26, 26);
    doc.setFont('helvetica', 'bold');
    doc.text('Documented Allergies Alert', 110, 67);
    
    doc.setFontSize(8);
    doc.setTextColor(24, 28, 30);
    doc.setFont('helvetica', 'normal');
    
    let allergyListY = 72;
    if (settings.showAllergies) {
      if (record.allergies.length > 0) {
        record.allergies.slice(0, 2).forEach((a) => {
          doc.text(`• ${a.name} [${a.severity}]`, 110, allergyListY);
          allergyListY += 5;
        });
        if (record.allergies.length > 2) {
          doc.text(`• and ${record.allergies.length - 2} more (see full report below)`, 110, allergyListY);
        }
      } else {
        doc.text('No allergies documented.', 110, allergyListY);
      }
    } else {
      doc.setTextColor(140, 145, 150);
      doc.text('Protected by patient privacy settings.', 110, allergyListY);
    }
    
    // Footer Strip
    doc.setFillColor(240, 244, 248);
    doc.rect(15.4, 89.4, 179.2, 15, 'F');
    
    doc.setFontSize(8);
    doc.setTextColor(0, 61, 155);
    doc.setFont('helvetica', 'bold');
    doc.text('IN CASE OF EMERGENCY (ICE) CONTACT:', 20, 96);
    
    doc.setFontSize(8);
    doc.setTextColor(24, 28, 30);
    doc.setFont('helvetica', 'normal');
    
    if (settings.showContacts) {
      if (record.contacts.length > 0) {
        const primaryContact = record.contacts[0];
        doc.text(`${primaryContact.name} (${primaryContact.relationship}): ${primaryContact.phone}`, 20, 101);
      } else {
        doc.text('No contacts configured. Refer to dashboard.', 20, 101);
      }
    } else {
      doc.setTextColor(140, 145, 150);
      doc.text('Emergency contacts hidden by patient visibility settings.', 20, 101);
    }
    
    doc.setFillColor(255, 255, 255);
    doc.rect(173, 91, 18, 12, 'F');
    doc.setFontSize(5);
    doc.setTextColor(100, 105, 110);
    doc.text('SCAN QR', 178, 96);
    doc.text(record.qrId.toUpperCase(), 174, 101);
    
    // SECTION 2: REPORT DETAILS
    let yReportPos = 125;
    
    doc.setFontSize(15);
    doc.setTextColor(0, 61, 155);
    doc.setFont('helvetica', 'bold');
    doc.text('MediQR Detailed Clinical Summary', 15, yReportPos);
    
    yReportPos += 8;
    doc.setDrawColor(200, 205, 210);
    doc.line(15, yReportPos, 195, yReportPos);
    
    yReportPos += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 61, 155);
    doc.text('1. Complete Medical Conditions & Allergies', 15, yReportPos);
    
    yReportPos += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(24, 28, 30);
    
    if (settings.showConditions) {
      doc.setFont('helvetica', 'bold');
      doc.text('Chronic conditions:', 15, yReportPos);
      doc.setFont('helvetica', 'normal');
      yReportPos += 6;
      if (record.conditions.length > 0) {
        record.conditions.forEach((c) => {
          doc.text(`- ${c.name} [Severity: ${c.severity}] ${c.notes ? `(${c.notes})` : ''}`, 20, yReportPos);
          yReportPos += 5;
        });
      } else {
        doc.text('None documented.', 20, yReportPos);
        yReportPos += 5;
      }
    }
    
    yReportPos += 2;
    if (settings.showAllergies) {
      doc.setFont('helvetica', 'bold');
      doc.text('Allergies & Reactions:', 15, yReportPos);
      doc.setFont('helvetica', 'normal');
      yReportPos += 6;
      if (record.allergies.length > 0) {
        record.allergies.forEach((a) => {
          doc.text(`- ${a.name} [Severity: ${a.severity}] ${a.notes ? `(${a.notes})` : ''}`, 20, yReportPos);
          yReportPos += 5;
        });
      } else {
        doc.text('None documented.', 20, yReportPos);
        yReportPos += 5;
      }
    }
    
    yReportPos += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 61, 155);
    doc.text('2. Active Medications & Prescription Schedule', 15, yReportPos);
    
    yReportPos += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(24, 28, 30);
    
    if (settings.showMedications) {
      if (record.medications.length > 0) {
        record.medications.forEach((m) => {
          doc.text(`- ${m.name} (${m.dosage}) — Take: ${m.frequency} ${m.purpose ? `[For ${m.purpose}]` : ''}`, 15, yReportPos);
          yReportPos += 6;
        });
      } else {
        doc.text('No active medications configured.', 15, yReportPos);
        yReportPos += 6;
      }
    } else {
      doc.setTextColor(140, 145, 150);
      doc.text('Medications list is hidden by patient privacy settings.', 15, yReportPos);
      yReportPos += 6;
    }
    
    yReportPos += 6;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 61, 155);
    doc.text('3. In Case of Emergency Contacts', 15, yReportPos);
    
    yReportPos += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(24, 28, 30);
    
    if (settings.showContacts) {
      if (record.contacts.length > 0) {
        record.contacts.forEach((contact, idx) => {
          doc.text(`${idx + 1}. ${contact.name} (${contact.relationship}) — Phone: ${contact.phone}`, 15, yReportPos);
          yReportPos += 6;
        });
      } else {
        doc.text('No emergency contacts listed.', 15, yReportPos);
        yReportPos += 6;
      }
    } else {
      doc.setTextColor(140, 145, 150);
      doc.text('Emergency contact details are hidden by patient privacy settings.', 15, yReportPos);
      yReportPos += 6;
    }
    
    doc.setFontSize(8);
    doc.setTextColor(120, 125, 130);
    doc.text('This record is digitally certified and retrieved directly from the patient\'s verified MediQR backend server.', 15, 285);
    
    doc.save(`mediqr-emergency-${record.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };

  // If a QR code is active, display the decoded details directly on the page!
  if (scannedRecord || scannedRawText) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto animate-fade-in relative pb-12">
        {/* Header with scan another button */}
        <div className="flex justify-between items-center border-b border-outline-variant/20 pb-4">
          <div>
            <span className="font-label-caps text-xs text-on-surface-variant/70 tracking-widest block mb-1">
              {scannedRecord ? 'VERIFIED CLINICAL RECORD' : 'OFFLINE MEDICAL DECODE'}
            </span>
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-on-surface font-bold">
              {scannedRecord ? 'Emergency Report' : 'Offline Health Card'}
            </h1>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setScannedRecord(null);
              setScannedRawText('');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            icon="arrow_back"
            iconPosition="left"
            className="py-2.5 px-4 text-xs font-semibold"
          >
            Scan Another
          </Button>
        </div>

        {/* Feedback states inside details screen */}
        {errorMsg && (
          <div className="p-4 bg-error/10 border border-error/20 rounded-[16px] text-error flex items-start gap-3 animate-fade-in">
            <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">error</span>
            <p className="text-xs font-semibold leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-[16px] text-teal-800 flex items-start gap-3 animate-fade-in font-medium">
            <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">check_circle</span>
            <p className="text-xs leading-relaxed">{successMsg}</p>
          </div>
        )}

        {/* If scannedRecord is verified, display the full details */}
        {scannedRecord && (
          <div className="space-y-6">
            {/* Patient Identity Card */}
            <GlassCard className="flex items-center gap-4">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-surface-container-high flex-shrink-0 flex items-center justify-center border border-white/60 shadow-inner overflow-hidden">
                {scannedRecord.patientRecord.photo ? (
                  <img src={scannedRecord.patientRecord.photo} alt="Profile photo" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-outline text-[32px] md:text-[40px]">person</span>
                )}
              </div>
              <div className="flex-grow min-w-0">
                <h2 className="font-headline-lg-mobile text-on-surface font-bold truncate">{scannedRecord.patientRecord.name}</h2>
                {scannedRecord.privacySettings.showVitals ? (
                  <p className="text-xs text-on-surface-variant mt-1 flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-[16px] text-outline">cake</span>
                    Age: {scannedRecord.patientRecord.age}y &bull; Gender: {scannedRecord.patientRecord.gender}
                  </p>
                ) : (
                  <p className="text-xs text-outline italic mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">lock</span>
                    Vitals hidden by patient settings
                  </p>
                )}
              </div>
              {scannedRecord.privacySettings.showVitals && (
                <div className="flex flex-col items-center justify-center bg-primary text-white rounded-xl px-4 py-2 min-w-[70px] shadow-sm shrink-0">
                  <span className="font-label-caps text-[9px] opacity-90 leading-none">BLOOD</span>
                  <span className="font-bold text-lg mt-0.5">{scannedRecord.patientRecord.bloodGroup}</span>
                </div>
              )}
            </GlassCard>

            {/* Vitals Grid */}
            {scannedRecord.privacySettings.showVitals && (
              <section className="space-y-2">
                <h3 className="font-title-md text-sm text-on-surface flex items-center gap-2 pl-1 font-semibold">
                  <span className="material-symbols-outlined text-primary">analytics</span>
                  Patient Dimensions
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <GlassCard className="p-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-2xl">height</span>
                    <div>
                      <p className="font-label-caps text-[9px] text-outline">Height</p>
                      <p className="font-semibold text-sm text-on-surface mt-0.5">{scannedRecord.patientRecord.height} cm</p>
                    </div>
                  </GlassCard>
                  <GlassCard className="p-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-2xl">weight</span>
                    <div>
                      <p className="font-label-caps text-[9px] text-outline">Weight</p>
                      <p className="font-semibold text-sm text-on-surface mt-0.5">{scannedRecord.patientRecord.weight} kg</p>
                    </div>
                  </GlassCard>
                </div>
              </section>
            )}

            {/* Critical Alerts / Allergies */}
            {scannedRecord.privacySettings.showAllergies ? (
              <section className="space-y-2">
                <h3 className="font-title-md text-sm text-on-surface flex items-center gap-2 pl-1 font-semibold">
                  <span className="material-symbols-outlined text-amber-600 filled-icon">medical_information</span>
                  Critical Alerts &amp; Allergies
                </h3>
                {scannedRecord.patientRecord.allergies.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {scannedRecord.patientRecord.allergies.map((allergy, idx) => (
                      <div 
                        key={idx} 
                        className="bg-gradient-to-r from-amber-300/20 to-amber-500/10 backdrop-blur-[12px] border border-amber-500/40 shadow-[0_4px_30px_rgba(203,167,47,0.1)] rounded-[24px] p-5"
                      >
                        <div className="flex items-start gap-3">
                          <div className="bg-amber-500/20 p-2 rounded-full flex-shrink-0 text-amber-700">
                            <span className="material-symbols-outlined text-[20px] filled-icon">allergies</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-label-caps text-[10px] text-amber-700 font-bold tracking-wider">ALLERGY</h4>
                              <span className={`font-bold text-[9px] px-2 py-0.5 rounded-full border uppercase tracking-wide ${getSeverityStyle(allergy.severity)}`}>
                                {allergy.severity}
                              </span>
                            </div>
                            <p className="font-title-md text-lg text-amber-800 font-semibold mt-0.5">
                              {allergy.name}
                            </p>
                            {allergy.notes && (
                              <p className="text-xs text-amber-800/80 mt-1 leading-relaxed">
                                {allergy.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <GlassCard className="p-5 text-on-surface-variant text-xs italic">
                    No documented allergies or critical alerts.
                  </GlassCard>
                )}
              </section>
            ) : (
              <section className="space-y-2">
                <h3 className="font-title-md text-sm text-on-surface flex items-center gap-2 pl-1 font-semibold">
                  <span className="material-symbols-outlined text-amber-600 filled-icon">medical_information</span>
                  Critical Alerts &amp; Allergies
                </h3>
                <GlassCard className="p-4 flex items-center gap-2 text-outline text-xs">
                  <span className="material-symbols-outlined text-sm">lock</span>
                  <span>Allergies hidden by patient privacy settings.</span>
                </GlassCard>
              </section>
            )}

            {/* Chronic Conditions */}
            {scannedRecord.privacySettings.showConditions ? (
              <section className="space-y-2">
                <h3 className="font-title-md text-sm text-on-surface flex items-center gap-2 pl-1 font-semibold">
                  <span className="material-symbols-outlined text-primary">monitor_heart</span>
                  Chronic Conditions
                </h3>
                <GlassCard className="p-0 overflow-hidden divide-y divide-outline-variant/10">
                  {scannedRecord.patientRecord.conditions.length === 0 ? (
                    <div className="p-5 text-on-surface-variant text-xs italic">
                      No active medical conditions listed.
                    </div>
                  ) : (
                    scannedRecord.patientRecord.conditions.map((cond, idx) => (
                      <div key={idx} className="p-5 flex items-center justify-between hover:bg-white/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-lg">ecg_heart</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-on-surface">{cond.name}</span>
                              <span className={`font-bold text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-wide ${getSeverityStyle(cond.severity)}`}>
                                {cond.severity}
                              </span>
                            </div>
                            {cond.notes && <p className="text-xs text-on-surface-variant mt-0.5">{cond.notes}</p>}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </GlassCard>
              </section>
            ) : (
              <section className="space-y-2">
                <h3 className="font-title-md text-sm text-on-surface flex items-center gap-2 pl-1 font-semibold">
                  <span className="material-symbols-outlined text-primary">monitor_heart</span>
                  Chronic Conditions
                </h3>
                <GlassCard className="p-4 flex items-center gap-2 text-outline text-xs">
                  <span className="material-symbols-outlined text-sm">lock</span>
                  <span>Chronic conditions hidden by patient privacy settings.</span>
                </GlassCard>
              </section>
            )}

            {/* Current Medications */}
            {scannedRecord.privacySettings.showMedications ? (
              <section className="space-y-2">
                <h3 className="font-title-md text-sm text-on-surface flex items-center gap-2 pl-1 font-semibold">
                  <span className="material-symbols-outlined text-primary">medication</span>
                  Current Medications
                </h3>
                <GlassCard className="p-0 overflow-hidden divide-y divide-outline-variant/10">
                  {scannedRecord.patientRecord.medications.length === 0 ? (
                    <div className="p-5 text-on-surface-variant text-xs italic">
                      No active medications listed.
                    </div>
                  ) : (
                    scannedRecord.patientRecord.medications.map((med, idx) => (
                      <div key={idx} className="p-5 flex items-center gap-3 hover:bg-white/50 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined text-lg">pill</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-on-surface">{med.name} ({med.dosage})</span>
                          <span className="text-xs text-on-surface-variant">{med.frequency} &bull; {med.purpose || 'Routine'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </GlassCard>
              </section>
            ) : (
              <section className="space-y-2">
                <h3 className="font-title-md text-sm text-on-surface flex items-center gap-2 pl-1 font-semibold">
                  <span className="material-symbols-outlined text-primary">medication</span>
                  Current Medications
                </h3>
                <GlassCard className="p-4 flex items-center gap-2 text-outline text-xs">
                  <span className="material-symbols-outlined text-sm">lock</span>
                  <span>Medications hidden by patient privacy settings.</span>
                </GlassCard>
              </section>
            )}

            {/* Emergency Contacts */}
            {scannedRecord.privacySettings.showContacts ? (
              <section className="space-y-2">
                <h3 className="font-title-md text-sm text-on-surface flex items-center gap-2 pl-1 font-semibold">
                  <span className="material-symbols-outlined text-primary">contact_emergency</span>
                  Emergency Contacts
                </h3>
                <div className="flex flex-col gap-3">
                  {scannedRecord.patientRecord.contacts.length === 0 ? (
                    <GlassCard className="p-5 text-on-surface-variant text-xs italic">
                      No emergency contacts listed.
                    </GlassCard>
                  ) : (
                    scannedRecord.patientRecord.contacts.map((contact, idx) => (
                      <a
                        key={idx}
                        href={`tel:${contact.phone}`}
                        className="glass-card rounded-[24px] p-5 flex items-center justify-between hover:bg-white/90 active:scale-[0.98] transition-all cursor-pointer group border border-white/60 shadow-sm"
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm text-on-surface">{contact.name}</span>
                          <span className="text-xs text-on-surface-variant mt-0.5">{contact.relationship} &bull; Emergency Contact</span>
                        </div>
                        <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-md bg-error text-white shadow-red-200">
                          <span className="material-symbols-outlined text-lg filled-icon">call</span>
                        </div>
                      </a>
                    ))
                  )}
                </div>
              </section>
            ) : (
              <section className="space-y-2">
                <h3 className="font-title-md text-sm text-on-surface flex items-center gap-2 pl-1 font-semibold">
                  <span className="material-symbols-outlined text-primary">contact_emergency</span>
                  Emergency Contacts
                </h3>
                <GlassCard className="p-4 flex items-center gap-2 text-outline text-xs">
                  <span className="material-symbols-outlined text-sm">lock</span>
                  <span>Emergency contacts hidden by patient privacy settings.</span>
                </GlassCard>
              </section>
            )}

            {/* Download PDF button */}
            <div className="pt-4">
              <Button
                variant="primary"
                onClick={handleDownloadPDF}
                className="w-full py-4 justify-center"
                icon="download"
                iconPosition="left"
              >
                Download Medical PDF
              </Button>
            </div>
          </div>
        )}

        {/* If scannedRawText is offline, display it in a styled terminal code card */}
        {scannedRawText && (
          <div className="space-y-4">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-[16px] text-amber-800 flex items-start gap-3">
              <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">wifi_off</span>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider">Offline Data Decoded</h4>
                <p className="text-[11px] leading-relaxed mt-0.5 text-amber-800/80">
                  This QR code was decoded directly. The details below are stored directly in the QR code itself and displayed without contacting the server.
                </p>
              </div>
            </div>

            <GlassCard className="p-5 font-mono text-xs bg-slate-950 text-emerald-400 border-slate-800 overflow-x-auto whitespace-pre leading-relaxed shadow-2xl rounded-2xl">
              {scannedRawText}
            </GlassCard>
          </div>
        )}
      </div>
    );
  }

  // Active Scanner Input View
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Hidden Canvas for QR decoding */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      <div>
        <span className="font-label-caps text-xs text-on-surface-variant/70 tracking-widest block mb-1">Scanner Utility</span>
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-on-surface font-bold">Scan Health QR</h1>
        <p className="text-xs text-on-surface-variant mt-1">
          Scan a physical printed MediQR card, upload a saved QR code image, or enter a clinical key.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left: Viewfinder */}
        <div className="md:col-span-7 flex flex-col items-center justify-center gap-4">
          <div className="relative w-full aspect-square max-w-[320px] bg-slate-950 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col justify-center items-center">
            {isCameraActive ? (
              <div className="absolute inset-0 w-full h-full z-10">
                <video 
                  ref={videoRef} 
                  muted 
                  playsInline 
                  className="w-full h-full object-cover"
                />
                
                {/* Laser scan line overlay */}
                <div className="absolute left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#cba72f] animate-scan-line z-20" />
                
                {/* Cancel Camera Scanning Button Overlay */}
                <button
                  onClick={stopCameraScan}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 hover:bg-black/85 text-white border border-white/20 rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer z-30 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-[12px]">cancel</span>
                  Stop Scan
                </button>
              </div>
            ) : (
              <>
                {/* Blurred camera background mock */}
                <div 
                  className="absolute inset-0 opacity-30 bg-cover bg-center select-none pointer-events-none"
                  style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=800')`
                  }}
                />
                
                {/* Radial overlay vignette */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_100px,_rgba(0,0,0,0.85)_140px)] pointer-events-none z-10" />

                {/* Scanning viewfinder overlay box */}
                <button
                  onClick={startCameraScan}
                  className="relative w-56 h-56 bg-transparent border border-white/20 rounded-[24px] overflow-hidden shadow-[0_0_30px_rgba(203,167,47,0.1)] flex items-center justify-center cursor-pointer hover:border-amber-400/40 group active:scale-98 transition-all duration-300 z-20"
                >
                  {/* Corner borders */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-500 rounded-tl-[16px]" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-500 rounded-tr-[16px]" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-500 rounded-bl-[16px]" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-500 rounded-br-[16px]" />

                  {/* Animated Scan Line */}
                  <div className="absolute left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#cba72f] animate-scan-line" />

                  <span className="material-symbols-outlined text-white/30 text-5xl group-hover:text-amber-400 transition-colors">
                    photo_camera
                  </span>
                </button>
              </>
            )}
          </div>

          <div className="flex gap-4 w-full max-w-[320px]">
            <Button
              variant="secondary"
              onClick={handleFileUploadClick}
              icon="photo_library"
              iconPosition="left"
              className="flex-1 py-3 justify-center text-center text-xs"
            >
              Upload QR Image
            </Button>
            {isCameraActive ? (
              <Button
                variant="secondary"
                onClick={stopCameraScan}
                icon="cancel"
                iconPosition="left"
                className="flex-1 py-3 justify-center text-center text-xs text-red-600 hover:text-red-700"
              >
                Stop Camera
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={startCameraScan}
                icon="photo_camera"
                iconPosition="left"
                className="flex-1 py-3 justify-center text-center text-xs"
              >
                Scan Camera
              </Button>
            )}
          </div>
        </div>

        {/* Right: Manual Input and Status */}
        <div className="md:col-span-5 flex flex-col gap-4">
          <GlassCard className="p-5 flex flex-col gap-4">
            <h3 className="font-title-md text-sm text-on-surface font-semibold">Verify Link Manually</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Paste a share link or patient ID below — QR preview generates live as you type.
            </p>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="Paste share link or enter ID..."
                value={qrInput}
                onChange={(e) => {
                  setQrInput(e.target.value);
                  setLiveQrText(e.target.value);
                }}
                icon="link"
                required
              />

              {/* Live QR Preview */}
              {liveQrText.trim() && (
                <div className="flex flex-col items-center gap-2 py-2 animate-fade-in">
                  <span className="font-label-caps text-[9px] text-on-surface-variant tracking-widest">LIVE QR PREVIEW</span>
                  <div className="p-3 bg-white rounded-[16px] shadow-md border border-outline-variant/30">
                    <canvas ref={liveQrCanvasRef} className="block rounded-lg" />
                  </div>
                  <span className="text-[10px] text-on-surface-variant/70 italic">Updates instantly as you type</span>
                </div>
              )}

              <Button
                variant="primary"
                type="submit"
                className="w-full py-3 justify-center"
              >
                Validate &amp; Open
              </Button>

              <button
                type="button"
                onClick={handleSimulateScan}
                className="w-full text-center text-[11px] text-amber-700 hover:underline cursor-pointer font-bold mt-2"
              >
                ⚡ Quick Simulate: Scan My Own Code
              </button>
            </form>
          </GlassCard>

          {cameraError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-[16px] text-red-600 font-semibold text-xs leading-relaxed text-center animate-fade-in">
              {cameraError}
            </div>
          )}

          {/* Feedback states */}
          {errorMsg && (
            <div className="p-4 bg-error/10 border border-error/20 rounded-[16px] text-error flex items-start gap-3 animate-fade-in">
              <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">error</span>
              <p className="text-xs font-semibold leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-[16px] text-teal-800 flex items-start gap-3 animate-fade-in font-medium">
              <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5 animate-spin">sync</span>
              <p className="text-xs leading-relaxed">{successMsg}</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan-line {
          position: absolute;
          animation: scan 2.5s infinite linear;
        }
      `}</style>
    </div>
  );
};
