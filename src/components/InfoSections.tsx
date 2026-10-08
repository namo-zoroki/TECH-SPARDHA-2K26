import React from 'react';
import { motion } from 'motion/react';
import { Clock, Mail, Users, GraduationCap, Instagram, Linkedin } from 'lucide-react';

export const Schedule: React.FC = () => {
  const scheduleData = [
    {
      date: '23 Oct',
      time: '10:00 AM – 11:00 AM',
      activity: 'Opening Ceremony',
      tag: 'Inauguration',
    },
    {
      date: '23 Oct',
      time: '11:00 AM – 2:00 PM',
      activity: 'Slot 1 Events',
      tag: 'Day 1',
    },
    {
      date: '23 Oct',
      time: '2:30 PM – 5:30 PM',
      activity: 'Slot 2 Events',
      tag: 'Day 1',
    },
    {
      date: '24 Oct',
      time: '10:30 AM – 1:30 PM',
      activity: 'Slot 3 Events',
      tag: 'Day 2',
    },
    {
      date: '23 & 24 Oct',
      time: 'Throughout Both Days',
      activity: 'Tech Snap',
      tag: 'Special Event',
    },
    {
      date: '24 Oct',
      time: '2:30 PM – 4:30 PM',
      activity: 'Result Checking, Prize Distribution & Closing Ceremony',
      tag: 'Grand Finale',
    },
  ];

  return (
    <section id="schedule" className="section-padding bg-neutral-950 relative overflow-hidden">
      <div className="container-width">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 uppercase">
            Time<span className="text-cyan-500">line</span>
          </h2>
          <div className="w-20 h-1 bg-cyan-500 mx-auto mb-8" />
          <p className="text-white/60 uppercase tracking-widest text-sm">
            Synchronize your clocks. The battle begins soon.
          </p>
        </div>

        {/* Schedule Display */}
        <div className="max-w-4xl mx-auto bg-black/60 border border-white/10 backdrop-blur-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] uppercase tracking-widest text-cyan-400 font-mono">
                  <th className="py-4 px-6 w-36">Date</th>
                  <th className="py-4 px-6 w-64">Time</th>
                  <th className="py-4 px-6">Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {scheduleData.map((item, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-cyan-500/[0.04] transition-colors group"
                  >
                    <td className="py-5 px-6 font-bold text-white whitespace-nowrap">
                      <span className="inline-block px-3 py-1 bg-white/5 border border-white/10 text-cyan-400 text-xs font-mono font-bold tracking-wider">
                        {item.date}
                      </span>
                    </td>
                    <td className="py-5 px-6 text-white/80 font-mono text-xs flex-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-cyan-500/70 shrink-0" />
                        <span>{item.time}</span>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-white font-medium group-hover:text-cyan-300 transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <span>{item.activity}</span>
                        <span className="text-[10px] uppercase font-mono tracking-wider text-white/30 px-2 py-0.5 border border-white/5 bg-white/[0.02]">
                          {item.tag}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="sm:hidden divide-y divide-white/10">
            {scheduleData.map((item, idx) => (
              <div key={idx} className="p-5 space-y-2 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono font-bold">
                    {item.date}
                  </span>
                  <span className="text-[10px] uppercase font-mono text-white/40 tracking-wider">
                    {item.tag}
                  </span>
                </div>
                <h4 className="text-base font-bold text-white pt-1">{item.activity}</h4>
                <div className="flex items-center gap-2 text-xs font-mono text-white/60">
                  <Clock className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                  <span>{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export const Rules: React.FC = () => {
  const commonRules = [
    "Only registered participants/teams may compete.",
    "Team size and eligibility must be verified before the event.",
    "Participants must report at least 30 mins before the announced time.",
    "Discipline must be maintained at all times within the campus.",
    "Follow all instructions from coordinators, volunteers, and judges.",
    "Disputes must be raised through the designated event coordinator.",
    "Participants must follow venue safety and security instructions.",
    "Event-specific tie-break mechanisms will be communicated by judges."
  ];

  const registrationRules = [
    {
      title: "One event per slot",
      text: "Events are grouped into Slot 1, Slot 2, Slot 3 and TechSnap. You can register for only one event in each slot, so no two of your events ever clash."
    },
    {
      title: "Four events at most",
      text: "That makes four registrations per student: one in each of Slot 1, Slot 2, Slot 3 and TechSnap. The limit applies to every team member, not only the captain."
    },
    {
      title: "Slot 3 runs together",
      text: "All four Slot 3 events (Cyber Hunt, Tech Wars, CEO Quest and Tech Treasure Hunt) run at the same time, so you can join only one of them."
    },
    {
      title: "1st year students choose ASH",
      text: "First-year students must select ASH as their branch. ASH is only for 1st year. MBA and MCA students select MBA or MCA instead, and can be 1st or 2nd year."
    },
    {
      title: "College ID cards are checked at entry",
      text: "Every participant must carry their college ID card. Your details are matched against your registration at the venue, so enter your College ID exactly as printed on the card."
    }
  ];

  return (
    <section id="rules" className="section-padding bg-black">
      <div className="container-width">
        <div className="grid lg:grid-cols-2 gap-16">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-8 uppercase">General <span className="text-cyan-500">Rules</span></h2>
            <div className="space-y-4">
              {commonRules.map((rule, i) => (
                <div key={i} className="flex gap-4 p-4 bg-white/5 border border-white/5">
                  <span className="text-cyan-500 font-mono font-bold">{(i + 1).toString().padStart(2, '0')}</span>
                  <p className="text-sm text-white/70">{rule}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            <div>
              <h3 className="text-2xl md:text-3xl font-bold uppercase mb-6">Registration <span className="text-cyan-500">Rules</span></h3>
              <div className="space-y-4">
                {registrationRules.map((rule) => (
                  <div key={rule.title} className="p-4 bg-white/5 border border-white/5 border-l-2 border-l-cyan-500">
                    <p className="text-sm font-bold mb-1">{rule.title}</p>
                    <p className="text-sm text-white/60 leading-relaxed">{rule.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-cyan-500/10 border border-cyan-500/20 p-8">
              <h3 className="text-xl font-bold uppercase mb-6 flex items-center gap-3">
                <Trophy className="text-cyan-500" /> Judging & Fair Play
              </h3>
              <p className="text-sm text-white/60 leading-relaxed italic">
                TechSpardha 2K26 maintains a zero-tolerance policy for plagiarism, hacking (outside specific events), and unsportsmanlike behavior. Judges' decisions are final and binding for all competitions.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 border border-white/10 bg-white/5">
                <p className="text-2xl font-bold text-white mb-1">Verify</p>
                <p className="text-xs text-white/40 uppercase tracking-widest">ID Required</p>
              </div>
              <div className="p-6 border border-white/10 bg-white/5">
                <p className="text-2xl font-bold text-white mb-1">Report</p>
                <p className="text-xs text-white/40 uppercase tracking-widest">On Time</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export const Contact: React.FC = () => {
  return (
    <section id="contact" className="section-padding bg-neutral-950 relative overflow-hidden">
      <div className="container-width max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold mb-4 uppercase">
            Get In <span className="text-cyan-500">Touch</span>
          </h2>
          <div className="w-20 h-1 bg-cyan-500 mx-auto mb-6" />
          <p className="text-white/60 uppercase tracking-widest text-sm max-w-md mx-auto">
            Have questions or need assistance? Reach out to our organizing team.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Faculty Coordinators */}
          <div className="bg-white/5 border border-white/10 p-8 flex flex-col justify-between hover:border-cyan-500/40 transition-all duration-300">
            <div>
              <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-6">
                <GraduationCap className="w-6 h-6" />
              </div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-4 font-semibold">
                Faculty Coordinators
              </p>
              <div className="space-y-2">
                <p className="text-lg font-bold text-white tracking-wide">Monika Nagar</p>
                <p className="text-lg font-bold text-white tracking-wide">Bhanu Verma</p>
              </div>
            </div>
            <div className="pt-6 mt-6 border-t border-white/5">
              <span className="text-[10px] uppercase tracking-widest text-cyan-400/80 font-mono">
                Faculty In-Charge
              </span>
            </div>
          </div>

          {/* Society Presidents */}
          <div className="bg-white/5 border border-white/10 p-8 flex flex-col justify-between hover:border-cyan-500/40 transition-all duration-300">
            <div>
              <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-6">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-4 font-semibold">
                Society Presidents
              </p>
              <div className="space-y-2">
                <p className="text-lg font-bold text-white tracking-wide">Akshay Srivastava</p>
                <p className="text-lg font-bold text-white tracking-wide">Shlok Sharma</p>
              </div>
            </div>
            <div className="pt-6 mt-6 border-t border-white/5">
              <span className="text-[10px] uppercase tracking-widest text-cyan-400/80 font-mono">
                Student Leadership
              </span>
            </div>
          </div>

          {/* Email Us */}
          <a
            href="mailto:genesis_ts@imsec.ac.in"
            className="bg-white/5 border border-white/10 p-8 flex flex-col justify-between hover:border-cyan-500 hover:bg-cyan-950/20 transition-all duration-300 group"
          >
            <div>
              <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-6 group-hover:bg-cyan-500 group-hover:text-black transition-colors">
                <Mail className="w-6 h-6" />
              </div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-4 font-semibold">
                Email Us
              </p>
              <p className="text-base sm:text-lg font-bold text-white group-hover:text-cyan-400 transition-colors break-all">
                genesis_ts@imsec.ac.in
              </p>
            </div>
            <div className="pt-6 mt-6 border-t border-white/5 flex items-center justify-between">
              <span className="text-xs text-cyan-400 font-mono flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Send an email &rarr;
              </span>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
};

export const Footer: React.FC = () => {
  return (
    <footer className="py-12 border-t border-white/10 bg-black">
      <div className="container-width px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-2">
            <h3 className="text-2xl font-bold mb-4">
              TECH<span className="text-cyan-500">स्पर्धा</span> 2K26
            </h3>
            <p className="text-white/40 text-sm max-w-sm mb-6">
              Organized by GENESIS Technical Team. Elevating the technical spirit at IMS Engineering College.
            </p>
            <div className="flex gap-4">
              <a href="https://www.instagram.com/genesis.imsec/" target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 border border-white/10 hover:bg-cyan-500 transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://www.linkedin.com/company/genesis-technical-society/home/" target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 border border-white/10 hover:bg-cyan-500 transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-6 font-bold">Quick Links</h4>
            <div className="flex flex-col gap-4 text-sm text-white/60">
              <a href="#home" className="hover:text-cyan-400 transition-colors">Home</a>
              <a href="#events" className="hover:text-cyan-400 transition-colors">Events</a>
              <a href="#registration" className="hover:text-cyan-400 transition-colors">Registration</a>
              <a href="#rules" className="hover:text-cyan-400 transition-colors">Rules</a>
            </div>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-6 font-bold">Resources</h4>
            <div className="flex flex-col gap-4 text-sm text-white/60">
              {/* Event Brochure and Rulebook PDF links are hidden until the files exist. */}
              <a href="#contact" className="hover:text-cyan-400 transition-colors">Support</a>
            </div>
          </div>
        </div>
        
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-white/20 uppercase tracking-widest text-center md:text-left">
            © 2026 IMS Engineering College. Designed by Genesis Technical Team.
          </p>
          <div className="flex items-center gap-6 md:gap-10">
            <div className="h-10 w-10 md:h-14 md:w-14 flex items-center justify-center">
              <img 
                src="/assets/ims.webp" 
                alt="IMS" 
                className="w-full h-full object-contain" 
              />
            </div>
            <div className="h-10 w-10 md:h-14 md:w-14 flex items-center justify-center">
              <img 
                src="/assets/genesis.webp" 
                alt="GENESIS" 
                className="w-full h-full object-contain" 
              />
            </div>
            <div className="h-10 w-10 md:h-14 md:w-14 flex items-center justify-center">
              <img 
                src="/assets/techspardha.webp" 
                alt="TECHSPARDHA" 
                className="w-full h-full object-contain" 
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

const Trophy = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 22V14"/><path d="M14 22V14"/><path d="M18 4H6v7a6 6 0 0 0 12 0V4Z"/></svg>
);