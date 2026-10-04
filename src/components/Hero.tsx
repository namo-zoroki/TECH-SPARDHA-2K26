import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/Button';
import { Calendar, MapPin } from 'lucide-react';

export const Hero: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const targetDate = new Date('2026-10-23T00:00:00+05:30').getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance < 0) {
        clearInterval(interval);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background with circuit lines */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black z-10" />
        <img 
          src="/src/assets/images/tech_background_circuit_1791108983180.jpg" 
          alt="Background" 
          className="w-full h-full object-cover opacity-40 scale-110"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.1)_0%,transparent_70%)]" />
      </div>

      <div className="container-width px-6 relative z-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center"
        >
          {/* Official Logos Brand Lockup */}
          <div className="flex items-center justify-center gap-4 md:gap-8 mb-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="w-16 h-16 md:w-24 md:h-24 flex items-center justify-center"
            >
              <img 
                src="/assets/ims.png" 
                alt="IMS Engineering College" 
                className="w-full h-full object-contain" 
              />
            </motion.div>
            
            <div className="w-[1px] h-8 md:h-12 bg-white/20 self-center" />

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="w-16 h-16 md:w-24 md:h-24 flex items-center justify-center"
            >
              <img 
                src="/assets/genesis.png" 
                alt="Genesis Technical Team" 
                className="w-full h-full object-contain" 
              />
            </motion.div>
            
            <div className="w-[1px] h-8 md:h-12 bg-white/20 self-center" />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="w-16 h-16 md:w-24 md:h-24 flex items-center justify-center"
            >
              <img 
                src="/assets/techspardha.png" 
                alt="TechSpardha 2K26" 
                className="w-full h-full object-contain" 
              />
            </motion.div>
          </div>

          <p className="text-cyan-500 font-mono text-sm tracking-[0.5em] uppercase mb-4">
            IMS Engineering College Presents
          </p>
          
          <h1 className="text-6xl md:text-[140px] font-display font-bold leading-none tracking-tighter mb-6 relative">
            <motion.span 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="inline-block"
            >
              TECH
            </motion.span>
            <motion.span 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="text-cyan-500 inline-block"
            >
              स्पर्धा
            </motion.span>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 1, delay: 1.2 }}
              className="absolute -bottom-2 left-0 h-1 bg-gradient-to-r from-cyan-500 to-transparent"
            />
            <span className="block text-2xl md:text-5xl mt-6 text-white/40 tracking-[0.3em] font-mono font-normal">2K26</span>
          </h1>

          <p className="text-xl md:text-2xl text-white/60 mb-12 max-w-2xl font-light">
            "Where Technology Meets Competition"
          </p>

          {/* Countdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {[
              { label: 'Days', value: timeLeft.days },
              { label: 'Hours', value: timeLeft.hours },
              { label: 'Minutes', value: timeLeft.minutes },
              { label: 'Seconds', value: timeLeft.seconds },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center bg-white/5 backdrop-blur-sm border border-white/10 p-6 min-w-[120px]">
                <span className="text-4xl md:text-5xl font-display font-bold text-cyan-400 tabular-nums">
                  {item.value.toString().padStart(2, '0')}
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 mt-2">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Details */}
          <div className="flex flex-wrap justify-center gap-8 mb-12 text-sm uppercase tracking-widest text-white/60">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-500" />
              23–24 October 2026
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-500" />
              Ghaziabad, Uttar Pradesh
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="secondary" size="lg" onClick={() => document.getElementById('events')?.scrollIntoView()}>
              Explore Events
            </Button>
            <Button variant="outline" size="lg" onClick={() => document.getElementById('registration')?.scrollIntoView()}>
              Register Now
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Floating scroll indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40"
      >
        <span className="text-[10px] uppercase tracking-widest font-mono">Scroll</span>
        <div className="w-[1px] h-12 bg-gradient-to-b from-cyan-500 to-transparent" />
      </motion.div>
    </section>
  );
};
