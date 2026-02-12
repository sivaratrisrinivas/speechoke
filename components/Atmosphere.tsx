import React, { useEffect, useRef } from 'react';

export type AtmosphereMode = 'OFF' | 'AMBIENT' | 'TENSION';

interface AtmosphereProps {
  mode: AtmosphereMode;
  volume: number;
  inputVolume?: number;
}

export const Atmosphere: React.FC<AtmosphereProps> = ({ mode, volume, inputVolume = 0 }) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);
  const tensionGainRef = useRef<GainNode | null>(null);
  const tensionSequencerRef = useRef<number | null>(null);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);
  const isInitRef = useRef(false);

  useEffect(() => {
    const initAudio = () => {
        if (isInitRef.current) return;
        
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        console.info('[Speechoke][Audio] context-created', { initialState: ctx.state, mode, volume, inputVolume });

        // --- AMBIENT DRONE (Select/Prepare) ---
        const ambientMaster = ctx.createGain();
        ambientMaster.gain.value = 0;
        ambientMaster.connect(ctx.destination);
        ambientGainRef.current = ambientMaster;

        // Osc 1: Deep Sawtooth
        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.value = 55; // A1
        
        // Osc 2: Detuned Triangle
        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.value = 55.5; 

        const droneFilter = ctx.createBiquadFilter();
        droneFilter.type = 'lowpass';
        droneFilter.frequency.value = 120;
        
        // LFO for drone breath
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.05;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 40;
        lfo.connect(lfoGain);
        lfoGain.connect(droneFilter.frequency);

        osc1.connect(droneFilter);
        osc2.connect(droneFilter);
        droneFilter.connect(ambientMaster);
        
        osc1.start();
        osc2.start();
        lfo.start();

        // --- TENSION / KARAOKE BACKING (Performance) ---
        const tensionMaster = ctx.createGain();
        tensionMaster.gain.value = 0;
        tensionMaster.connect(ctx.destination);
        tensionGainRef.current = tensionMaster;

        // Bass foundation
        const pulseOsc = ctx.createOscillator();
        pulseOsc.type = 'sawtooth';
        pulseOsc.frequency.value = 82.41; // E2
        
        const pulseFilter = ctx.createBiquadFilter();
        pulseFilter.type = 'lowpass';
        pulseFilter.frequency.value = 160;
        pulseFilter.Q.value = 8;

        pulseOsc.connect(pulseFilter);
        pulseFilter.connect(tensionMaster);

        // Lead line
        const leadOsc = ctx.createOscillator();
        leadOsc.type = 'triangle';
        leadOsc.frequency.value = 329.63; // E4
        const leadGain = ctx.createGain();
        leadGain.gain.value = 0;
        const leadDelay = ctx.createDelay();
        leadDelay.delayTime.value = 0.18;
        const leadFeedback = ctx.createGain();
        leadFeedback.gain.value = 0.25;
        leadOsc.connect(leadGain);
        leadGain.connect(tensionMaster);
        leadGain.connect(leadDelay);
        leadDelay.connect(leadFeedback);
        leadFeedback.connect(leadDelay);
        leadDelay.connect(tensionMaster);

        // Chord pad
        const padOsc1 = ctx.createOscillator();
        const padOsc2 = ctx.createOscillator();
        const padGain = ctx.createGain();
        padOsc1.type = 'sawtooth';
        padOsc2.type = 'triangle';
        padOsc1.frequency.value = 164.81; // E3
        padOsc2.frequency.value = 207.65; // G#3
        padGain.gain.value = 0.04;
        const padFilter = ctx.createBiquadFilter();
        padFilter.type = 'lowpass';
        padFilter.frequency.value = 800;
        padOsc1.connect(padFilter);
        padOsc2.connect(padFilter);
        padFilter.connect(padGain);
        padGain.connect(tensionMaster);

        // Hi-hat noise buffer for short tick accents.
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const channel = noiseBuffer.getChannelData(0);
        for (let i = 0; i < channel.length; i++) {
          channel[i] = Math.random() * 2 - 1;
        }
        noiseBufferRef.current = noiseBuffer;

        const notePattern = [329.63, 392.0, 440.0, 392.0, 523.25, 493.88, 440.0, 392.0];
        const bassPattern = [82.41, 82.41, 92.5, 92.5, 98.0, 98.0, 92.5, 92.5];
        let step = 0;

        const triggerKick = (time: number) => {
          const kickOsc = ctx.createOscillator();
          const kickGain = ctx.createGain();
          kickOsc.type = 'sine';
          kickOsc.frequency.setValueAtTime(140, time);
          kickOsc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
          kickGain.gain.setValueAtTime(0.35, time);
          kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
          kickOsc.connect(kickGain);
          kickGain.connect(tensionMaster);
          kickOsc.start(time);
          kickOsc.stop(time + 0.15);
        };

        const triggerHat = (time: number) => {
          if (!noiseBufferRef.current) return;
          const src = ctx.createBufferSource();
          src.buffer = noiseBufferRef.current;
          const hp = ctx.createBiquadFilter();
          hp.type = 'highpass';
          hp.frequency.value = 6000;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.08, time);
          g.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
          src.connect(hp);
          hp.connect(g);
          g.connect(tensionMaster);
          src.start(time);
          src.stop(time + 0.05);
        };

        const STEP_MS = 250; // 120 BPM, 1/8th notes.
        tensionSequencerRef.current = window.setInterval(() => {
          const now = ctx.currentTime;
          const note = notePattern[step % notePattern.length];
          const bass = bassPattern[step % bassPattern.length];

          leadOsc.frequency.setTargetAtTime(note, now, 0.015);
          leadGain.gain.cancelScheduledValues(now);
          leadGain.gain.setValueAtTime(0.001, now);
          leadGain.gain.linearRampToValueAtTime(0.1, now + 0.02);
          leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

          pulseOsc.frequency.setTargetAtTime(bass, now, 0.04);
          if (step % 2 === 0) triggerKick(now);
          triggerHat(now + 0.12);

          step += 1;
        }, STEP_MS);

        // Start tension generators
        pulseOsc.start();
        leadOsc.start();
        padOsc1.start();
        padOsc2.start();

        isInitRef.current = true;
    };

    const updateMix = async () => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        
        // Try resuming if possible, though event listeners handle most cases
        if (ctx.state === 'suspended') {
             try {
               await ctx.resume();
               console.info('[Speechoke][Audio] resumed in updateMix', { state: ctx.state, mode, volume });
             } catch(e) {
               console.warn('[Speechoke][Audio] resume in updateMix failed', e);
             }
        }

        const now = ctx.currentTime;
        const fadeTime = 0.5; // Faster fade for volume adjustments (was 2.0)

        const AMBIENT_BASE_GAIN = 0.1;
        const TENSION_BASE_GAIN = 0.15;

        // Ambient Gain Control
        if (ambientGainRef.current) {
             const target = mode === 'AMBIENT' ? (AMBIENT_BASE_GAIN * volume) : 0;
             ambientGainRef.current.gain.cancelScheduledValues(now);
             ambientGainRef.current.gain.setTargetAtTime(target, now, fadeTime);
        }

        // Tension Gain Control
        if (tensionGainRef.current) {
            const target = mode === 'TENSION' ? (TENSION_BASE_GAIN * volume) : 0; 
            tensionGainRef.current.gain.cancelScheduledValues(now);
            tensionGainRef.current.gain.setTargetAtTime(target, now, fadeTime);
        }

        console.info('[Speechoke][Audio] mix-update', {
          mode,
          volume,
          inputVolume,
          state: ctx.state,
          ambientTarget: mode === 'AMBIENT' ? (AMBIENT_BASE_GAIN * volume) : 0,
          tensionTarget: mode === 'TENSION' ? (TENSION_BASE_GAIN * volume) : 0,
        });
    };

    // Resume/init audio context on user interaction (fixes autoplay policy)
    const handleUserGesture = async () => {
      if (!isInitRef.current) initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
          console.info('[Speechoke][Audio] resumed by gesture', { state: ctx.state, mode, volume });
        } catch (err) {
          console.warn('[Speechoke][Audio] resume failed', err);
        }
      }
      updateMix();
    };

    window.addEventListener('click', handleUserGesture);
    window.addEventListener('keydown', handleUserGesture);
    updateMix();

    return () => {
      window.removeEventListener('click', handleUserGesture);
      window.removeEventListener('keydown', handleUserGesture);
    };

  }, [mode, volume]);

  useEffect(() => {
    return () => {
      if (tensionSequencerRef.current !== null) {
        clearInterval(tensionSequencerRef.current);
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, []);

  return null;
};