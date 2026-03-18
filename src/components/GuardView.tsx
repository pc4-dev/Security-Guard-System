import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Send, CheckCircle2, Loader2, User, Building2, Camera, ClipboardCheck, Image as ImageIcon, Upload, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { firebaseService } from '../services/firebaseService';
import { Checkpoint, Guard } from '../types';
import { cn } from '../utils';
import CameraModal from './CameraModal';

export default function GuardView() {
  const [guards, setGuards] = useState<Guard[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [photoProgress, setPhotoProgress] = useState<number[]>([]);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [showForceSubmit, setShowForceSubmit] = useState(false);
  const forceSubmitResolveRef = useRef<((value: any) => void) | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (submitting) {
      timer = setTimeout(() => {
        setShowForceSubmit(true);
      }, 15000);
    } else {
      setShowForceSubmit(false);
    }
    return () => clearTimeout(timer);
  }, [submitting]);

  // Form State
  const [selectedGuard, setSelectedGuard] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedCheckpoint, setSelectedCheckpoint] = useState('');
  const [round, setRound] = useState('Round 1');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const projects = ["Regal Garden", "Garden City", "Nature Park", "OBC", "Milestone", "Hyde Park", "NG Grand"];
  const filteredCheckpoints = checkpoints.filter(c => !selectedProject || c.site === selectedProject);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [g, c] = await Promise.all([
          firebaseService.getGuards(),
          firebaseService.getCheckpoints()
        ]);
        setGuards(g);
        setCheckpoints(c);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuard || !selectedCheckpoint) {
      alert("Please fill all required fields.");
      return;
    }

    setSubmitting(true);
    setShowForceSubmit(false);
    setError(null);
    setUploadProgress('Submitting...');
    setPhotoProgress(new Array(photos.length).fill(0));
    
    try {
      const guard = guards.find(g => g.id === selectedGuard);
      const checkpoint = checkpoints.find(c => c.id === selectedCheckpoint);

      console.log('Preparing submission for:', { guard: guard?.name, checkpoint: checkpoint?.name, photosCount: photos.length });

      let photoUrls: string[] = [];
      
      if (photos.length > 0) {
        setUploadProgress('Uploading images...');
        
        // Track completed URLs in a ref so we can grab them if we force submit
        const completedUrls: (string | null)[] = new Array(photos.length).fill(null);

        // Sequential upload function to prevent bandwidth saturation
        const uploadSequentially = async () => {
          for (let i = 0; i < photos.length; i++) {
            try {
              console.log(`Uploading image ${i + 1}/${photos.length}...`);
              const url = await firebaseService.uploadImage(photos[i], selectedGuard, (progress) => {
                setPhotoProgress(prev => {
                  const next = [...prev];
                  next[i] = progress;
                  return next;
                });
              });
              console.log(`Image ${i + 1} uploaded successfully:`, url);
              completedUrls[i] = url;
            } catch (err) {
              console.error(`Failed to upload image ${i + 1}:`, err);
              // We don't throw here, just continue to the next one
            }
          }
        };

        // Create a promise that resolves when the user clicks "Force Submit"
        const forceSubmitPromise = new Promise<string>((resolve) => {
          forceSubmitResolveRef.current = () => resolve('FORCE_SUBMIT');
        });

        // Create a 300-second (5 minute) timeout for the whole process as a final safety net
        const globalTimeoutPromise = new Promise<string>((resolve) => {
          setTimeout(() => resolve('TIMEOUT'), 300000);
        });

        // Wait for either all uploads to finish, the user to force submit, or the global timeout
        const result = await Promise.race([
          uploadSequentially().then(() => 'COMPLETE'),
          forceSubmitPromise,
          globalTimeoutPromise
        ]);

        if (result === 'FORCE_SUBMIT') {
          console.warn('User forced submission, skipping remaining uploads.');
        } else if (result === 'TIMEOUT') {
          console.warn('Global upload timeout reached, proceeding with what we have.');
        }

        photoUrls = completedUrls.filter((url): url is string => url !== null);
        
        if (photoUrls.length < photos.length) {
          console.warn(`${photos.length - photoUrls.length} photos failed to upload or were skipped, but proceeding with submission.`);
        }
      }

      console.log('Image upload process complete. Final URLs:', photoUrls);

      setUploadProgress('Saving patrol log...');
      const logPayload = {
        guardId: selectedGuard,
        guardName: guard?.name || '',
        checkpointId: selectedCheckpoint,
        checkpointName: checkpoint?.name || '',
        siteName: checkpoint?.site || '',
        photoUrls: photoUrls,
        status: 'Completed' as const,
        timestamp: new Date().toISOString(),
        round,
        notes: notes.trim() || undefined
      };

      console.log('Submitting log payload to Firestore:', logPayload);
      const logId = await firebaseService.submitPatrolLog(logPayload);
      console.log('Patrol log submitted successfully. ID:', logId);

      setSuccess(true);
      setError(null);
      setTimeout(() => {
        setSuccess(false);
        setSelectedProject('');
        setSelectedCheckpoint('');
        setUploadProgress('');
        setPhotos([]);
        setNotes('');
      }, 3000);
    } catch (err) {
      console.error('Submission error:', err);
      let errorMessage = "Submission failed. Please check your internet connection and try again.";
      
      if (err instanceof Error) {
        try {
          // Check if it's a JSON error from handleFirestoreError
          const parsed = JSON.parse(err.message);
          if (parsed.error) {
            errorMessage = `Database Error: ${parsed.error}`;
          } else {
            errorMessage = err.message;
          }
        } catch {
          // Not JSON, use raw message
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setSubmitting(false);
      setUploadProgress('');
      setShowForceSubmit(false);
    }
  };

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 640;
        const MAX_HEIGHT = 640;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress to JPEG with 0.5 quality for faster uploads
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
        resolve(compressedBase64);
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64);
        setPhotos([compressed]);
      };
      reader.readAsDataURL(file as Blob);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
        <p className="mt-4 text-text-secondary font-medium">Loading patrol data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto font-sans">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-text-primary mb-2">Guard Portal</h2>
        <p className="text-text-secondary">Official portal for Neoteric Properties security personnel.</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key="patrol"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-6"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Guard Selection */}
              <div className="bg-white p-6 rounded-3xl border border-border-custom shadow-sm">
                <label className="flex items-center gap-2 text-xs font-bold text-text-secondary mb-4 uppercase tracking-wider">
                  <User className="w-4 h-4" /> Guard Information
                </label>
                <select
                  value={selectedGuard}
                  onChange={(e) => setSelectedGuard(e.target.value)}
                  className="w-full p-4 bg-page-bg border border-border-custom rounded-2xl focus:ring-2 focus:ring-brand-primary outline-none transition-all text-text-primary font-medium"
                  required
                >
                  <option value="">Select Your Name</option>
                  {guards.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.id})</option>
                  ))}
                </select>
              </div>

              {/* Project & Checkpoint Selection */}
              <div className="bg-white p-6 rounded-3xl border border-border-custom shadow-sm">
                <label className="flex items-center gap-2 text-xs font-bold text-text-secondary mb-4 uppercase tracking-wider">
                  <Building2 className="w-4 h-4" /> Site Details
                </label>
                <div className="space-y-4">
                  <select
                    value={selectedProject}
                    onChange={(e) => {
                      setSelectedProject(e.target.value);
                      setSelectedCheckpoint(''); // Reset checkpoint when project changes
                    }}
                    className="w-full p-4 bg-page-bg border border-border-custom rounded-2xl focus:ring-2 focus:ring-brand-primary outline-none transition-all text-text-primary font-medium"
                    required
                  >
                    <option value="">Select Project Name</option>
                    {projects.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>

                  <select
                    value={selectedCheckpoint}
                    onChange={(e) => setSelectedCheckpoint(e.target.value)}
                    className="w-full p-4 bg-page-bg border border-border-custom rounded-2xl focus:ring-2 focus:ring-brand-primary outline-none transition-all text-text-primary font-medium"
                    required
                    disabled={!selectedProject}
                  >
                    <option value="">{selectedProject ? 'Select Checkpoint' : 'Select Project First'}</option>
                    {filteredCheckpoints.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  <select
                    value={round}
                    onChange={(e) => setRound(e.target.value)}
                    className="w-full p-4 bg-page-bg border border-border-custom rounded-2xl focus:ring-2 focus:ring-brand-primary outline-none transition-all text-text-primary font-medium"
                  >
                    <option>Round 1</option>
                    <option>Round 2</option>
                    <option>Round 3</option>
                  </select>

                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes or report issues (Optional)"
                    className="w-full p-4 bg-page-bg border border-border-custom rounded-2xl focus:ring-2 focus:ring-brand-primary outline-none transition-all text-text-primary font-medium min-h-[100px] resize-none"
                  />
                </div>
              </div>

              {/* Image Upload Section */}
              <div className="bg-white p-6 rounded-3xl border border-border-custom shadow-sm">
                <label className="flex items-center gap-2 text-xs font-bold text-text-secondary mb-4 uppercase tracking-wider">
                  <Camera className="w-4 h-4" /> Visual Evidence
                </label>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="flex flex-col items-center justify-center p-4 bg-page-bg border-2 border-dashed border-border-custom rounded-2xl hover:bg-brand-light hover:border-brand-primary/30 transition-all group"
                  >
                    <Camera className="w-6 h-6 text-text-muted group-hover:text-brand-primary mb-1" />
                    <span className="text-[10px] font-bold text-text-secondary group-hover:text-brand-primary uppercase tracking-wider">Live Camera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-4 bg-page-bg border-2 border-dashed border-border-custom rounded-2xl hover:bg-brand-light hover:border-brand-primary/30 transition-all group"
                  >
                    <Upload className="w-6 h-6 text-text-muted group-hover:text-brand-primary mb-1" />
                    <span className="text-[10px] font-bold text-text-secondary group-hover:text-brand-primary uppercase tracking-wider">Upload</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </button>
                </div>

                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((p, idx) => (
                      <div key={idx} className="relative rounded-xl overflow-hidden aspect-square border border-border-custom">
                        <img src={p} alt={`Captured ${idx}`} className="w-full h-full object-cover" />
                        
                        {/* Progress Overlay */}
                        {submitting && photoProgress[idx] !== undefined && photoProgress[idx] < 100 && (
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center p-2">
                            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mb-1">
                              <motion.div 
                                className="h-full bg-brand-primary"
                                initial={{ width: 0 }}
                                animate={{ width: `${photoProgress[idx]}%` }}
                              />
                            </div>
                            <span className="text-[8px] font-black text-white uppercase tracking-widest">
                              {Math.round(photoProgress[idx])}%
                            </span>
                          </div>
                        )}

                        {submitting && photoProgress[idx] === 100 && (
                          <div className="absolute inset-0 bg-status-green/20 backdrop-blur-[1px] flex items-center justify-center">
                            <div className="bg-white rounded-full p-1 shadow-lg">
                              <CheckCircle2 className="w-4 h-4 text-status-green" />
                            </div>
                          </div>
                        )}

                        {!submitting && (
                          <button
                            type="button"
                            onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full backdrop-blur-md hover:bg-black/70 transition-all"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3"
                >
                  <div className="p-1 bg-red-100 rounded-full">
                    <X className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-800">Submission Error</p>
                    <p className="text-xs text-red-600/80 font-medium leading-relaxed">{error}</p>
                  </div>
                  <button 
                    onClick={() => setError(null)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {/* Submit Button */}
              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={submitting || success}
                  className={cn(
                    "w-full py-5 rounded-2xl font-bold text-lg shadow-lg transition-all flex flex-col items-center justify-center gap-1",
                    "bg-brand-primary hover:bg-brand-primary/90 text-white shadow-brand-primary/20",
                    (submitting || success) && "opacity-70 cursor-not-allowed"
                  )}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="text-xs font-medium opacity-80">{uploadProgress}</span>
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle2 className="w-6 h-6" />
                      Submitted Successfully
                    </>
                  ) : (
                    <>
                      <Send className="w-6 h-6" />
                      Submit Patrol Check
                    </>
                  )}
                </button>

                {showForceSubmit && submitting && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-center space-y-2"
                  >
                    <p className="text-[10px] font-medium text-amber-800 leading-tight">
                      Upload taking too long? You can skip the remaining images and submit now.
                    </p>
                    <button
                      type="button"
                      onClick={() => forceSubmitResolveRef.current?.('FORCE_SUBMIT')}
                      className="px-4 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-bold rounded-lg transition-colors border border-amber-200"
                    >
                      Skip & Submit Now
                    </button>
                  </motion.div>
                )}
              </div>
            </form>
          </motion.div>
      </AnimatePresence>

      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={async (imageData) => {
          const compressed = await compressImage(imageData);
          setPhotos([compressed]);
        }}
      />
    </div>
  );
}
