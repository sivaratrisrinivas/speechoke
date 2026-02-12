import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Speech } from '../types';
import { Clock, Disc, FileText, Eye, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SpeechCardProps {
  speech: Speech;
  onSelect: (speech: Speech) => void;
}

export const SpeechCard: React.FC<SpeechCardProps> = ({ speech, onSelect }) => {
  const [showPreview, setShowPreview] = useState(false);

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPreview(true);
  };

  const handleClose = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setShowPreview(false);
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPreview(false);
    onSelect(speech);
  };

  return (
    <>
      <div 
        onClick={() => onSelect(speech)}
        className="group relative bg-[#0a0a0a] border border-[#333] hover:border-[#00ffa3] p-0 cursor-pointer transition-colors duration-0 h-full flex flex-col"
      >
        {/* Header bar */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-[#333] group-hover:border-[#00ffa3] group-hover:bg-[#00ffa3] group-hover:text-black transition-colors duration-0">
          <span className="font-mono text-xs uppercase">
             Script #{speech.id.substring(0, 3)}
          </span>
          <Disc size={14} className="animate-spin-slow" />
        </div>

        <div className="p-6 relative overflow-hidden flex-1 flex flex-col">
          {/* Background Glitch Text Decoration */}
          <div className="absolute -right-4 -bottom-4 text-[100px] font-bold text-[#111] leading-none select-none z-0">
            {speech.year.substring(2)}
          </div>

          <div className="relative z-10 flex-1 flex flex-col">
              <h3 className="font-bold text-2xl text-white mb-2 leading-none uppercase tracking-tighter group-hover:text-[#00ffa3] transition-colors">
              {speech.title}
              </h3>
              <p className="font-mono text-xs text-[#888] mb-6 border-l-2 border-[#333] pl-2">
              {speech.author} // {speech.year}
              </p>
              
              <div 
                className="font-mono text-sm text-[#bbb] mb-8 line-clamp-3 hover:text-white cursor-pointer relative group/excerpt"
                onClick={handlePreviewClick}
              >
                {speech.excerpt}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/excerpt:opacity-100 bg-black/80 transition-opacity backdrop-blur-[1px]">
                    <span className="text-[#00ffa3] text-xs uppercase font-bold flex items-center gap-2 border border-[#00ffa3] px-2 py-1">
                        <Eye size={12} /> Read Full
                    </span>
                </div>
              </div>

              <div className="mt-auto flex items-center gap-4 text-xs font-mono text-[#666] group-hover:text-white">
                  <span className="flex items-center gap-1 border border-[#333] px-2 py-1">
                      <Clock size={10} /> {speech.duration}
                  </span>
                  <span className="flex items-center gap-1 border border-[#333] px-2 py-1 uppercase">
                      <FileText size={10} /> {speech.difficulty}
                  </span>
              </div>
          </div>
        </div>
      </div>

      {createPortal(
        <AnimatePresence>
          {showPreview && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
              onClick={handleClose}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl bg-[#0a0a0a] border border-[#00ffa3] shadow-[0_0_50px_rgba(0,255,163,0.15)] flex flex-col max-h-[85vh] md:max-h-[80vh]"
              >
                {/* Header */}
                <div className="flex justify-between items-start p-4 md:p-6 border-b border-[#333]">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold uppercase text-white leading-none tracking-tight">{speech.title}</h2>
                        <div className="flex items-center gap-2 mt-2 font-mono text-xs text-[#666]">
                            <span>{speech.author}</span>
                            <span>//</span>
                            <span>{speech.year}</span>
                        </div>
                    </div>
                    <button 
                        onClick={handleClose}
                        className="text-white hover:text-[#00ffa3] transition-colors p-1"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 md:p-8 overflow-y-auto font-mono text-xs md:text-sm leading-relaxed text-[#ddd] whitespace-pre-wrap selection:bg-[#00ffa3] selection:text-black">
                    {speech.content}
                </div>

                {/* Footer */}
                <div className="p-4 md:p-6 border-t border-[#333] flex justify-between items-center bg-[#050505]">
                    <div className="flex gap-2 md:gap-4 text-xs font-mono text-[#666]">
                        <span className="flex items-center gap-1"><Clock size={12}/> {speech.duration}</span>
                        <span className="flex items-center gap-1"><FileText size={12}/> {speech.difficulty}</span>
                    </div>
                    <button 
                        onClick={handleSelect}
                        className="bg-[#00ffa3] text-black px-4 py-2 md:px-6 md:py-3 font-bold uppercase tracking-widest hover:bg-[#00e692] transition-colors text-xs md:text-sm"
                        style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
                    >
                        Select Script
                    </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};