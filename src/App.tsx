import React, { useState, useEffect } from 'react';
import { Preloader } from './components/Preloader';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { Events, GamerFiestaSpecial } from './components/Events';
import { RegistrationForm } from './components/RegistrationForm';
import { Schedule, Rules, Contact, Footer } from './components/InfoSections';
import { AdminDashboard } from './components/AdminDashboard';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      setIsAdmin(window.location.hash === '#admin');
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Initial check
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (isAdmin) {
    return (
      <>
        <div className="fixed top-0 left-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/10 py-4">
          <div className="container-width px-6 flex justify-between items-center">
            <a href="/" className="flex items-center gap-4 group">
              <div className="h-10 w-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                <img src="/assets/techspardha.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-xl font-display font-bold tracking-tighter flex items-center">
                GENESIS <span className="text-xs text-white/40 ml-2 pt-1 uppercase">Admin</span>
              </span>
            </a>
            <Button variant="outline" size="sm" onClick={() => window.location.hash = ''}>Exit Admin</Button>
          </div>
        </div>
        <AdminDashboard />
      </>
    );
  }

  return (
    <div className="relative selection:bg-cyan-500/30">
      <Preloader />
      
      <Navbar />
      
      <main>
        <Hero />
        <About />
        <Events />
        <GamerFiestaSpecial />
        <RegistrationForm />
        <Schedule />
        <Rules />
        <Contact />
      </main>
      
      <Footer />

      {/* Dynamic scanlines overlay for futuristic feel */}
      <div className="fixed inset-0 pointer-events-none z-[60] opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />
    </div>
  );
}

const Button = ({ children, variant, size, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
      variant === 'outline' ? 'border border-white/20 hover:bg-white/5' : 'bg-white text-black'
    }`}
  >
    {children}
  </button>
);

