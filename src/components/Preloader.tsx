import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export const Preloader: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black"
        >
          {/* Circuit background effect */}
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
          
          <div className="relative flex flex-col items-center gap-12">
            <div className="flex gap-6 md:gap-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="w-16 h-16 md:w-24 md:h-24 flex items-center justify-center"
              >
                <img src="/assets/ims.png" alt="IMS" className="w-full h-full object-contain" />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="w-16 h-16 md:w-24 md:h-24 flex items-center justify-center"
              >
                <img src="/assets/genesis.png" alt="GENESIS" className="w-full h-full object-contain" />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="w-16 h-16 md:w-24 md:h-24 flex items-center justify-center"
              >
                <img src="/assets/techspardha.png" alt="TECHSPARDHA" className="w-full h-full object-contain" />
              </motion.div>
            </div>

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="text-center"
            >
              <h1 className="text-4xl md:text-7xl font-display font-bold tracking-tighter text-white">
                TECH<span className="text-cyan-500">स्पर्धा</span>
              </h1>
              <p className="text-cyan-500/60 font-mono text-sm tracking-[0.3em] mt-2">2K26</p>
            </motion.div>

            <div className="w-48 h-[2px] bg-white/10 relative overflow-hidden">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-cyan-500 shadow-[0_0_10px_#06b6d4]"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
