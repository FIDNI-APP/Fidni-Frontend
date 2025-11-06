import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';

interface CompletionAnimationProps {
  show: boolean;
  type: 'success' | 'failure';
  onComplete?: () => void;
}

export const CompletionAnimation: React.FC<CompletionAnimationProps> = ({
  show,
  type,
  onComplete
}) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  const successColor = type === 'success';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
        {/* Background circle with expanding ring effect */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 20
          }}
          className="relative"
        >
          {/* Expanding ring pulse */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0.8 }}
            animate={{
              scale: [0.8, 1.8],
              opacity: [0.8, 0]
            }}
            transition={{
              duration: 0.6,
              ease: "easeOut"
            }}
            className={`absolute inset-0 rounded-full ${
              successColor ? 'bg-emerald-400' : 'bg-rose-400'
            }`}
            style={{ width: '80px', height: '80px', left: '-40px', top: '-40px' }}
          />

          {/* Main circle background */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{
              scale: 1,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
              mass: 0.8
            }}
            className={`w-20 h-20 rounded-full flex items-center justify-center ${
              successColor
                ? 'bg-gradient-to-br from-emerald-400 to-emerald-500'
                : 'bg-gradient-to-br from-rose-400 to-rose-500'
            } shadow-2xl relative`}
          >
            {/* Shine effect */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: [0, 0.6, 0], x: 40 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"
              style={{ width: '30%' }}
            />

            {/* Icon with pop animation */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{
                scale: 1,
                rotate: successColor ? [0, 10, 0] : [0, -15, 15, -10, 10, 0]
              }}
              transition={{
                scale: {
                  type: "spring",
                  stiffness: 600,
                  damping: 15,
                  delay: 0.1
                },
                rotate: {
                  duration: successColor ? 0.3 : 0.4,
                  delay: 0.15,
                  ease: "easeInOut"
                }
              }}
            >
              {successColor ? (
                <Check className="w-10 h-10 text-white" strokeWidth={4} />
              ) : (
                <X className="w-10 h-10 text-white" strokeWidth={4} />
              )}
            </motion.div>

            {/* Subtle particles */}
            {[...Array(6)].map((_, i) => {
              const angle = (i * 60) * Math.PI / 180;
              const distance = 45;
              return (
                <motion.div
                  key={i}
                  initial={{
                    scale: 0,
                    x: 0,
                    y: 0,
                    opacity: 0
                  }}
                  animate={{
                    scale: [0, 1, 0],
                    x: Math.cos(angle) * distance,
                    y: Math.sin(angle) * distance,
                    opacity: [0, 1, 0]
                  }}
                  transition={{
                    duration: 0.5,
                    delay: 0.15 + i * 0.02,
                    ease: "easeOut"
                  }}
                  className={`absolute w-2 h-2 rounded-full ${
                    successColor ? 'bg-emerald-300' : 'bg-rose-300'
                  }`}
                />
              );
            })}
          </motion.div>

          {/* Vibration effect - small additional circles */}
          {type === 'success' && (
            <>
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 0.6, 0],
                  x: [0, -30, -40],
                  y: [0, -10, -15]
                }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="absolute w-3 h-3 bg-emerald-400 rounded-full"
                style={{ top: '10px', left: '10px' }}
              />
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 0.6, 0],
                  x: [0, 30, 40],
                  y: [0, -10, -15]
                }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="absolute w-3 h-3 bg-emerald-400 rounded-full"
                style={{ top: '10px', right: '10px' }}
              />
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
