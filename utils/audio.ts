export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:audio/webm;base64,")
      const base64 = base64String.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const playMadnessCue = () => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioContext();
  const t = ctx.currentTime;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.5, t);
  masterGain.gain.exponentialRampToValueAtTime(0.01, t + 2.5);
  masterGain.connect(ctx.destination);

  // 1. Dissonant Cluster - Rising Pitch
  const freqs = [100, 154, 168, 220, 310]; 
  freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(f, t);
      // Pitch bend up aggressively
      osc.frequency.exponentialRampToValueAtTime(f * 4, t + 2.0);
      
      const oscGain = ctx.createGain();
      oscGain.gain.value = 0.2;
      
      osc.connect(oscGain);
      oscGain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 2.5);
  });
  
  // 2. Noise Burst (Static)
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.value = 500;
  
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.8, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 1.0); // Short burst
  
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  
  noise.start(t);
  noise.stop(t + 2.5);
};