import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export const EmergencyContacts: React.FC = () => {
  const { user, addContact, removeContact } = useAuth();
  const navigate = useNavigate();

  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');

  if (!user) return null;

  const handleOpenAdd = () => {
    setName('');
    setRelationship('');
    setPhone('');
    setShowAddModal(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    addContact({
      name: name.trim(),
      relationship: relationship.trim() || 'Contact',
      phone: phone.trim()
    });
    setShowAddModal(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="font-label-caps text-xs text-on-surface-variant/70 tracking-widest block mb-1">Safety &amp; Contacts</span>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-on-surface font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-error filled-icon">emergency</span>
            Emergency Contacts
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Tap the phone icon to immediately call a contact in case of an emergency.
          </p>
        </div>
      </div>

      {/* Contacts List */}
      {user.patientRecord.contacts.length === 0 ? (
        <GlassCard className="text-center py-12">
          <span className="material-symbols-outlined text-outline-variant text-5xl mb-3">contacts</span>
          <p className="text-on-surface-variant font-medium text-lg">No emergency contacts set.</p>
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-4">
          {user.patientRecord.contacts.map((contact, idx) => {
            const isPrimary = idx === 0; // First contact is primary
            const initials = contact.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

            return (
              <GlassCard
                key={idx}
                className="relative overflow-hidden p-4 group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Red outline accent for primary emergency contact */}
                {isPrimary && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-error rounded-l-[24px]" />
                )}

                {/* Left Section: Avatar + Details */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Avatar Icon */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    isPrimary 
                      ? 'bg-error-container text-on-error-container' 
                      : 'bg-secondary-container text-on-secondary-container'
                  }`}>
                    {initials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-title-md text-sm text-on-surface truncate font-semibold max-w-[150px] sm:max-w-none">{contact.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wide border shrink-0 ${
                        isPrimary 
                          ? 'bg-error/10 text-error border-error/20' 
                          : 'bg-outline-variant/30 text-on-surface-variant border-transparent'
                      }`}>
                        {contact.relationship}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant truncate">{contact.phone}</p>
                  </div>
                </div>

                {/* Right Section: Actions */}
                <div className="flex items-center justify-end gap-2 shrink-0 border-t border-outline-variant/10 sm:border-t-0 pt-3 sm:pt-0">
                  {/* Delete button */}
                  <button
                    onClick={() => removeContact(idx)}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-outline hover:text-error hover:bg-error/5 transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>

                  {/* Phone Call link */}
                  <a
                    href={`tel:${contact.phone}`}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md shrink-0 ${
                      isPrimary 
                        ? 'bg-error text-white hover:bg-error/90 shadow-red-200' 
                        : 'bg-surface-container-high text-on-surface hover:bg-surface-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl filled-icon">call</span>
                  </a>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Add Contact Trigger Button */}
      <button
        onClick={handleOpenAdd}
        className="w-full py-4 rounded-[16px] bg-white/40 hover:bg-white/60 backdrop-blur-md border border-dashed border-outline text-primary font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
      >
        <span className="material-symbols-outlined">person_add</span>
        Add Emergency Contact
      </button>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
          <GlassCard className="w-full max-w-md border border-white/80 shadow-2xl">
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <h3 className="font-title-md text-on-surface font-semibold">Add Emergency Contact</h3>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-label-caps text-[10px] text-on-surface-variant pl-1">Full Name</label>
                  <Input
                    type="text"
                    placeholder="e.g. Sarah Miller"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-label-caps text-[10px] text-on-surface-variant pl-1">Relationship</label>
                  <Input
                    type="text"
                    placeholder="e.g. Spouse, Parent, Physician"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-label-caps text-[10px] text-on-surface-variant pl-1">Phone Number</label>
                  <Input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                >
                  Save Contact
                </Button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Flow Navigation */}
      <div className="pt-4 flex justify-between">
        <Button
          variant="secondary"
          onClick={() => navigate('/profile/medications')}
        >
          Back to Medications
        </Button>
        <Button
          variant="primary"
          onClick={() => navigate('/dashboard')}
          icon="check"
        >
          Finish Setup
        </Button>
      </div>
    </div>
  );
};
