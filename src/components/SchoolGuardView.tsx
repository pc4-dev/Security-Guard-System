import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Send, CheckCircle2, Loader2, User, Building2, Camera, ClipboardCheck, Image as ImageIcon, Upload, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { firebaseService } from '../services/firebaseService';
import { Checkpoint, Guard } from '../types';
import { cn } from '../utils';
import CameraModal from './CameraModal';

export default function SchoolGuardView() {
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
  const selectedProject = "School"; // Fixed for this portal
  const [round, setRound] = useState('Checkpoint 1');
  const [images, setImages] = useState<(string | null)[]>([null, null, null, null, null, null]);
  const [imageNames, setImageNames] = useState<(string | null)[]>([null, null, null, null, null, null]);
  const [activeCameraSection, setActiveCameraSection] = useState<number | null>(null);

  const fileInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [g, c] = await Promise.all([
          firebaseService.getGuards(),
          firebaseService.getCheckpoints()
        ]);
        // Filter guards by School if possible, or just show all
        setGuards(g.filter(guard => guard.site === selectedProject || !guard.site));
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
    if (!selectedGuard) {
      alert("Please select your name.");
      return;
    }

    setSubmitting(true);
    setShowForceSubmit(false);
    setError(null);
    setUploadProgress('Submitting...');
    
    const photosToUpload = images.filter((p): p is string => p !== null);
    setPhotoProgress(new Array(photosToUpload.length).fill(0));
    
    try {
      const guard = guards.find(g => g.id === selectedGuard);

      console.log('Preparing submission for School:', { guard: guard?.name, photosCount: photosToUpload.length });

      const imageUrls: string[] = new Array(6).fill('');
      
      if (photosToUpload.length > 0) {
        setUploadProgress('Uploading images...');
        
        // Sequential upload
        let uploadedCount = 0;
        for (let i = 0; i < 6; i++) {
          if (images[i]) {
            try {
              console.log(`Uploading Image-${i + 1}...`);
              const url = await firebaseService.uploadImage(images[i]!, selectedGuard, (progress) => {
                setPhotoProgress(prev => {
                  const next = [...prev];
                  next[uploadedCount] = progress;
                  return next;
                });
              });
              imageUrls[i] = url;
              uploadedCount++;
            } catch (err) {
              console.error(`Failed to upload Image-${i + 1}:`, err);
            }
          }
        }
      }

      const photoUrls = imageUrls.filter(Boolean);
      console.log('Image upload process complete. Final URLs:', photoUrls);

      setUploadProgress('Saving patrol log...');
      const logPayload = {
        guardId: selectedGuard,
        guardName: guard?.name || '',
        checkpointId: round,
        checkpointName: round,
        siteName: selectedProject,
        image1Url: imageUrls[0] || null,
        image2Url: imageUrls[1] || null,
        image3Url: imageUrls[2] || null,
        image4Url: imageUrls[3] || null,
        image5Url: imageUrls[4] || null,
        image6Url: imageUrls[5] || null,
        photoUrls: photoUrls,
        status: 'Completed' as const,
        timestamp: new Date().toISOString(),
        round,
        notes: "",
        imageNames: imageNames.filter((n): n is string => n !== null)
      };

      console.log('Submitting log payload to Firestore:', logPayload);
      const logId = await firebaseService.submitPatrolLog(logPayload);
      console.log('Patrol log submitted successfully. ID:', logId);

      setSuccess(true);
      setError(null);
      setTimeout(() => {
        setSuccess(false);
        setUploadProgress('');
        setImages([null, null, null, null, null, null]);
        setImageNames([null, null, null, null, null, null]);
        setSelectedGuard('');
        setRound('Checkpoint 1');
      }, 3000);
    } catch (err) {
      console.error('Submission error:', err);
      let errorMessage = "Submission failed. Please check your internet connection and try again.";
      
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.error) {
            errorMessage = `Database Error: ${parsed.error}`;
          } else {
            errorMessage = err.message;
          }
        } catch {
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

  const formatTimestamp = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const strHours = String(displayHours).padStart(2, '0');
    return `${day}-${month}-${year} ${strHours}:${minutes} ${ampm}`;
  };

  const compressImage = (base64Str: string, addTimestamp: boolean = false): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1280; // Increased for better quality
        const MAX_HEIGHT = 1280;
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
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          
          if (addTimestamp) {
            const timestamp = formatTimestamp(new Date());
            ctx.font = 'bold 24px sans-serif'; // Larger font for higher resolution
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 4;
            const textWidth = ctx.measureText(timestamp).width;
            const x = width - textWidth - 30;
            const y = height - 30;
            ctx.strokeText(timestamp, x, y);
            ctx.fillText(timestamp, x, y);
          }
        }
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8); // Higher quality
        resolve(compressedBase64);
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      const fileName = file.name;
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64);
        setImages(prev => {
          const next = [...prev];
          next[index] = compressed;
          return next;
        });
        setImageNames(prev => {
          const next = [...prev];
          next[index] = fileName;
          return next;
        });
      };
      reader.readAsDataURL(file as Blob);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
        <p className="mt-4 text-text-secondary font-medium">Loading School data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto font-sans">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-text-primary mb-2">School Security Portal</h2>
        <p className="text-text-secondary">Official portal for School security personnel.</p>
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

              {/* Project Details */}
              <div className="bg-white p-6 rounded-3xl border border-border-custom shadow-sm">
                <label className="flex items-center gap-2 text-xs font-bold text-text-secondary mb-4 uppercase tracking-wider">
                  <Building2 className="w-4 h-4" /> Site Details
                </label>
                <div className="space-y-4">
                  <div className="p-4 bg-brand-light/30 border border-brand-primary/10 rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <Building2 className="w-5 h-5 text-brand-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest">Active Site</p>
                      <p className="text-sm font-bold text-text-primary">School</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Image Sections 1-6 */}
              <div className="grid grid-cols-1 gap-4">
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <div key={idx} className="bg-white p-4 rounded-2xl border border-border-custom shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <label className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-wider">
                        <Camera className="w-4 h-4" /> Checkpoint-{idx + 1} Image
                      </label>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCameraSection(idx);
                          setIsCameraOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 p-3 bg-page-bg border-2 border-dashed border-border-custom rounded-xl hover:bg-brand-light hover:border-brand-primary/30 transition-all group"
                      >
                        <Camera className="w-5 h-5 text-text-muted group-hover:text-brand-primary" />
                        <span className="text-xs font-bold text-text-secondary group-hover:text-brand-primary uppercase tracking-wider">Open Camera</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRefs[idx].current?.click()}
                        className="flex items-center justify-center gap-2 p-3 bg-page-bg border-2 border-dashed border-border-custom rounded-xl hover:bg-brand-light hover:border-brand-primary/30 transition-all group"
                      >
                        <Upload className="w-5 h-5 text-text-muted group-hover:text-brand-primary" />
                        <span className="text-xs font-bold text-text-secondary group-hover:text-brand-primary uppercase tracking-wider">Upload</span>
                        <input
                          ref={fileInputRefs[idx]}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, idx)}
                        />
                      </button>
                    </div>

                    {images[idx] && (
                      <div className="mt-2 flex items-center gap-2 p-2 bg-page-bg border border-border-custom rounded-xl relative group">
                        <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="w-4 h-4 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-text-primary truncate">{imageNames[idx]}</p>
                        </div>
                        
                        {!submitting && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveCameraSection(idx);
                                setIsCameraOpen(true);
                              }}
                              className="p-1 text-brand-primary hover:bg-brand-light rounded-md transition-colors"
                              title="Retake Photo"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setImages(prev => {
                                  const next = [...prev];
                                  next[idx] = null;
                                  return next;
                                });
                                setImageNames(prev => {
                                  const next = [...prev];
                                  next[idx] = null;
                                  return next;
                                });
                              }}
                              className="p-1 text-text-muted hover:text-status-red transition-colors"
                              title="Remove Photo"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Progress Overlay */}
                        {submitting && photoProgress[images.slice(0, idx).filter(p => p !== null).length] !== undefined && photoProgress[images.slice(0, idx).filter(p => p !== null).length] < 100 && (
                          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] rounded-xl flex items-center px-3">
                            <div className="flex-1 h-1 bg-page-bg rounded-full overflow-hidden">
                              <motion.div 
                                className="h-full bg-brand-primary"
                                initial={{ width: 0 }}
                                animate={{ width: `${photoProgress[images.slice(0, idx).filter(p => p !== null).length]}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {submitting && photoProgress[images.slice(0, idx).filter(p => p !== null).length] === 100 && (
                          <div className="absolute inset-0 bg-status-green/5 backdrop-blur-[1px] rounded-xl flex items-center justify-end px-3">
                            <CheckCircle2 className="w-3 h-3 text-status-green" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
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
                      Submit School Patrol Check
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
        onClose={() => {
          setIsCameraOpen(false);
          setActiveCameraSection(null);
        }}
        onCapture={async (imageData) => {
          const compressed = await compressImage(imageData, true);
          const timestamp = formatTimestamp(new Date());
          const fileName = `camera_capture_${timestamp.replace(/[: ]/g, '_')}.jpg`;
          if (activeCameraSection !== null) {
            setImages(prev => {
              const next = [...prev];
              next[activeCameraSection] = compressed;
              return next;
            });
            setImageNames(prev => {
              const next = [...prev];
              next[activeCameraSection] = fileName;
              return next;
            });
          }
        }}
      />
    </div>
  );
}
