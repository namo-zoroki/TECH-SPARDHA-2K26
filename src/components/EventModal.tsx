import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TechEvent } from '@/src/data/events';
import { X, CheckCircle2, Info, Gavel } from 'lucide-react';
import { Button } from './ui/Button';

interface EventModalProps {
  event: TechEvent | null;
  onClose: () => void;
}

const ZapIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 14.71 14.71 4H14l-6 10h6L8 20l6-10H8l6-10z"/></svg>
);

export const EventModal: React.FC<EventModalProps> = ({ event, onClose }) => {
  return (
    <AnimatePresence>
      {event && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-neutral-900 border border-white/10 overflow-y-auto overflow-x-hidden"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-neutral-900/80 backdrop-blur-md border-b border-white/10 p-6 md:p-8 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-[0.3em] text-cyan-500 font-mono mb-2 block">
                  {event.category}
                </span>
                <h2 className="text-3xl md:text-4xl font-bold uppercase">{event.name}</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors" aria-label="Close">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 md:p-10 space-y-12">
              {/* Quick Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Format', value: event.format },
                  { label: 'Team Size', value: event.teamSize || (event.format === 'Team' ? '2-4' : 'Solo') },
                  { label: 'Entry Fee', value: event.fee > 0 ? `₹${event.fee}` : 'FREE' },
                  { label: 'Event ID', value: `#${event.id}` },
                ].map((item) => (
                  <div key={item.label} className="bg-white/5 p-4 border border-white/5">
                    <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">{item.label}</p>
                    <p className="text-sm font-bold text-white">{item.value}</p>
                  </div>
                ))}

                {/* Event Lead: full-width row, shown only when the event has a lead */}
                {event.lead && (
                  <div className="col-span-2 md:col-span-4 bg-white/5 p-4 border border-white/5 border-l-2 border-l-cyan-500">
                    <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Event Lead</p>
                    <p className="text-sm font-bold text-white">{event.lead}</p>
                  </div>
                )}
              </div>

              {/* Content Sections */}
              <div className="grid md:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <section>
                    <div className="flex items-center gap-2 text-cyan-500 mb-4">
                      <Info className="w-5 h-5" />
                      <h4 className="text-sm font-bold uppercase tracking-widest text-white">Purpose</h4>
                    </div>
                    <p className="text-white/60 text-sm leading-relaxed">{event.purpose}</p>
                  </section>

                  <section>
                    <div className="flex items-center gap-2 text-cyan-500 mb-4">
                      <ZapIcon className="w-5 h-5" />
                      <h4 className="text-sm font-bold uppercase tracking-widest text-white">Procedure</h4>
                    </div>
                    <p className="text-white/60 text-sm leading-relaxed">{event.procedure}</p>
                  </section>
                </div>

                <div className="space-y-8">
                  <section>
                    <div className="flex items-center gap-2 text-cyan-500 mb-4">
                      <Gavel className="w-5 h-5" />
                      <h4 className="text-sm font-bold uppercase tracking-widest text-white">Rules</h4>
                    </div>
                    <ul className="space-y-3">
                      {event.rules.map((rule, i) => (
                        <li key={i} className="flex gap-3 text-sm text-white/60">
                          <span className="text-cyan-500 font-mono text-xs mt-1">{(i + 1).toString().padStart(2, '0')}</span>
                          {rule}
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section>
                    <div className="flex items-center gap-2 text-cyan-500 mb-4">
                      <CheckCircle2 className="w-5 h-5" />
                      <h4 className="text-sm font-bold uppercase tracking-widest text-white">Judging Criteria</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {event.judging.map((criteria, i) => (
                        <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 text-[10px] text-white/80 uppercase tracking-wider">
                          {criteria}
                        </span>
                      ))}
                    </div>
                  </section>
                </div>
              </div>

              {/* Footer Action */}
              <div className="pt-8 border-t border-white/10 flex flex-col items-center">
                <Button 
                  variant="secondary" 
                  size="lg" 
                  className="w-full md:w-auto min-w-[300px]"
                  onClick={() => {
                    onClose();
                    const el = document.getElementById('registration');
                    if (el) {
                      el.scrollIntoView();
                      window.dispatchEvent(new CustomEvent('select-event', { detail: event.id }));
                    }
                  }}
                >
                  Register for this Event
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};