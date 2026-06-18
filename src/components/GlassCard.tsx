import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  goldBorder?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, goldBorder = false, className = '', ...props }) => {
  return (
    <div
      className={`${goldBorder ? 'glass-panel-gold' : 'glass-panel'} rounded-[24px] p-6 relative overflow-hidden transition-all duration-300 ${className}`}
      {...props}
    >
      {/* Inner Ring Highlight */}
      <div className={`absolute inset-0 rounded-[24px] border pointer-events-none m-[2px] ${goldBorder ? 'border-amber-400/20' : 'border-white/20'}`} />
      {children}
    </div>
  );
};
