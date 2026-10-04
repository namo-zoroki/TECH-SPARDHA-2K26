import React from 'react';
import { motion } from 'motion/react';
import { TechEvent } from '@/src/data/events';
import { Button } from './ui/Button';
import { Users, User, ArrowRight } from 'lucide-react';

interface EventCardProps {
  event: TechEvent;
  onViewDetails: (event: TechEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onViewDetails }) => {
  return (
    <motion.div
      whileHover={{ y: -10 }}
      className="group relative bg-white/5 border border-white/10 overflow-hidden"
    >
      {/* Number index */}
      <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 transition-opacity">
        <span className="text-4xl font-display font-bold text-white/20">#{event.id}</span>
      </div>

      <div className="p-8 h-full flex flex-col">
        <div className="mb-4">
          <span className="text-[10px] uppercase tracking-[0.2em] text-cyan-500 font-mono mb-2 block">
            {event.category}
          </span>
          <h3 className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors uppercase tracking-tight">
            {event.name}
          </h3>
        </div>

        <div className="flex items-center gap-4 text-xs text-white/40 mb-6 font-mono">
          <div className="flex items-center gap-1.5">
            {event.format.includes('Team') ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
            {event.format}
          </div>
          {event.fee > 0 && <div className="text-cyan-500 font-bold">₹{event.fee}</div>}
        </div>

        <p className="text-white/60 text-sm line-clamp-2 mb-8 flex-grow">
          {event.description}
        </p>

        <div className="flex items-center gap-3 mt-auto">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onViewDetails(event)}
          >
            Details
          </Button>
          <Button 
            variant="neon" 
            size="sm" 
            className="w-12 p-0"
            onClick={() => {
              const el = document.getElementById('registration');
              if (el) {
                el.scrollIntoView();
                window.dispatchEvent(new CustomEvent('select-event', { detail: event.id }));
              }
            }}
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Decorative border animation */}
      <div className="absolute inset-0 border border-cyan-500 opacity-0 group-hover:opacity-40 transition-opacity pointer-events-none" />
    </motion.div>
  );
};
