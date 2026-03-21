import React from 'react';
import { Shield, UserCheck, LayoutDashboard, ArrowRight, MapPin, Building2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Logo } from './Logo';

interface LandingPageProps {
  onSelect: (view: 'guard' | 'admin' | 'garden-city' | 'school' | 'school-admin') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelect }) => {
  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-6 font-sans text-text-primary">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center gap-4 mb-4">
          <Logo className="w-20 h-20 drop-shadow-2xl" />
          <h1 className="text-5xl font-black tracking-tight text-text-primary">Neoteric</h1>
        </div>
        <p className="text-sm text-text-secondary uppercase tracking-[0.4em] font-bold">Properties Security System</p>
        <div className="mt-4 flex items-center justify-center gap-2 text-text-muted">
          <MapPin className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Gwalior, Madhya Pradesh</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
        {/* Guard Portal Card */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect('guard')}
          className="group bg-white p-8 rounded-[2rem] border border-border-custom shadow-xl shadow-black/5 text-left transition-all hover:border-brand-primary/30"
        >
          <div className="w-16 h-16 bg-brand-light rounded-2xl flex items-center justify-center mb-6 group-hover:bg-brand-primary group-hover:text-white transition-colors">
            <UserCheck className="w-8 h-8 text-brand-primary group-hover:text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Guard Portal</h2>
          <p className="text-text-secondary mb-8 text-sm leading-relaxed">
            Access the patrol verification system. Submit hourly checkpoint logs, report incidents, and capture photo evidence.
          </p>
          <div className="flex items-center gap-2 text-brand-primary font-bold text-sm uppercase tracking-wider">
            Enter Portal <ArrowRight className="w-4 h-4" />
          </div>
        </motion.button>

        {/* Garden City Portal Card */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect('garden-city')}
          className="group bg-brand-light/20 p-8 rounded-[2rem] border border-brand-primary/10 shadow-xl shadow-brand-primary/5 text-left transition-all hover:border-brand-primary/30"
        >
          <div className="w-16 h-16 bg-brand-primary rounded-2xl flex items-center justify-center mb-6 group-hover:bg-brand-primary/90 transition-colors shadow-lg shadow-brand-primary/20">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-brand-primary">Garden City</h2>
          <p className="text-text-secondary mb-8 text-sm leading-relaxed">
            Dedicated portal for Garden City site. Pre-configured for local checkpoints and rapid patrol reporting.
          </p>
          <div className="flex items-center gap-2 text-brand-primary font-bold text-sm uppercase tracking-wider">
            Open Site Portal <ArrowRight className="w-4 h-4" />
          </div>
        </motion.button>

        {/* Admin Dashboard Card */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect('school')}
          className="group bg-brand-light/20 p-8 rounded-[2rem] border border-brand-primary/10 shadow-xl shadow-brand-primary/5 text-left transition-all hover:border-brand-primary/30"
        >
          <div className="w-16 h-16 bg-brand-primary rounded-2xl flex items-center justify-center mb-6 group-hover:bg-brand-primary/90 transition-colors shadow-lg shadow-brand-primary/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-brand-primary">School Security</h2>
          <p className="text-text-secondary mb-8 text-sm leading-relaxed">
            Dedicated portal for School site. Pre-configured for local checkpoints and rapid patrol reporting.
          </p>
          <div className="flex items-center gap-2 text-brand-primary font-bold text-sm uppercase tracking-wider">
            Open Site Portal <ArrowRight className="w-4 h-4" />
          </div>
        </motion.button>

        {/* School Admin Dashboard Card */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect('school-admin')}
          className="group bg-brand-light/20 p-8 rounded-[2rem] border border-brand-primary/10 shadow-xl shadow-brand-primary/5 text-left transition-all hover:border-brand-primary/30"
        >
          <div className="w-16 h-16 bg-brand-primary rounded-2xl flex items-center justify-center mb-6 group-hover:bg-brand-primary/90 transition-colors shadow-lg shadow-brand-primary/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-brand-primary">School Admin</h2>
          <p className="text-text-secondary mb-8 text-sm leading-relaxed">
            Exclusive dashboard for School site. Monitor patrols, export reports, and track live activity for School only.
          </p>
          <div className="flex items-center gap-2 text-brand-primary font-bold text-sm uppercase tracking-wider">
            Open Dashboard <ArrowRight className="w-4 h-4" />
          </div>
        </motion.button>

        {/* Main Admin Dashboard Card */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect('admin')}
          className="group bg-sidebar-dark p-8 rounded-[2rem] border border-white/5 shadow-2xl text-left transition-all hover:border-brand-primary/30"
        >
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-brand-primary transition-colors">
            <LayoutDashboard className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-white">Admin Dashboard</h2>
          <p className="text-text-muted mb-8 text-sm leading-relaxed">
            Monitor real-time patrol activities, view incident reports, analyze guard performance, and export operational data.
          </p>
          <div className="flex items-center gap-2 text-brand-primary font-bold text-sm uppercase tracking-wider">
            Enter Dashboard <ArrowRight className="w-4 h-4" />
          </div>
        </motion.button>
      </div>

      <div className="mt-16 text-center">
        <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold">
          © 2026 Neoteric Properties • Security Operations Center
        </p>
      </div>
    </div>
  );
};
