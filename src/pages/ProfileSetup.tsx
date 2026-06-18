import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export const ProfileSetup: React.FC = () => {
  const { user, updatePatientRecord } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (computedAge > 0) setAge(String(computedAge));
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

  return (
    <div className="max-w-md mx-auto space-y-6 pt-4">
      {/* Header Text */}
      <div>
        <h2 className="font-headline-lg-mobile text-on-surface mb-2">Profile Setup</h2>
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
                <label className="font-label-caps text-[10px] text-on-surface-variant pl-1">
                  Date of Birth <span className="lowercase font-normal opacity-70">(auto-fills age)</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">cake</span>
                  <input
                    type="date"
                    className="w-full rounded-[16px] py-3 pl-10 pr-4 font-body-lg text-sm bg-surface-container-high border border-transparent focus:bg-white/90 focus:border-primary/50 focus:ring-0 outline-none transition-all shadow-inner text-on-surface"
                    value={dateOfBirth}
                    onChange={handleDobChange}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="col-span-1 space-y-1.5">
                <label className="font-label-caps text-[10px] text-on-surface-variant pl-1">Age</label>
                <input
                  type="number"
                  placeholder="Yrs"
                  className="w-full rounded-[16px] py-3 px-3 font-body-lg text-sm bg-surface-container-high border border-transparent focus:bg-white/90 focus:border-primary/50 focus:ring-0 outline-none transition-all shadow-inner text-on-surface text-center"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                />
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
    </div>
  );
};
