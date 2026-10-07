import React from 'react';
import { motion } from 'motion/react';
import { Clock, MapPin, Mail, Phone, MessageSquare, Instagram, Linkedin } from 'lucide-react';

export const Schedule: React.FC = () => {
  return (
    <section id="schedule" className="section-padding bg-neutral-950">
      <div className="container-width">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 uppercase">Timeline</h2>
          <div className="w-20 h-1 bg-cyan-500 mx-auto mb-8" />
          <p className="text-white/60 uppercase tracking-widest text-sm">Synchronize your clocks. The battle begins soon.</p>
        </div>

        <div className="bg-white/5 border border-white/10 p-12 text-center">
          <Clock className="w-12 h-12 text-cyan-500 mx-auto mb-6 opacity-40" />
          <h3 className="text-2xl font-bold mb-4">Detailed Schedule Coming Soon</h3>
          <p className="text-white/40 max-w-lg mx-auto">
            The complete breakdown of event timings, venues, and reporting slots will be announced here and on our official channels shortly.
          </p>
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
    <section id="contact" className="section-padding bg-neutral-950">
      <div className="container-width">
        <div className="grid lg:grid-cols-2 gap-16">
          <div>
            <h2 className="text-4xl md:text-6xl font-bold mb-8 uppercase">Get In <span className="text-cyan-500">Touch</span></h2>
            <div className="space-y-12">
              <div className="grid sm:grid-cols-2 gap-8">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4">Faculty Coordinators</p>
                  <p className="text-lg font-bold">Monika Nagar</p>
                  <p className="text-lg font-bold">Bhanu Verma</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4">Society Presidents</p>
                  <p className="text-lg font-bold">Akshay Srivastava</p>
                  <p className="text-lg font-bold">Shlok Sharma</p>
                </div>
              </div>

              <div className="space-y-6">
                <a href="mailto:genesis_ts@imsec.ac.in" className="flex items-center gap-4 group">
                  <div className="w-12 h-12 bg-white/5 flex items-center justify-center group-hover:bg-cyan-500 transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-white/40 mb-1">Email Us</p>
                    <p className="text-sm font-bold">genesis_ts@imsec.ac.in</p>
                  </div>
                </a>
                <a href="tel:7880435856" className="flex items-center gap-4 group">
                  <div className="w-12 h-12 bg-white/5 flex items-center justify-center group-hover:bg-cyan-500 transition-colors">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-white/40 mb-1">Call Us</p>
                    <p className="text-sm font-bold">+91 7880435856</p>
                  </div>
                </a>
                <a href="https://wa.me/917880435856" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group">
                  <div className="w-12 h-12 bg-white/5 flex items-center justify-center group-hover:bg-cyan-500 transition-colors">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-white/40 mb-1">WhatsApp</p>
                    <p className="text-sm font-bold">Connect on WhatsApp</p>
                  </div>
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-12">
            <MapPin className="w-12 h-12 text-cyan-500 mb-8" />
            <h3 className="text-3xl font-bold mb-4 uppercase">Venue</h3>
            <p className="text-lg text-white/60 leading-relaxed mb-8">
              IMS Engineering College,<br />
              NH-24, Adhyatmik Nagar,<br />
              Ghaziabad, Uttar Pradesh 201015
            </p>
            <div className="aspect-video w-full grayscale contrast-125 opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-700">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3502.5644781428237!2d77.50290527550005!3d28.61284757567543!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390cee0d51000001%3A0x7d2f9b889508b5e5!2sIMS%20Engineering%20College!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen={true} 
                loading="lazy"
              />
            </div>
          </div>
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
                src="/assets/ims.png" 
                alt="IMS" 
                className="w-full h-full object-contain" 
              />
            </div>
            <div className="h-10 w-10 md:h-14 md:w-14 flex items-center justify-center">
              <img 
                src="/assets/genesis.png" 
                alt="GENESIS" 
                className="w-full h-full object-contain" 
              />
            </div>
            <div className="h-10 w-10 md:h-14 md:w-14 flex items-center justify-center">
              <img 
                src="/assets/techspardha.png" 
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