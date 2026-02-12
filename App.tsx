import React, { useState, useRef, useEffect } from 'react';
import { AppScreen, Speech, CritiqueResult } from './types';
import { SPEECHES } from './constants';
import { SpeechCard } from './components/SpeechCard';
import { Teleprompter } from './components/Teleprompter';
import { Visualizer } from './components/Visualizer';
import { Atmosphere, AtmosphereMode } from './components/Atmosphere';
import { Button } from './components/Button';
import { blobToBase64, playMadnessCue } from './utils/audio';
import { geminiService } from './services/geminiService';
import { RefreshCcw, ArrowRight, Loader2, Radio, X, Sliders, Keyboard, Save, Plus, Volume2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>(AppScreen.HERO);
  const [selectedSpeech, setSelectedSpeech] = useState<Speech | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Audio Analysis State
  const [inputVolume, setInputVolume] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const volumeIntervalRef = useRef<number | null>(null);
  
  const [scrollSpeed, setScrollSpeed] = useState(1.5);
  const [volume, setVolume] = useState(0.5); // Default 50%
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [critique, setCritique] = useState<CritiqueResult | null>(null);
  
  // Countdown State
  const [countdown, setCountdown] = useState<number | null>(null);

  // Madness State
  const [isMad, setIsMad] = useState(false);

  // Custom Text State (No Voice)
  const [customText, setCustomText] = useState('');

  // -- Handlers --

  const handleStart = () => setScreen(AppScreen.SELECT);

  const handleSelectSpeech = (speech: Speech) => {
    setSelectedSpeech(speech);
    setScreen(AppScreen.PREPARE);
  };

  const handleGoToCustom = () => {
    setCustomText('');
    setScreen(AppScreen.DICTATE);
  };

  const saveCustomText = () => {
    if (!customText.trim()) return;

    const customSpeech: Speech = {
      id: `custom-${Date.now()}`,
      title: 'Custom Script',
      author: 'You',
      year: new Date().getFullYear().toString(),
      difficulty: 'Custom',
      duration: 'Unknown',
      content: customText,
      excerpt: customText.substring(0, 60) + '...',
      image: '0'
    };
    setSelectedSpeech(customSpeech);
    setScreen(AppScreen.PREPARE);
  };

  const handleMadness = () => {
    setIsMad(true);
    playMadnessCue();
    setTimeout(() => setIsMad(false), 2000);
  };

  // Performance Logic
  const startPerformanceSequence = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      setScreen(AppScreen.PERFORM);
      setCountdown(3);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access is required to perform.");
    }
  };

  // Volume Monitoring Loop
  useEffect(() => {
    if (screen === AppScreen.PERFORM && analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        
        const updateVolume = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            
            let sum = 0;
            for(let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i] * dataArray[i];
            }
            const rms = Math.sqrt(sum / dataArray.length);
            const norm = Math.min(rms / 128, 1);
            
            setInputVolume(prev => prev * 0.8 + norm * 0.2);
            
            volumeIntervalRef.current = requestAnimationFrame(updateVolume);
        };
        
        updateVolume();
    } else {
        if (volumeIntervalRef.current) cancelAnimationFrame(volumeIntervalRef.current);
        setInputVolume(0);
    }

    return () => {
        if (volumeIntervalRef.current) cancelAnimationFrame(volumeIntervalRef.current);
    };
  }, [screen]);

  // Fixed Countdown Logic
  useEffect(() => {
    let timer: any;
    if (countdown !== null) {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      } else if (countdown === 0) {
        if (!isRecording) startRecording();
        timer = setTimeout(() => setCountdown(null), 1000);
      }
    }
    return () => clearTimeout(timer);
  }, [countdown, isRecording]);

  const startRecording = () => {
    if (!audioStream) return;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') return;

    const mediaRecorder = new MediaRecorder(audioStream);
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setTimeout(() => {
        finishPerformance();
      }, 500);
    }
  };

  const finishPerformance = async () => {
    if (!selectedSpeech) return;

    setScreen(AppScreen.CRITIQUE);
    setIsAnalyzing(true);

    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const base64Audio = await blobToBase64(audioBlob);

    audioStream?.getTracks().forEach(track => track.stop());
    setAudioStream(null);

    const result = await geminiService.analyzePerformance(
      selectedSpeech.title,
      selectedSpeech.content,
      base64Audio
    );

    setCritique(result);
    setIsAnalyzing(false);
  };

  const handleReset = () => {
    setScreen(AppScreen.SELECT);
    setSelectedSpeech(null);
    setCritique(null);
    setIsRecording(false);
  };

  let atmosphereMode: AtmosphereMode = 'OFF';
  if (screen === AppScreen.SELECT || screen === AppScreen.PREPARE || screen === AppScreen.DICTATE || screen === AppScreen.CRITIQUE) {
    atmosphereMode = 'AMBIENT';
  } else if (screen === AppScreen.PERFORM) {
    atmosphereMode = 'TENSION';
  }

  const accentColor = "#00ffa3"; 

  // -- Screens --

  const renderHero = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6 bg-[#050505]"
    >
      <div className="border border-[#333] p-6 md:p-12 max-w-4xl w-full relative overflow-hidden group">
         <div className="absolute -right-10 -top-10 md:-right-20 md:-top-20 text-[100px] md:text-[200px] font-bold text-[#111] leading-none select-none z-0 rotate-12">
            SPEAK
         </div>

         <div className="relative z-10 text-center md:text-left">
            <div className={`inline-block bg-[${accentColor}] text-black px-2 py-1 font-mono text-xs md:text-sm font-bold mb-4 md:mb-6`}>
                READY
            </div>
            <h1 className="text-5xl md:text-9xl font-bold tracking-tighter text-white mb-2 leading-[0.8]">
              SPEECH<span className={`text-[#333] group-hover:text-[${accentColor}] transition-colors`}>OKE</span>
            </h1>
            <p className={`font-mono text-sm md:text-base text-[#888] max-w-lg mt-6 mb-12 border-l border-[${accentColor}] pl-4`}>
              IMPRESSIONS. ROASTS. RANTS. REENACTMENTS.<br/>
              SELECT A SCRIPT. PERFORM IT. GET JUDGED.
            </p>
            <Button size="lg" onClick={handleStart} variant="primary" className="w-full md:w-auto">
              START <ArrowRight size={20} />
            </Button>
         </div>
      </div>
    </motion.div>
  );

  const renderSelect = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen flex flex-col bg-[#050505] p-4 md:p-6"
    >
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 border-b border-[#333] pb-4 sticky top-0 bg-[#050505]/95 z-20 backdrop-blur-sm gap-4 pt-2">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-white uppercase tracking-tight">Select a Script</h2>
          <p className="font-mono text-xs text-[#666] mt-1">CHOOSE WHAT TO PERFORM</p>
        </div>
        <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-2">
                <Volume2 size={16} className={`text-[${accentColor}]`} />
                <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05" 
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className={`w-24 accent-[${accentColor}] h-1 bg-[#333] appearance-none cursor-pointer rounded-full`}
                />
            </div>
            <Button variant="secondary" size="sm" onClick={() => setScreen(AppScreen.HERO)}>Back</Button>
        </div>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-12">
        <motion.div 
            whileHover={{ scale: 1.02 }}
            onClick={handleGoToCustom}
            className={`group relative bg-[#111] border border-[${accentColor}] border-dashed hover:bg-[${accentColor}] p-6 cursor-pointer transition-colors duration-200 min-h-[200px] md:min-h-[240px] flex flex-col justify-center items-center text-center`}
        >
            <Plus size={48} className={`text-[${accentColor}] group-hover:text-black mb-4 transition-transform group-hover:rotate-90 duration-300`} />
            <h3 className="font-bold text-xl md:text-2xl text-white group-hover:text-black uppercase">
                Write Your Own
            </h3>
            <p className="font-mono text-xs text-[#666] group-hover:text-black mt-2">
                // PASTE OR TYPE TEXT
            </p>
        </motion.div>

        {SPEECHES.map((speech, index) => (
          <motion.div
            key={speech.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
             <SpeechCard speech={speech} onSelect={handleSelectSpeech} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const renderCustom = () => (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="min-h-screen flex flex-col bg-[#050505] p-4 md:p-6"
    >
        <header className="flex justify-between items-center mb-8 border-b border-[#333] pb-4">
            <div className="flex items-center gap-3">
                <Keyboard className={`text-[${accentColor}]`} />
                <h2 className="text-xl md:text-2xl font-bold text-white uppercase tracking-tight">Custom Script</h2>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setScreen(AppScreen.SELECT)}>Back</Button>
        </header>

        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
            <div className="flex-1 relative border border-[#333] bg-[#0a0a0a] p-4 mb-8 flex flex-col">
                <textarea 
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    className="w-full h-full bg-transparent text-white font-mono text-lg md:text-xl p-2 md:p-4 resize-none focus:outline-none placeholder-[#333] z-10 relative"
                    placeholder="> Type or paste your script here..."
                    autoFocus
                />
            </div>

            <Button 
                onClick={saveCustomText} 
                variant="primary"
                className="w-full"
                disabled={!customText.trim()}
                icon={<Save size={18} />}
            >
                Use Script
            </Button>
        </div>
    </motion.div>
  );

  const renderPrepare = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col md:flex-row bg-[#050505]"
    >
      {/* Left: Script Preview */}
      <div className="flex-1 border-r border-[#333] flex flex-col h-[40vh] md:h-screen">
         <div className="p-4 border-b border-[#333] bg-[#111] flex justify-between items-center">
            <span className={`font-mono text-xs text-[${accentColor}] uppercase`}>Preview</span>
            <div className={`w-2 h-2 bg-[${accentColor}] rounded-full animate-pulse`} />
         </div>
         <div className="flex-1 overflow-y-auto p-4 md:p-8 font-mono text-xs md:text-sm text-[#aaa] leading-relaxed whitespace-pre-wrap">
            {selectedSpeech?.content}
         </div>
      </div>

      {/* Right: Controls */}
      <div className="w-full md:w-[400px] bg-[#0a0a0a] flex flex-col p-6 md:p-8 justify-between flex-1 md:flex-none border-t md:border-t-0 border-[#333]">
         <div>
            <Button variant="secondary" size="sm" onClick={() => setScreen(AppScreen.SELECT)} className="mb-6 md:mb-8">
               <X size={16} /> Back
            </Button>
            <h2 className="text-2xl md:text-4xl font-bold text-white uppercase leading-none mb-2 break-words">{selectedSpeech?.title}</h2>
            <p className="font-mono text-[#666] mb-8">{selectedSpeech?.author}</p>
            
            <div className="border border-[#333] p-4 mb-4">
                <div className="font-mono text-xs text-[#666] mb-2 uppercase">Status Check</div>
                <div className="flex items-center justify-between text-white font-mono text-sm">
                    <span>Microphone</span>
                    <span className={`text-[${accentColor}]`}>Ready</span>
                </div>
                <div className="flex items-center justify-between text-white font-mono text-sm mt-2">
                    <span>Analysis API</span>
                    <span className={`text-[${accentColor}]`}>CONFIGURED</span>
                </div>
            </div>
         </div>

         <Button size="lg" onClick={startPerformanceSequence} variant="primary" className="w-full py-6 md:py-8 text-lg md:text-xl mt-4 md:mt-0">
            Start Performance <Radio className="ml-2 animate-pulse" />
         </Button>
      </div>
    </motion.div>
  );

  const renderPerform = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-[#050505] flex flex-col overflow-hidden relative z-[50]"
    >
      {/* Countdown Overlay */}
      {countdown !== null && (
          <div className="absolute inset-0 z-[100] bg-black/90 flex items-center justify-center backdrop-blur-sm pointer-events-none transition-opacity duration-300">
            <motion.div 
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 1 }}
              exit={{ scale: 3, opacity: 0 }}
              className={`text-[100px] md:text-[150px] font-bold text-[${accentColor}]`}
            >
              {countdown > 0 ? countdown : "GO"}
            </motion.div>
          </div>
      )}

      {/* Madness Effect Overlay */}
      <AnimatePresence>
        {isMad && (
            <motion.div 
                className="absolute inset-0 z-[60] bg-red-600 mix-blend-hard-light pointer-events-none flex items-center justify-center overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.8, 0.4, 0.9, 0] }}
                transition={{ duration: 2, times: [0, 0.1, 0.4, 0.8, 1] }}
            >
                {/* Shake and Scale Text */}
                <motion.h1 
                    className="text-[15vw] md:text-[20vw] font-black text-black leading-none uppercase text-center"
                    initial={{ scale: 0.5, rotate: -5 }}
                    animate={{ scale: [1, 1.2, 0.9, 1.1], rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 0.2, repeat: 10 }}
                >
                    MAD AS HELL
                </motion.h1>
                <div className="absolute inset-0 bg-black/20 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #000 4px)' }}></div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Top HUD */}
      <div className="border-b border-[#333] bg-[#000] p-2 md:p-4 flex justify-between items-center z-50 shrink-0">
        <div className="flex items-center gap-2 md:gap-4">
          <motion.div 
            animate={{ opacity: isRecording ? [1, 0.5, 1] : 1 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className={`bg-[${accentColor}] text-black px-2 py-1 md:px-3 font-mono text-[10px] md:text-xs font-bold flex items-center gap-2 rounded-sm whitespace-nowrap`}
          >
             {isRecording ? "ON AIR" : "READY"}
          </motion.div>
          <div className="w-32 md:w-64 hidden sm:block">
            <Visualizer stream={audioStream} isActive={!!audioStream} />
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
             {/* Get Mad Button - Hidden on small mobile */}
             <Button 
                size="sm"
                onClick={handleMadness}
                disabled={isMad}
                className="bg-red-600 hover:bg-red-500 text-white border-red-800 animate-pulse hidden sm:flex px-2 md:px-4"
                icon={<Zap size={14} />}
             >
                <span className="hidden md:inline">GET MAD!</span>
                <span className="md:hidden">!</span>
             </Button>

            {/* Speed */}
            <div className="flex items-center gap-2 border border-[#333] px-2 py-1 bg-[#111]">
               <Sliders size={14} className="text-[#666]" />
               <input 
                type="range" 
                min="0.5" 
                max="3" 
                step="0.1" 
                value={scrollSpeed} 
                onChange={(e) => setScrollSpeed(parseFloat(e.target.value))}
                className={`w-16 md:w-24 accent-[${accentColor}] h-1 bg-[#333] appearance-none cursor-pointer`}
              />
            </div>
            <Button variant="danger" onClick={stopRecording} size="sm" className="px-2 md:px-4">
            Stop
            </Button>
        </div>
      </div>

      {/* Teleprompter */}
      <motion.div 
        className="flex-1 relative bg-black w-full"
        animate={isMad ? { x: [-5, 5, -5, 5, 0], filter: "hue-rotate(90deg) contrast(1.5)" } : {}}
        transition={{ duration: 0.5 }}
      >
        {selectedSpeech && (
          <Teleprompter 
            text={selectedSpeech.content} 
            isPlaying={true}
            speed={scrollSpeed}
            inputVolume={inputVolume}
          />
        )}
      </motion.div>
    </motion.div>
  );

  const renderCritique = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#050505] p-4 md:p-6 flex flex-col items-center justify-center"
    >
      {isAnalyzing ? (
        <div className="text-center">
          <Loader2 size={64} className={`animate-spin text-[${accentColor}] mx-auto mb-6`} />
          <h2 className="text-3xl font-bold text-white uppercase mb-2">Analyzing...</h2>
          <p className="font-mono text-sm text-[#666]">LISTENING TO YOUR PERFORMANCE</p>
        </div>
      ) : critique ? (
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="max-w-2xl w-full border border-[#333] bg-[#0a0a0a] p-4 md:p-8 relative"
        >
           {/* Top "Receipt" edge */}
           <div className="w-full border-b-2 border-dashed border-[#333] mb-8 pb-4 flex justify-between items-end">
              <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white uppercase">Your Results</h1>
                  <p className="font-mono text-xs text-[#666]">{new Date().toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                  <div className={`text-4xl md:text-5xl font-bold text-[${accentColor}] leading-none`}>{critique.overallScore}</div>
                  <div className="font-mono text-xs text-[#666] uppercase">Score</div>
              </div>
           </div>

           <div className="grid grid-cols-3 gap-1 mb-8">
              <div className="bg-[#111] p-2 md:p-4 border border-[#333] text-center md:text-left">
                <div className="font-mono text-[10px] md:text-xs text-[#666]">CLARITY</div>
                <div className="text-lg md:text-xl font-bold text-white">{critique.clarityScore}</div>
              </div>
              <div className="bg-[#111] p-2 md:p-4 border border-[#333] text-center md:text-left">
                <div className="font-mono text-[10px] md:text-xs text-[#666]">EMOTION</div>
                <div className="text-lg md:text-xl font-bold text-white">{critique.emotionScore}</div>
              </div>
              <div className="bg-[#111] p-2 md:p-4 border border-[#333] text-center md:text-left">
                <div className="font-mono text-[10px] md:text-xs text-[#666]">PACING</div>
                <div className="text-lg md:text-xl font-bold text-white">{critique.pacingScore}</div>
              </div>
           </div>

           <div className={`mb-8 font-mono text-xs md:text-sm text-[#ccc] leading-relaxed border-l-2 border-[${accentColor}] pl-4`}>
              {critique.feedback}
           </div>

           <div className="space-y-4 border-t border-[#333] pt-6">
               <div>
                  <h4 className={`font-mono text-xs text-[${accentColor}] uppercase mb-1`}>Best Moment</h4>
                  <p className="text-white italic text-sm md:text-base">"{critique.bestLine}"</p>
               </div>
               <div>
                  <h4 className={`font-mono text-xs text-[${accentColor}] uppercase mb-1`}>Tip</h4>
                  <p className="text-white text-sm md:text-base">{critique.improvementTip}</p>
               </div>
           </div>

           <div className="mt-8 md:mt-12 flex justify-center">
              <Button size="lg" onClick={handleReset} icon={<RefreshCcw size={18} />} className="w-full md:w-auto">
                Start Over
              </Button>
           </div>
        </motion.div>
      ) : (
        <div className="text-white">Something went wrong.</div>
      )}
    </motion.div>
  );

  return (
    <main className={`antialiased text-white selection:bg-[${accentColor}] selection:text-black`}>
      <Atmosphere mode={atmosphereMode} volume={volume} inputVolume={inputVolume} />

      <AnimatePresence mode="wait">
        {screen === AppScreen.HERO && <React.Fragment key="hero">{renderHero()}</React.Fragment>}
        {screen === AppScreen.SELECT && <React.Fragment key="select">{renderSelect()}</React.Fragment>}
        {screen === AppScreen.DICTATE && <React.Fragment key="dictate">{renderCustom()}</React.Fragment>}
        {screen === AppScreen.PREPARE && <React.Fragment key="prepare">{renderPrepare()}</React.Fragment>}
        {screen === AppScreen.PERFORM && <React.Fragment key="perform">{renderPerform()}</React.Fragment>}
        {screen === AppScreen.CRITIQUE && <React.Fragment key="critique">{renderCritique()}</React.Fragment>}
      </AnimatePresence>
    </main>
  );
};

export default App;