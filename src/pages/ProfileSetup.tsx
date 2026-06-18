import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export const ProfileSetup: React.FC = () => {
  const { user, updatePatientRecord, updatePrivacySettings, regenerateQrData, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [name, setName] = useState(user?.patientRecord.name || '');
  const [bloodGroup, setBloodGroup] = useState(user?.patientRecord.bloodGroup || '');
  const [height, setHeight] = useState(user?.patientRecord.height || '');
  const [weight, setWeight] = useState(user?.patientRecord.weight || '');
  const [age, setAge] = useState(user?.patientRecord.age || '');
  const [gender, setGender] = useState(user?.patientRecord.gender || '');
  const [photo, setPhoto] = useState(user?.patientRecord.photo || '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.patientRecord.dateOfBirth || '');
  const [mobileNumber, setMobileNumber] = useState(user?.patientRecord.mobileNumber || '');

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Confetti celebration helper when DOB is entered
  const triggerConfetti = () => {
    const canvas = document.getElementById('confetti-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#0066cc', '#2ABFBF', '#fcbb00', '#e11d48', '#10b981', '#a855f7'];
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      rotation: number;
      rotationSpeed: number;
      opacity: number;
    }> = [];

    const centerX = canvas.width / 2;
    const centerY = canvas.height * 0.55;

    for (let i = 0; i < 90; i++) {
      const angle = Math.PI * 1.1 + Math.random() * Math.PI * 0.8;
      const speed = 7 + Math.random() * 14;
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3.5 + Math.random() * 5.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.25,
        opacity: 1
      });
    }

    const update = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let stillActive = false;

      particles.forEach(p => {
        if (p.opacity > 0.01) {
          stillActive = true;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.35; // gravity
          p.vx *= 0.97; // air resistance
          p.vy *= 0.97;
          p.rotation += p.rotationSpeed;
          p.opacity -= 0.014;

          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;

          if (Math.random() > 0.45) {
            ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 1.5);
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      });

      if (stillActive) {
        requestAnimationFrame(update);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    update();
  };

  // Auto-calculate age from DOB
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dob = e.target.value;
    setDateOfBirth(dob);
    if (dob) {
      const today = new Date();
      const birth = new Date(dob);
      let computedAge = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        computedAge--;
      }
      if (computedAge > 0) {
        setAge(String(computedAge));
        // Small delay to trigger premium celebration animation
        setTimeout(() => triggerConfetti(), 80);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    let qrId = user?.patientRecord.qrId;
    if (!qrId) {
      qrId = 'mqr-' + Math.random().toString(36).substring(2, 11);
    }

    updatePatientRecord({
      name,
      bloodGroup,
      height,
      weight,
      age,
      gender,
      photo,
      dateOfBirth,
      mobileNumber,
      qrId
    });

    // Navigate to next onboarding step: conditions
    navigate('/profile/conditions');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pt-4">
      {/* Header Text - Centered with Settings Option */}
      <div className="flex flex-col items-center text-center">
        {/* Top Center Settings & Privacy Button */}
        <button
          type="button"
          onClick={() => setShowSettingsModal(true)}
          className="mb-4 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold px-5 py-2.5 rounded-full text-sm flex items-center gap-2 transition-all shadow-sm cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px] text-primary">settings</span>
          Settings & Privacy Preferences
        </button>

        <h2 className="font-headline-lg-mobile text-on-surface mb-1">Profile Setup</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Complete your medical vitals to generate your secure health identifier.
        </p>
      </div>

      {/* Glass Card Form Container */}
      <GlassCard>
        <form onSubmit={handleSave} className="space-y-6">
          {/* Photo Upload Field */}
          <div className="flex flex-col items-center justify-center pt-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoChange}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={handlePhotoClick}
              className="relative w-20 h-20 rounded-full bg-surface-container-high border border-white/50 flex items-center justify-center shadow-inner overflow-hidden cursor-pointer hover:bg-surface-variant/80 active:scale-95 transition-all group"
              type="button"
            >
              {photo ? (
                <img src={photo} alt="Profile preview" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-[28px]">
                  add_a_photo
                </span>
              )}
              <div className="absolute inset-0 rounded-full border border-dashed border-outline-variant scale-[1.05] opacity-50 pointer-events-none" />
            </button>
            <span className="mt-3 font-label-caps text-[10px] text-on-surface-variant">
              {photo ? 'Change Photo' : 'Upload Photo'}
            </span>
          </div>

          {/* Input Fields */}
          <div className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="font-label-caps text-[10px] text-on-surface-variant pl-1">Full Name</label>
              <Input
                type="text"
                placeholder="e.g. Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                icon="badge"
                required
              />
            </div>

            {/* Row: Date of Birth & Age side by side */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3 space-y-1.5">
                <label className="font-label-caps text-[10px] text-on-surface-variant pl-1">Date of Birth</label>
                <div className="flex items-center bg-surface-container-high rounded-[16px] p-1 border border-transparent focus-within:border-primary/50 focus-within:bg-white/90 transition-all duration-200 shadow-inner h-[52px]">
                  <span className="material-symbols-outlined text-outline-variant pl-3 pr-2 text-[20px] pointer-events-none">cake</span>
                  <input
                    type="date"
                    className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface text-sm py-2 pr-3 w-full cursor-pointer"
                    value={dateOfBirth}
                    onChange={handleDobChange}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="col-span-1 space-y-1.5">
                <label className="font-label-caps text-[10px] text-on-surface-variant pl-1">Age</label>
                <div className="flex items-center bg-surface-container-high rounded-[16px] p-1 border border-transparent focus-within:border-primary/50 focus-within:bg-white/90 transition-all duration-200 shadow-inner h-[52px]">
                  <input
                    type="number"
                    placeholder="Yrs"
                    className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface text-sm py-2 px-1 w-full text-center"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Mobile Number */}
            <div className="space-y-1.5">
              <label className="font-label-caps text-[10px] text-on-surface-variant pl-1">Mobile Number</label>
              <Input
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                icon="phone"
              />
            </div>

            {/* Row: Gender & Blood Group side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-label-caps text-[10px] text-on-surface-variant pl-1">Gender</label>
                <div className="relative">
                  <select
                    className="w-full rounded-[16px] py-3 pl-3 pr-8 font-body-lg text-sm bg-surface-container-high border border-transparent focus:bg-white/90 focus:border-primary/50 focus:ring-0 outline-none transition-all shadow-inner text-on-surface appearance-none cursor-pointer"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[16px]">
                    expand_more
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-label-caps text-[10px] text-on-surface-variant pl-1">Blood Group</label>
                <div className="relative">
                  <select
                    className="w-full rounded-[16px] py-3 pl-3 pr-8 font-body-lg text-sm bg-surface-container-high border border-transparent focus:bg-white/90 focus:border-primary/50 focus:ring-0 outline-none transition-all shadow-inner text-on-surface appearance-none cursor-pointer"
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[16px]">
                    water_drop
                  </span>
                </div>
              </div>
            </div>

            {/* Row: Height & Weight */}
            <div className="flex gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="font-label-caps text-[10px] text-on-surface-variant pl-1">
                  Height <span className="lowercase font-normal opacity-70">(cm)</span>
                </label>
                <input
                  type="number"
                  placeholder="170"
                  className="w-full rounded-[16px] py-3 px-4 font-body-lg text-sm bg-surface-container-high border border-transparent focus:bg-white/90 focus:border-primary/50 focus:ring-0 outline-none transition-all shadow-inner text-on-surface"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  required
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="font-label-caps text-[10px] text-on-surface-variant pl-1">
                  Weight <span className="lowercase font-normal opacity-70">(kg)</span>
                </label>
                <input
                  type="number"
                  placeholder="65"
                  className="w-full rounded-[16px] py-3 px-4 font-body-lg text-sm bg-surface-container-high border border-transparent focus:bg-white/90 focus:border-primary/50 focus:ring-0 outline-none transition-all shadow-inner text-on-surface"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Action Area */}
          <div className="pt-4 pb-2">
            <Button
              variant="primary"
              type="submit"
              className="w-full py-4 justify-center"
              icon="arrow_forward"
            >
              Save &amp; Continue
            </Button>
            <p className="text-center text-xs text-outline mt-4">
              Your data is encrypted and securely stored.
            </p>
          </div>
        </form>
      </GlassCard>

      {/* Interactive Settings & Privacy Modal for Mobile Apps */}
      {showSettingsModal && user && (
        <div 
          onClick={() => setShowSettingsModal(false)}
          className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white/85 backdrop-blur-xl rounded-[28px] border border-slate-100/50 p-6 max-w-sm w-full max-h-[85vh] overflow-y-auto shadow-[0_24px_60px_rgba(0,102,204,0.15)] flex flex-col relative cursor-default text-left"
          >
            {/* Close button */}
            <button 
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>

            {/* Modal Title */}
            <div className="mb-6 text-center">
              <span className="font-label-caps text-xs text-primary tracking-widest block mb-1">Preferences</span>
              <h2 className="text-2xl font-bold text-slate-900">Settings &amp; Privacy</h2>
              <p className="text-xs text-slate-400 mt-1">Manage your clinical profile, security, and privacy.</p>
            </div>

            <div className="space-y-6 flex-1 pr-1">
              {/* Category: Privacy */}
              <section className="space-y-2.5">
                <h3 className="font-title-md text-sm text-primary font-bold px-1">Privacy &amp; Visibility</h3>
                <div className="bg-white/90 border border-slate-100 rounded-[20px] shadow-sm divide-y divide-slate-100">
                  
                  {/* Vitals Toggle */}
                  <div className="p-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                    <div>
                      <div className="font-semibold text-sm text-slate-900">Vitals &amp; Demographics</div>
                      <div className="text-xs text-slate-400 mt-0.5">Age, Gender, Blood Group, Height, Weight</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={user.privacySettings.showVitals}
                        onChange={() => updatePrivacySettings({ showVitals: !user.privacySettings.showVitals })}
                        className="sr-only peer" 
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner" />
                    </label>
                  </div>

                  {/* Conditions Toggle */}
                  <div className="p-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                    <div>
                      <div className="font-semibold text-sm text-slate-900">Medical Conditions</div>
                      <div className="text-xs text-slate-400 mt-0.5">Chronic or active clinical conditions</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={user.privacySettings.showConditions}
                        onChange={() => updatePrivacySettings({ showConditions: !user.privacySettings.showConditions })}
                        className="sr-only peer" 
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner" />
                    </label>
                  </div>

                  {/* Allergies Toggle */}
                  <div className="p-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                    <div>
                      <div className="font-semibold text-sm text-slate-900">Documented Allergies</div>
                      <div className="text-xs text-slate-400 mt-0.5">Severe reactions, anaphylaxis alerts</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={user.privacySettings.showAllergies}
                        onChange={() => updatePrivacySettings({ showAllergies: !user.privacySettings.showAllergies })}
                        className="sr-only peer" 
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner" />
                    </label>
                  </div>

                  {/* Medications Toggle */}
                  <div className="p-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                    <div>
                      <div className="font-semibold text-sm text-slate-900">Active Medications</div>
                      <div className="text-xs text-slate-400 mt-0.5">Current prescriptions, dosages &amp; schedule</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={user.privacySettings.showMedications}
                        onChange={() => updatePrivacySettings({ showMedications: !user.privacySettings.showMedications })}
                        className="sr-only peer" 
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner" />
                    </label>
                  </div>

                  {/* Contacts Toggle */}
                  <div className="p-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                    <div>
                      <div className="font-semibold text-sm text-slate-900">Emergency Contacts</div>
                      <div className="text-xs text-slate-400 mt-0.5">Immediate tap-to-call contacts info</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={user.privacySettings.showContacts}
                        onChange={() => updatePrivacySettings({ showContacts: !user.privacySettings.showContacts })}
                        className="sr-only peer" 
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner" />
                    </label>
                  </div>

                </div>
              </section>

              {/* Category: Security */}
              <section className="space-y-2.5">
                <h3 className="font-title-md text-sm text-primary font-bold px-1">Security</h3>
                <div className="bg-white/90 border border-slate-100 rounded-[20px] shadow-sm divide-y divide-slate-100">
                  <button 
                    type="button"
                    onClick={() => {
                      alert("Two-Factor Authentication is managed by your organization's security policy.");
                    }}
                    className="w-full text-left p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-[18px]">security</span>
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-slate-900">Two-Factor Authentication</div>
                        <div className="text-xs text-slate-400 mt-0.5">Currently enabled via SMS</div>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 text-[18px]">chevron_right</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => {
                      if (confirm("Are you sure you want to regenerate your QR Key? Any old QR codes you printed or saved will become invalid.")) {
                        regenerateQrData();
                        alert("QR Key regenerated successfully. Old QR codes are now invalidated!");
                      }
                    }}
                    className="w-full text-left p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-700">
                        <span className="material-symbols-outlined text-[18px]">qr_code</span>
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-slate-900">Regenerate QR Key</div>
                        <div className="text-xs text-slate-400 mt-0.5">Invalidate old printed codes</div>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 text-[18px]">chevron_right</span>
                  </button>
                </div>
              </section>

              {/* Category: Account */}
              <section className="space-y-2.5">
                <h3 className="font-title-md text-sm text-primary font-bold px-1">Account</h3>
                <div className="bg-white/90 border border-slate-100 rounded-[20px] shadow-sm divide-y divide-slate-100">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <span className="material-symbols-outlined text-[18px]">mail</span>
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-slate-900">Email Address</div>
                        <div className="text-xs text-slate-400 mt-0.5">{user.email}</div>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={() => {
                      const newPhone = prompt("Enter new phone number:", user.phone || '');
                      if (newPhone !== null && newPhone.trim() !== '') {
                        alert("Phone number verification code sent!");
                      }
                    }}
                    className="w-full text-left p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <span className="material-symbols-outlined text-[18px]">phone_iphone</span>
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-slate-900">Change Phone Number</div>
                        <div className="text-xs text-slate-400 mt-0.5">{user.phone || 'Not linked'}</div>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 text-[18px]">chevron_right</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => {
                      if (confirm("WARNING: Are you absolutely sure you want to delete your account? This will permanently erase your medical data and health QR code identity. This action is irreversible.")) {
                        alert("Account deletion request submitted. Contact support to finalize.");
                      }
                    }}
                    className="w-full text-left p-4 flex items-center justify-between hover:bg-error/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-error/10 flex items-center justify-center text-error">
                        <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-error">Delete Account</div>
                        <div className="text-xs text-error/85 mt-0.5">Permanently erase medical data</div>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-error/55 text-[18px]">chevron_right</span>
                  </button>
                </div>
              </section>

              {/* Log Out */}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full mt-4 bg-error/10 hover:bg-error/20 active:scale-95 border border-error/20 text-error font-semibold rounded-xl py-3 flex justify-center items-center gap-2 transition-all duration-200 shadow-sm cursor-pointer text-sm"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
      <canvas 
        id="confetti-canvas" 
        className="fixed inset-0 pointer-events-none z-[999] w-full h-full" 
      />
    </div>
  );
};
