import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { Button } from './ui/Button';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileMenuOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'About', href: '#about' },
    { name: 'Events', href: '#events' },
    { name: 'Schedule', href: '#schedule' },
    { name: 'Rules', href: '#rules' },
    { name: 'Contact', href: '#contact' },
  ];

  const scrollTo = (href: string) => {
    setMobileMenuOpen(false);
    const targetId = href.replace('#', '');
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = href;
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled || mobileMenuOpen ? 'bg-black/90 backdrop-blur-md border-b border-white/10 py-4' : 'bg-transparent py-5 sm:py-6'
      }`}
    >
      <div className="container-width px-4 sm:px-6 flex items-center justify-between">
        {/* Brand */}
        <a href="#home" onClick={() => scrollTo('#home')} className="flex items-center gap-2.5 sm:gap-3 group">
          <div className="h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 flex items-center justify-center group-hover:scale-105 transition-transform">
            <img src="/assets/genesis.webp" alt="GENESIS Technical Society" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-base sm:text-lg md:text-xl font-display font-bold tracking-tight">GENESIS</span>
            <span className="text-[7px] sm:text-[8px] md:text-[10px] tracking-[0.2em] sm:tracking-[0.25em] text-cyan-400 uppercase">Technical Society</span>
          </div>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={(e) => {
                e.preventDefault();
                scrollTo(link.href);
              }}
              className="text-xs font-medium uppercase tracking-widest text-white/70 hover:text-cyan-400 transition-colors"
            >
              {link.name}
            </a>
          ))}
          <Button variant="secondary" size="sm" onClick={() => scrollTo('#registration')}>
            Register Now
          </Button>
        </div>

        {/* Mobile Toggle */}
        <button
          type="button"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
          className="md:hidden text-white p-2 rounded hover:text-cyan-400 hover:bg-white/5 transition-colors focus:outline-none"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
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
            <div className="flex flex-col px-6 py-6 space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollTo(link.href);
                  }}
                  className="py-3 text-sm font-semibold uppercase tracking-widest text-white/80 hover:text-cyan-400 border-b border-white/5 transition-colors"
                >
                  {link.name}
                </a>
              ))}
              <div className="pt-4">
                <Button
                  variant="secondary"
                  className="w-full py-3 text-sm"
                  onClick={() => scrollTo('#registration')}
                >
                  Register Now
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
