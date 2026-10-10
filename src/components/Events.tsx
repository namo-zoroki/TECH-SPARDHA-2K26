import React, { useState } from 'react';
import { motion } from 'motion/react';
import { events, TechEvent } from '@/src/data/events';
import { EventCard } from './EventCard';
import { EventModal } from './EventModal';
import { Camera, Crown, Gamepad2, Puzzle, Gift, Clock, Users, Trophy } from 'lucide-react';

export const Events: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<TechEvent | null>(null);

  return (
    <section id="events" className="section-padding bg-neutral-950">
      <div className="container-width">
        <div className="mb-16">
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
        </div>

        <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} onViewDetails={(e) => setSelectedEvent(e)} />
          ))}
        </motion.div>
      </div>

      <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Spotlight section: TechSnap + CEO Quest + Gamer Fiesta + Treasure Hunt */
/* ------------------------------------------------------------------ */

// Accent colours (applied with inline styles so they always render)
const YELLOW = '#facc15'; // TechSnap
const GREEN = '#34d399'; // CEO Quest
const PURPLE = '#a78bfa'; // Gamer Fiesta
const BROWN = '#c08a52'; // Tech Treasure Hunt

const goToRegistration = (eventId: string) => {
  const el = document.getElementById('registration');
  if (el) {
    el.scrollIntoView();
    window.dispatchEvent(new CustomEvent('select-event', { detail: eventId }));
  }
};

const feeLabel = (e?: TechEvent) => (!e ? '' : e.fee > 0 ? `₹${e.fee} / team` : 'Free entry');

const rewards = [
  { icon: Trophy, trigger: 'Top 10 video winners', reward: '10 neckbands' },
  { icon: Gift, trigger: 'Live tech quiz', reward: 'Tempered glass & discount cards' },
  { icon: Users, trigger: 'Bring 5 friends', reward: 'Tempered glass + discount card' },
  { icon: Clock, trigger: 'Special hour (Day 1, 2–3 PM)', reward: 'Freebies on the spot', wide: true },
];

const ceoPoints = [
  { title: 'Engineers vs. MBA minds', body: 'Technical thinking against business strategy. Who makes the better decision-maker?' },
  { title: 'Real business, real pressure', body: 'Handle market shocks, manage resources and defend your strategy.' },
  { title: 'The boardroom is calling', body: 'Bring your strategy, trust your instincts and make every decision count.' },
];

const huntPoints = [
  { title: 'Crack the code', body: 'Solve technical puzzles and unlock hidden clues.' },
  { title: 'Beat the clock', body: 'Every second counts. Every decision matters.' },
  { title: 'Build your dream team', body: '3–5 members. One mission. One winner.' },
];

const MetaRow: React.FC<{ event?: TechEvent; color: string; showTeam?: boolean }> = ({
  event,
  color,
  showTeam = true,
}) => {
  if (!event) return null;
  return (
    <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-sm">
      {showTeam && (
        <span className="text-white/60">
          Team: <span className="font-semibold text-white">{event.teamSize}</span>
        </span>
      )}
      <span className="font-semibold" style={{ color }}>
        {feeLabel(event)}
      </span>
    </div>
  );
};

const RegisterButton: React.FC<{ eventId: string; color: string; label: string }> = ({ eventId, color, label }) => (
  <button
    type="button"
    onClick={() => goToRegistration(eventId)}
    className="mt-5 w-full px-4 py-3.5 text-sm font-bold uppercase tracking-wide sm:px-6 sm:tracking-wider text-black transition hover:brightness-110"
    style={{ backgroundColor: color }}
  >
    {label}
  </button>
);

const Card: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <article
    className="relative flex min-w-0 flex-col border border-white/10 bg-white/5 p-5 sm:p-8"
    style={{ borderTop: `3px solid ${color}` }}
  >
    {children}
  </article>
);

export const EventSpotlights: React.FC = () => {
  const techSnap = events.find((e) => e.id === '11');
  const ceoQuest = events.find((e) => e.id === '09');
  const gamerFiesta = events.find((e) => e.id === '08');
  const treasureHunt = events.find((e) => e.id === '10');

  return (
    <section className="section-padding relative overflow-hidden bg-[#0a001a]">
      <div className="pointer-events-none absolute top-0 right-0 h-[500px] w-[500px] -translate-y-1/2 translate-x-1/2 rounded-full bg-purple-600/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[500px] w-[500px] -translate-x-1/2 translate-y-1/2 rounded-full bg-cyan-600/20 blur-[120px]" />

      <div className="container-width relative z-10 space-y-4 sm:space-y-6">
        {/* TECHSNAP: featured, full width */}
        <article
          className="border bg-white/5 p-5 sm:p-8 md:p-12"
          style={{ borderColor: `${YELLOW}55`, backgroundImage: `linear-gradient(135deg, ${YELLOW}14, transparent 55%)` }}
        >
          <div className="grid gap-8 sm:gap-10 lg:grid-cols-5 lg:gap-14">
            <div className="lg:col-span-2">
              <div
                className="mb-6 inline-flex border p-3"
                style={{ color: YELLOW, borderColor: `${YELLOW}66`, backgroundColor: `${YELLOW}1a` }}
              >
                <Camera className="h-7 w-7" />
              </div>
              <h2 className="font-display text-4xl font-bold leading-none sm:text-5xl md:text-6xl" style={{ color: YELLOW }}>
                TECHSNAP
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-white/60">
                Capture the fest, create engaging content, and unlock exclusive sponsor rewards.
              </p>
              <p className="mt-6 text-sm text-white/40">
                Sponsored by <span className="font-semibold text-white">Control Z</span>
              </p>
              <MetaRow event={techSnap} color={YELLOW} />
              <RegisterButton eventId="11" color={YELLOW} label="Register for TechSnap" />
            </div>

            <ul className="grid gap-3 sm:grid-cols-2 lg:col-span-3">
              {rewards.map(({ icon: Icon, trigger, reward, wide }) => (
                <li
                  key={trigger}
                  className={`flex flex-col justify-between gap-6 border p-5 ${wide ? 'sm:col-span-2' : ''}`}
                  style={{
                    borderColor: wide ? `${YELLOW}88` : 'rgba(255,255,255,0.1)',
                    backgroundColor: wide ? `${YELLOW}14` : 'rgba(255,255,255,0.03)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 shrink-0" style={{ color: YELLOW }} />
                    <p className="text-sm text-white/60">{trigger}</p>
                  </div>
                  <p className="text-lg font-bold leading-snug sm:text-xl">{reward}</p>
                </li>
              ))}
            </ul>
          </div>
        </article>

        {/* Three equal cards */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          {/* CEO QUEST */}
          <Card color={GREEN}>
            <Crown className="mb-6 h-8 w-8" style={{ color: GREEN }} />
            <h3 className="font-display text-2xl font-bold sm:text-3xl">CEO Quest</h3>
            <p className="mt-1 text-white/50">Think. Decide. Lead.</p>
            <p className="mt-5 text-white/70">
              Think you can run a company? Step into the CEO's shoes and prove your business instincts.
            </p>
            <ul className="mt-6 space-y-4">
              {ceoPoints.map((p) => (
                <li key={p.title}>
                  <p className="font-semibold">{p.title}</p>
                  <p className="text-sm text-white/55">{p.body}</p>
                </li>
              ))}
            </ul>
            <p className="mt-auto pt-8 text-sm italic" style={{ color: GREEN }}>
              Code can build the product. Strategy can build the empire. Which side are you on?
            </p>
            <MetaRow event={ceoQuest} color={GREEN} />
            <RegisterButton eventId="09" color={GREEN} label="Take the CEO seat" />
          </Card>

          {/* GAMER FIESTA */}
          <Card color={PURPLE}>
            <Gamepad2 className="mb-6 h-8 w-8" style={{ color: PURPLE }} />
            <h3 className="font-display text-2xl font-bold sm:text-3xl">Gamer Fiesta</h3>
            <p className="mt-1 text-white/50">Unleash the rivalry</p>
            <p className="mt-5 text-white/70">
              Think you're the best gamer on campus? Build your squad, take on your college's hidden gaming
              legends and fight for bragging rights. Your next rival might be in the classroom next door.
            </p>
            <p className="mt-6 text-sm font-semibold text-white">Choose your battleground</p>
            <ul className="mt-3 space-y-2">
              {[
                { game: 'BGMI', squad: '4 players' },
                { game: 'Free Fire', squad: '4 players' },
                { game: 'Valorant', squad: '5 players' },
              ].map(({ game, squad }) => (
                <li
                  key={game}
                  className="flex items-center justify-between border px-4 py-3"
                  style={{ borderColor: `${PURPLE}44`, backgroundColor: `${PURPLE}12` }}
                >
                  <span className="font-semibold">{game}</span>
                  <span className="text-sm text-white/55">{squad}</span>
                </li>
              ))}
            </ul>
            <p className="mt-auto pt-8 text-sm italic" style={{ color: PURPLE }}>
              Play hard. Rise higher. Own the arena.
            </p>
            <MetaRow event={gamerFiesta} color={PURPLE} showTeam={false} />
            <p className="mt-4 border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold leading-relaxed text-red-400">
              Registration is confirmed only after your payment is verified.
            </p>
            <RegisterButton eventId="08" color={PURPLE} label="Enter the tournament" />
          </Card>

          {/* TECH TREASURE HUNT */}
          <Card color={BROWN}>
            <Puzzle className="mb-6 h-8 w-8" style={{ color: BROWN }} />
            <h3 className="font-display text-2xl font-bold sm:text-3xl">Tech Treasure Hunt</h3>
            <p className="mt-1 text-white/50">Not your usual treasure hunt</p>
            <p className="mt-5 text-white/70">
              The clues are digital, the puzzles are technical, and your next breakthrough could be hidden
              behind a QR code. Bring your smartest teammates and see how far your brains can take you.
            </p>
            <ul className="mt-6 space-y-4">
              {huntPoints.map((p) => (
                <li key={p.title}>
                  <p className="font-semibold">{p.title}</p>
                  <p className="text-sm text-white/55">{p.body}</p>
                </li>
              ))}
            </ul>
            <p className="mt-auto pt-8 text-sm italic" style={{ color: BROWN }}>
              Scan the unknown. Outsmart the competition. Claim the victory.
            </p>
            <MetaRow event={treasureHunt} color={BROWN} />
            <RegisterButton eventId="10" color={BROWN} label="Join the hunt" />
          </Card>
        </div>
      </div>
    </section>
  );
};

// Same export name as before, so any file that already imports
// GamerFiestaSpecial from './Events' now renders the new section with no other change.
export const GamerFiestaSpecial = EventSpotlights;