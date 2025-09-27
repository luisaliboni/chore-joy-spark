import { useEffect, useState } from 'react';

interface PointCelebrationProps {
  points: number;
  show: boolean;
  onComplete: () => void;
}

export default function PointCelebration({ points, show, onComplete }: PointCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
      <div className="animate-bounce-in bg-gradient-primary text-white px-8 py-4 rounded-full shadow-lg text-xl font-bold">
        +{points} Point{points !== 1 ? 's' : ''}! 🎉
      </div>
      
      {/* Confetti effects */}
      <div className="absolute inset-0">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-point-earned"
            style={{
              left: `${45 + Math.random() * 10}%`,
              top: `${45 + Math.random() * 10}%`,
              animationDelay: `${Math.random() * 0.5}s`,
              fontSize: `${1 + Math.random() * 0.5}rem`,
            }}
          >
            {['⭐', '✨', '🎉', '🎊', '💫'][Math.floor(Math.random() * 5)]}
          </div>
        ))}
      </div>
    </div>
  );
}