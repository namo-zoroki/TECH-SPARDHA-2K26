import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { Button } from './ui/Button';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'About', href: '#about' },
    { name: 'Events', href: '#events' },
    { name: 'Schedule', href: '#schedule' },
    { name: 'Rules', href: '#rules' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? 'bg-black/80 backdrop-blur-md border-b border-white/10 py-4' : 'bg-transparent py-6'
      }`}
    >
      <div className="container-width px-6 flex items-center justify-between">
        {/* Brand */}
        <a href="#home" className="flex items-center gap-3 group">
          <div className="h-10 w-10 md:h-12 md:w-12 flex items-center justify-center group-hover:scale-105 transition-transform">
            <img src="/assets/genesis.png" alt="GENESIS Technical Society" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-lg md:text-xl font-display font-bold tracking-tight">GENESIS</span>
            <span className="text-[8px] md:text-[10px] tracking-[0.25em] text-cyan-400 uppercase">Technical Society</span>
          </div>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-xs font-medium uppercase tracking-widest text-white/70 hover:text-cyan-400 transition-colors"
            >
              {link.name}
            </a>
          ))}
          <Button variant="secondary" size="sm" onClick={() => window.location.href = '#registration'}>
            Register Now
          </Button>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-black/95 backdrop-blur-xl border-b border-white/10 overflow-hidden"
          >
            <div className="flex flex-col gap-6 p-8">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium uppercase tracking-widest text-white/70 hover:text-cyan-400"
                >
                  {link.name}
                </a>
              ))}
              <Button variant="secondary" className="w-full" onClick={() => {
                setMobileMenuOpen(false);
                window.location.href = '#registration';
              }}>
                Register Now
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
