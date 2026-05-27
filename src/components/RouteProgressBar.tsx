'use client';

import { useTransition } from 'react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export function RouteProgressBar() {
  const [isTransitioning] = useTransition();
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    setProgress(10);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 90) {
          return prev + Math.random() * 30;
        }
        return prev;
      });
    }, 200);

    return () => {
      clearInterval(interval);
    };
  }, [pathname]);

  useEffect(() => {
    if (!isTransitioning && isVisible && progress > 0) {
      setProgress(100);
      const timeout = setTimeout(() => {
        setIsVisible(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [isTransitioning, isVisible, progress]);

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999]">
      <div
        className="h-1 bg-gradient-to-r from-ronda-gold to-ronda-gold/60 transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: isVisible ? 1 : 0,
        }}
      />
    </div>
  );
}
