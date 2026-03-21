import React, { useState, useEffect } from 'react';
import { Shield, LayoutDashboard, UserCheck, AlertTriangle, Menu, X, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import GuardView from './components/GuardView';
import GardenCityGuardView from './components/GardenCityGuardView';
import SchoolGuardView from './components/SchoolGuardView';
import SchoolAdminView from './components/SchoolAdminView';
import AdminView from './components/AdminView';
import { LandingPage } from './components/LandingPage';
import { cn } from './utils';
import { LogOut, Home } from 'lucide-react';
import { auth } from './firebase';
import firebaseConfig from '../firebase-applet-config.json';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { firebaseService } from './services/firebaseService';
import { api } from './api';
import { Logo } from './components/Logo';

type View = 'home' | 'guard' | 'admin' | 'garden-city' | 'school' | 'school-admin';

function Login({ onLogin }: { onLogin: () => void }) {
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onLogin();
    } catch (err: any) {
      console.error('Login failed:', err);
      if (err.code === 'auth/configuration-not-found') {
        setError('Google Sign-In is not enabled in your Firebase Console. Please enable it under Authentication > Sign-in method.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized in your Firebase Console. Please add it under Authentication > Settings > Authorized domains.');
      } else {
        setError(err.message || 'Login failed. Please check your configuration.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-page-bg flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-10 rounded-[40px] shadow-2xl border border-border-custom max-w-md w-full text-center"
      >
        <div className="w-24 h-24 mx-auto mb-8 drop-shadow-2xl">
          <Logo className="w-full h-full" />
        </div>
        <h1 className="text-3xl font-black text-text-primary mb-2">Neoteric Properties</h1>
        <p className="text-text-secondary mb-10">Secure Guard Portal & Admin Dashboard</p>
        
        {error && (
          <div className="mb-6 p-4 bg-status-red/10 border border-status-red/20 rounded-2xl text-status-red text-sm text-left">
            <p className="font-bold mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> 
              Configuration Error
            </p>
            <p className="mb-3 opacity-90">{error}</p>
            <div className="p-3 bg-white/50 rounded-xl border border-status-red/10 space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-black opacity-50">Required Actions:</p>
              <ul className="list-disc list-inside text-[11px] space-y-1 opacity-80">
                <li>Go to <a href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`} target="_blank" rel="noreferrer" className="underline font-bold">Firebase Console</a></li>
                <li>Enable <b>Google</b> in Sign-in providers</li>
                <li>Add this URL to <b>Authorized Domains</b></li>
              </ul>
            </div>
          </div>
        )}

        <button 
          onClick={handleLogin}
          className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-brand-primary/20 hover:bg-brand-primary/90 transition-all flex items-center justify-center gap-3"
        >
          <LogIn className="w-5 h-5" />
          Sign in with Google
        </button>
        
        <p className="mt-8 text-xs text-text-muted uppercase tracking-widest font-bold">Authorized Personnel Only</p>
        
        <button 
          onClick={() => {
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(registrations => {
                for (let registration of registrations) {
                  registration.unregister();
                }
              });
            }
            caches.keys().then(names => {
              for (let name of names) caches.delete(name);
            });
            window.location.reload();
          }}
          className="mt-4 text-[10px] text-text-muted hover:text-brand-primary transition-colors uppercase tracking-widest font-bold"
        >
          Clear App Cache
        </button>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view') as View;
    if (viewParam && ['home', 'guard', 'admin', 'garden-city', 'school', 'school-admin'].includes(viewParam)) {
      setView(viewParam);
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
      if (u) {
        // Seed data if authenticated
        const seed = async () => {
          try {
            const [guards, checkpoints] = await Promise.all([api.getGuards(), api.getCheckpoints()]);
            await firebaseService.seedInitialData(guards, checkpoints);
          } catch (err) {
            console.error('Seeding failed:', err);
          }
        };
        seed();
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSetView = (newView: View) => {
    setView(newView);
    const url = new URL(window.location.href);
    if (newView === 'home') {
      url.searchParams.delete('view');
    } else {
      url.searchParams.set('view', newView);
    }
    window.history.pushState({}, '', url);
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={() => {}} />;
  }

  if (view === 'home') {
    return <LandingPage onSelect={handleSetView} />;
  }

  return (
    <div className="min-h-screen bg-page-bg flex flex-col md:flex-row font-sans text-text-primary">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-border-custom p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Logo className="w-10 h-10" />
          <span className="font-black text-text-primary tracking-tight">Neoteric</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-text-secondary">
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth >= 768) && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className={cn(
              "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar-dark text-white p-6 transition-transform md:relative md:translate-x-0",
              !isSidebarOpen && "hidden md:block"
            )}
          >
            <div className="flex flex-col gap-1 mb-10">
              <div className="flex items-center gap-3">
                <Logo className="w-12 h-12 drop-shadow-lg" />
                <div>
                  <h1 className="text-xl font-black tracking-tight leading-none text-white">Neoteric</h1>
                  <p className="text-[9px] text-brand-primary uppercase tracking-[0.3em] font-bold mt-1">Properties</p>
                </div>
              </div>
            </div>

            <nav className="space-y-2">
              <div className="px-4 py-2 text-[10px] font-black text-text-muted uppercase tracking-widest">
                {(view === 'admin' || view === 'school-admin') ? 'Admin Dashboard' : 'Guard Portal'}
              </div>
              
              {view === 'garden-city' && (
                <div className="px-4 py-2 mb-2">
                  <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-xl p-3">
                    <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest mb-1">Active Site</p>
                    <p className="text-xs font-bold text-white">Garden City</p>
                  </div>
                </div>
              )}

              {view === 'school' && (
                <div className="px-4 py-2 mb-2">
                  <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-xl p-3">
                    <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest mb-1">Active Site</p>
                    <p className="text-xs font-bold text-white">School</p>
                  </div>
                </div>
              )}

              {view === 'school-admin' && (
                <div className="px-4 py-2 mb-2">
                  <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-xl p-3">
                    <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest mb-1">Active Site</p>
                    <p className="text-xs font-bold text-white">School Admin</p>
                  </div>
                </div>
              )}

              {(view === 'admin' || view === 'school-admin') && (
                <button
                  onClick={() => handleSetView('home')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-text-muted hover:bg-white/5 mb-2"
                >
                  <Home className="w-5 h-5" />
                  <span className="font-medium">Home</span>
                </button>
              )}
              
              <button
                onClick={() => { auth.signOut(); setIsSidebarOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-status-red hover:bg-status-red/10"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Sign Out</span>
              </button>

              <div className="h-px bg-white/5 my-4" />
            </nav>

            <div className="absolute bottom-8 left-6 right-6">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-[10px] text-text-muted mb-1 uppercase tracking-wider font-bold">Gwalior, MP</p>
                <div className="flex items-center gap-2 text-status-green">
                  <div className="w-2 h-2 bg-status-green rounded-full animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-widest">Live System</span>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {view === 'guard' ? <GuardView /> : 
               view === 'garden-city' ? <GardenCityGuardView /> :
               view === 'school' ? <SchoolGuardView /> :
               view === 'school-admin' ? <SchoolAdminView /> :
               <AdminView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
