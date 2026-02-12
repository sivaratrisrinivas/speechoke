import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  stream: MediaStream | null;
  isActive: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ stream, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Cleanup previous context if stream changes or becomes inactive
    if (!stream || !isActive) {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
         try {
             sourceRef.current?.disconnect();
             audioContextRef.current.close(); 
         } catch(e) { console.error(e); }
      }
      return;
    }

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    
    const analyser = audioContext.createAnalyser();
    // FFT Size 128 = 64 frequency bins. Chunky, brutalist bars.
    analyser.fftSize = 128; 
    analyser.smoothingTimeConstant = 0.6; // Responsive but not too jittery
    analyserRef.current = analyser;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    sourceRef.current = source;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (canvas && ctx) {
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!isActive) return;
        
        animationRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        // Clear canvas
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) - 1;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          // Slight boost for higher frequencies which are often quieter in speech
          const boost = 1 + (i / bufferLength) * 0.5;
          const val = Math.min(255, dataArray[i] * boost);
          const percent = val / 255;
          
          const barHeight = percent * canvas.height;

          // Dynamic Teal Color
          // Base: #00ffa3 (HSL ~158, 100%, 50%)
          // Lighter when louder
          const lightness = 50 + (percent * 30);
          ctx.fillStyle = `hsl(158, 100%, ${lightness}%)`;

          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

          x += barWidth + 1;
        }
      };

      draw();
    }

    return () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [stream, isActive]);

  return (
    <div className="border border-[#333] bg-[#050505] w-full h-full relative overflow-hidden group">
        <canvas 
        ref={canvasRef} 
        width={300} 
        height={60} 
        className="w-full h-full block"
        />
        {/* Overlay grid for style */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz48L3N2Zz4=')]"></div>
    </div>
  );
};