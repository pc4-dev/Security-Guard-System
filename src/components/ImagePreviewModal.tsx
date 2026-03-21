import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  imageName?: string | null;
}

export default function ImagePreviewModal({ isOpen, onClose, imageUrl, imageName }: ImagePreviewModalProps) {
  if (!imageUrl) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 md:p-8"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative max-w-5xl w-full max-h-full flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Controls */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent z-10 rounded-t-2xl">
              <div className="flex flex-col">
                <h3 className="text-white font-bold text-sm md:text-base truncate max-w-[200px] md:max-w-md">
                  {imageName || 'Image Preview'}
                </h3>
                <p className="text-white/60 text-[10px] uppercase tracking-widest font-bold">Patrol Evidence</p>
              </div>
              
              <div className="flex items-center gap-2">
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
                <button
                  onClick={onClose}
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                  title="Close"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Image Container */}
            <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-2xl bg-black/20">
              <img
                src={imageUrl}
                alt={imageName || 'Preview'}
                className="max-w-full max-h-[80vh] object-contain shadow-2xl"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Footer Info (Optional) */}
            <div className="flex items-center gap-4 text-white/40 text-xs font-medium">
              <span>Click outside to close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
