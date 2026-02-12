import React, { useEffect, useRef } from 'react';

interface TeleprompterProps {
  text: string;
  isPlaying: boolean;
  speed: number; 
  fontSize?: 'md' | 'lg' | 'xl';
  inputVolume?: number;
}

export const Teleprompter: React.FC<TeleprompterProps> = ({ 
  text, 
  isPlaying, 
  speed,
  fontSize = 'xl',
  inputVolume = 0
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const offsetRef = useRef<number>(0);

  const paragraphs = text.split('\n\n');

  useEffect(() => {
    // New script = reset translate offset.
    offsetRef.current = 0;
    if (contentRef.current) {
      contentRef.current.style.transform = 'translate3d(0, 0, 0)';
    }
    lastTimeRef.current = 0;
  }, [text]);

  useEffect(() => {
    const animate = (time: number) => {
      // Initialize start time
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = time;
      }

      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;

      if (viewportRef.current && contentRef.current && isPlaying) {
        const maxOffset = Math.max(contentRef.current.scrollHeight - viewportRef.current.clientHeight, 0);
        if (maxOffset <= 0) {
          animationRef.current = requestAnimationFrame(animate);
          return;
        }

        // Base speed factor: 1.0 speed = 60 px/sec.
        const pixelsPerSecond = speed * 60;
        const deltaOffset = (pixelsPerSecond * deltaTime) / 1000;
        offsetRef.current = Math.min(offsetRef.current + deltaOffset, maxOffset);
        contentRef.current.style.transform = `translate3d(0, -${offsetRef.current}px, 0)`;
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };

    if (isPlaying) {
      // Reset timing on start/resume
      lastTimeRef.current = 0; 
      animationRef.current = requestAnimationFrame(animate);
    } else {
      lastTimeRef.current = 0;
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, speed]);

  // Responsive font sizes
  const fontSizes = {
    md: "text-lg md:text-2xl",
    lg: "text-xl md:text-4xl",
    xl: "text-2xl md:text-5xl lg:text-6xl"
  };

  const accentColor = "#00ffa3";

  return (
    <div className="relative w-full h-full bg-black border-y border-[#333]">
      {/* Markers */}
      <div className={`absolute top-0 left-0 p-2 z-20 text-[${accentColor}] font-mono text-[10px] md:text-xs border-r border-b border-[${accentColor}] bg-black`}>
        LIVE_FEED_01
      </div>

      <div 
        ref={viewportRef}
        className="h-full overflow-hidden no-scrollbar"
      >
        <div
          ref={contentRef}
          className="px-4 md:px-24 pt-[20vh] pb-[20vh] will-change-transform"
          style={{ transform: 'translate3d(0, 0, 0)' }}
        >
          <div className={`max-w-5xl mx-auto font-bold leading-tight text-center transition-all duration-300 ${fontSizes[fontSize]}`} style={{ textShadow: inputVolume > 0.1 ? `0 0 ${inputVolume * 10}px ${accentColor}` : 'none' }}>
          {paragraphs.map((para, i) => (
            <p key={i} className="mb-16 md:mb-24 text-white uppercase tracking-tight break-words">
              {para}
            </p>
          ))}
          <div className="h-[20vh]" />
          </div>
        </div>
      </div>
    </div>
  );
};