import React, { useState } from 'react';
import { motion } from 'motion/react';
import { events, TechEvent } from '@/src/data/events';
import { EventCard } from './EventCard';
import { EventModal } from './EventModal';
import { Button } from './ui/Button';
import { Trophy, Gamepad2, Rocket } from 'lucide-react';

export const Events: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<TechEvent | null>(null);
  const [filter, setFilter] = useState('All');

  const categories = ['All', ...new Set(events.map(e => e.category))];

  const filteredEvents = filter === 'All' 
    ? events 
    : events.filter(e => e.category === filter);

  return (
    <section id="events" className="section-padding bg-neutral-950">
      <div className="container-width">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              The <span className="text-cyan-500">Arena</span>
            </h2>
            <p className="text-white/60 text-lg">
              Explore 11 high-octane competitions across diverse domains. From code debugging to campus-wide treasure hunts, find your battleground.
            </p>
          </motion.div>

          {/* Filter Controls - Button style as per guidelines */}
          <div className="flex flex-wrap gap-2 p-1 bg-white/5 border border-white/10 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                  filter === cat 
                    ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
                    : 'text-white/40 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <motion.div 
          layout
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredEvents.map((event) => (
            <EventCard 
              key={event.id} 
              event={event} 
              onViewDetails={(e) => setSelectedEvent(e)} 
            />
          ))}
        </motion.div>
      </div>

      <EventModal 
        event={selectedEvent} 
        onClose={() => setSelectedEvent(null)} 
      />
    </section>
  );
};

export const GamerFiestaSpecial: React.FC = () => {
  const gamerFiesta = events.find(e => e.id === "08");

  return (
    <section className="section-padding relative overflow-hidden bg-[#0a001a]">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-600/20 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />

      <div className="container-width relative z-10">
        <div className="bg-white/5 border border-white/10 p-8 md:p-16 relative overflow-hidden">
          {/* Animated glow border */}
          <div className="absolute inset-0 border border-purple-500/20 pointer-events-none" />
          
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/20 border border-purple-500/40 text-purple-400">
                  <Gamepad2 className="w-8 h-8" />
                </div>
                <span className="text-sm font-mono text-purple-400 uppercase tracking-[0.3em]">Special Event #08</span>
              </div>
              
              <h2 className="text-5xl md:text-7xl font-display font-bold leading-tight">
                GAMER <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">FIESTA</span> 2.0
              </h2>

              <p className="text-white/60 text-lg leading-relaxed">
                The ultimate e-sports showdown. Compete with the best, show your skills, and take home the glory. Entry fee applies.
              </p>

              <div className="flex flex-wrap gap-12">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Format</p>
                  <div className="flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-cyan-400" />
                    <span className="text-xl font-bold">Team Event</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Entry Fee</p>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <span className="text-xl font-bold">₹200 / Team</span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-400/5 border border-yellow-400/20 p-4">
                <p className="text-xs text-yellow-400/80 leading-relaxed font-mono">
                  * Payment verification required. Registration is only confirmed after the transaction screenshot is verified by the team.
                </p>
              </div>

              <Button 
                variant="secondary" 
                size="lg" 
                className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-cyan-500 border-none"
                onClick={() => {
                  const el = document.getElementById('registration');
                  if (el) {
                    el.scrollIntoView();
                    window.dispatchEvent(new CustomEvent('select-event', { detail: '08' }));
                  }
                }}
              >
                Enter the Tournament
              </Button>
            </div>

            <div className="relative">
              {/* This would be an awesome 3D model or high-res image */}
              <div className="aspect-square bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-white/5 flex items-center justify-center p-12">
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                <Gamepad2 className="w-64 h-64 text-white/10 animate-pulse" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center">
                  <p className="text-[120px] font-display font-black text-white/5 select-none uppercase">GAMER</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
