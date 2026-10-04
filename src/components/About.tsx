import React from 'react';
import { motion } from 'motion/react';
import { Target, Zap, Users, Lightbulb } from 'lucide-react';

export const About: React.FC = () => {
  const stats = [
    { label: 'Events', value: '10+' },
    { label: 'Days', value: '2' },
    { label: 'Categories', value: 'Multiple' },
    { label: 'Location', value: 'IMSEC' },
  ];

  const highlights = [
    { icon: Zap, text: 'Innovation' },
    { icon: Target, text: 'Problem Solving' },
    { icon: Users, text: 'Teamwork' },
    { icon: Lightbulb, text: 'Creativity' },
  ];

  return (
    <section id="about" className="section-padding bg-black relative">
      <div className="container-width">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div>
              <h2 className="text-4xl md:text-6xl font-bold mb-6">
                About <span className="text-cyan-500">TechSpardha</span>
              </h2>
              <div className="w-20 h-1 bg-cyan-500 mb-8" />
              <p className="text-white/60 text-lg leading-relaxed mb-6">
                TECHSPARDHA 2K26 is a technical, innovation, management, gaming and media-focused fest designed to bring students together through competitive and creative challenges.
              </p>
              <p className="text-white/60 text-lg leading-relaxed">
                Organized by the GENESIS Technical Team, this flagship event encourages students to push their boundaries, collaborate on groundbreaking ideas, and compete at a national level.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {highlights.map((item) => (
                <div key={item.text} className="flex items-center gap-3 text-white/80">
                  <item.icon className="w-5 h-5 text-cyan-500" />
                  <span className="text-sm font-medium uppercase tracking-wider">{item.text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-4"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="bg-white/5 border border-white/10 p-10 flex flex-col items-center justify-center text-center">
                <span className="text-4xl md:text-6xl font-display font-bold text-white mb-2">{stat.value}</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-cyan-500/60 font-mono">{stat.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};
