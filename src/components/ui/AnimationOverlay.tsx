import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, TrendingUp } from 'lucide-react';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
  shape: 'circle' | 'square' | 'star';
}

interface AnimationOverlayProps {
  show: boolean;
  type: 'success' | 'fail';
  onComplete?: () => void;
}

export const AnimationOverlay: React.FC<AnimationOverlayProps> = ({ show, type, onComplete }) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [messageVisible, setMessageVisible] = useState(false);

  useEffect(() => {
    if (show) {
      if (type === 'success') {
        // Success: Vibrant confetti celebration
        const colors = ['#10b981', '#34d399', '#fbbf24', '#f59e0b', '#ec4899', '#a855f7', '#3b82f6'];
        const shapes: Array<'circle' | 'square' | 'star'> = ['circle', 'square', 'star'];

        const newParticles: Particle[] = Array.from({ length: 50 }, (_, i) => {
          const angle = (Math.PI * 2 * i) / 50 + (Math.random() - 0.5) * 0.5;
          const velocity = 3 + Math.random() * 4;

          return {
            id: i,
            x: 50,
            y: 40,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: 6 + Math.random() * 8,
            velocityX: Math.cos(angle) * velocity,
            velocityY: Math.sin(angle) * velocity - 2,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 20,
            life: 100,
            shape: shapes[Math.floor(Math.random() * shapes.length)],
          };
        });

        setParticles(newParticles);
        setMessageVisible(true);
      } else {
        // Fail: Gentle upward floaters + motivational
        const colors = ['#fca5a5', '#fecaca', '#fef3c7', '#fed7aa'];

        const newParticles: Particle[] = Array.from({ length: 20 }, (_, i) => {
          const spread = 40;
          const xPos = 50 + (Math.random() - 0.5) * spread;

          return {
            id: i,
            x: xPos,
            y: 60,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: 5 + Math.random() * 6,
            velocityX: (Math.random() - 0.5) * 1.5,
            velocityY: -1.5 - Math.random() * 2,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10,
            life: 100,
            shape: 'circle',
          };
        });

        setParticles(newParticles);
        setMessageVisible(true);
      }

      // Animate particles
      const interval = setInterval(() => {
        setParticles(prev => {
          const updated = prev.map(p => ({
            ...p,
            x: p.x + p.velocityX,
            y: p.y + p.velocityY,
            velocityY: type === 'success' ? p.velocityY + 0.2 : p.velocityY - 0.05,
            rotation: p.rotation + p.rotationSpeed,
            life: p.life - 2.5,
          })).filter(p => p.life > 0);

          if (updated.length === 0) {
            clearInterval(interval);
          }

          return updated;
        });
      }, 16);

      const messageTimer = setTimeout(() => {
        setMessageVisible(false);
        if (onComplete) onComplete();
      }, type === 'success' ? 800 : 1000);

      return () => {
        clearInterval(interval);
        clearTimeout(messageTimer);
      };
    } else {
      setParticles([]);
      setMessageVisible(false);
    }
  }, [show, type, onComplete]);

  if (!show && particles.length === 0 && !messageVisible) return null;

  const renderShape = (particle: Particle) => {
    const opacity = particle.life / 100;
    const transform = `rotate(${particle.rotation}deg)`;

    switch (particle.shape) {
      case 'square':
        return (
          <rect
            key={particle.id}
            x={`${particle.x}%`}
            y={`${particle.y}%`}
            width={particle.size}
            height={particle.size}
            fill={particle.color}
            opacity={opacity}
            style={{ transform, transformOrigin: 'center' }}
          />
        );
      case 'star':
        return (
          <polygon
            key={particle.id}
            points="0,-10 2.5,-2.5 10,0 2.5,2.5 0,10 -2.5,2.5 -10,0 -2.5,-2.5"
            fill={particle.color}
            opacity={opacity}
            style={{
              transform: `translate(${particle.x}%, ${particle.y}%) rotate(${particle.rotation}deg) scale(${particle.size / 10})`,
              transformOrigin: 'center',
            }}
          />
        );
      default:
        return (
          <circle
            key={particle.id}
            cx={`${particle.x}%`}
            cy={`${particle.y}%`}
            r={particle.size}
            fill={particle.color}
            opacity={opacity}
          />
        );
    }
  };

  const content = (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        pointerEvents: 'none',
        zIndex: 9999,
        isolation: 'isolate'
      }}
    >
      {/* Particles */}
      <svg className="w-full h-full absolute inset-0" style={{ pointerEvents: 'none' }}>
        {particles.map(particle => renderShape(particle))}
      </svg>

      {/* Message overlay */}
      {messageVisible && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: 'none' }}>
          {type === 'success' ? (
            <div className="success-message-animate flex items-center gap-2 bg-gradient-to-br from-emerald-500 to-green-600 text-white px-5 py-3 rounded-xl shadow-2xl" style={{ pointerEvents: 'none' }}>
              <CheckCircle className="w-8 h-8 animate-success-icon" />
              <p className="text-xl font-bold">Excellent!</p>
            </div>
          ) : (
            <div className="fail-message-animate flex items-center gap-2 bg-gradient-to-br from-orange-400 to-amber-500 text-white px-5 py-3 rounded-xl shadow-2xl" style={{ pointerEvents: 'none' }}>
              <TrendingUp className="w-8 h-8 animate-motivate-icon" />
              <p className="text-xl font-bold">Keep Going!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
};
