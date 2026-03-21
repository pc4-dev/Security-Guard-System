import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Send, CheckCircle2, Loader2, User, Building2, Camera, ClipboardCheck, Image as ImageIcon, Upload, X, RefreshCw, Check, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { firebaseService } from '../services/firebaseService';
import { Checkpoint, Guard } from '../types';
import { cn } from '../utils';
import CameraModal from './CameraModal';
import ImagePreviewModal from './ImagePreviewModal';

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
  const [isUploading, setIsUploading] = useState(false);
  const [showForceSubmit, setShowForceSubmit] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
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
  const [round, setRound] = useState('Checkpoint 1');
  const [images, setImages] = useState<(string | null)[]>(new Array(10).fill(null));
  const [imageNames, setImageNames] = useState<(string | null)[]>(new Array(10).fill(null));
  const [activeCameraSection, setActiveCameraSection] = useState<number | null>(null);

  const fileInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const projects = ["Regal Garden", "Garden City", "Nature Park", "OBC", "Milestone", "Hyde Park", "NG Grand", "School", "Tekanpur", "Other"];

  const getProjectImageCount = (project: string) => {
    switch (project) {
      case "Nature Park": return 9;
      case "Tekanpur": return 5;
      case "School": return 6;
      case "Regal Garden": return 10;
      case "Other": return 1;
      default: return 6;
    }
  };

  const imageCount = getProjectImageCount(selectedProject);

  const filteredCheckpoints = checkpoints.filter(c => !selectedProject || c.site === selectedProject);

  useEffect(() => {
    setImages(new Array(10).fill(null));
    setImageNames(new Array(10).fill(null));
    
    if (selectedProject) {
      const count = getProjectImageCount(selectedProject);
      if (count > 1) {
        setRound(`Checkpoint 1 - Checkpoint ${count}`);
      } else {
        setRound(`Checkpoint 1`);
      }
    } else {
      setRound('Checkpoint 1');
    }
  }, [selectedProject]);

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
    if (!selectedGuard || !selectedProject) {
      alert("Please fill all required fields.");
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

      console.log('Preparing submission for:', { guard: guard?.name, photosCount: photosToUpload.length });

      const imageUrls: string[] = new Array(10).fill('');
      
      if (photosToUpload.length > 0) {
        setUploadProgress('Uploading images...');
        
        // Sequential upload
        let uploadedCount = 0;
        for (let i = 0; i < imageCount; i++) {
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
        image7Url: imageUrls[6] || null,
        image8Url: imageUrls[7] || null,
        image9Url: imageUrls[8] || null,
        image10Url: imageUrls[9] || null,
        photoUrls: photoUrls,
        status: 'Completed' as const,
        timestamp: new Date().toISOString(),
        round,
        notes: "",
        imageNames: imageNames.slice(0, imageCount).filter((n): n is string => n !== null)
      };

      console.log('Submitting log payload to Firestore:', logPayload);
      const logId = await firebaseService.submitPatrolLog(logPayload);
      console.log('Patrol log submitted successfully. ID:', logId);

      setSuccess(true);
      setError(null);
      setTimeout(() => {
        setSuccess(false);
        setSelectedProject('');
        setSelectedGuard('');
        setRound('Checkpoint 1');
        setUploadProgress('');
        setImages(new Array(10).fill(null));
        setImageNames(new Array(10).fill(null));
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
        const MAX_WIDTH = 1280;
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
            ctx.font = 'bold 24px sans-serif';
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 4;
            const textWidth = ctx.measureText(timestamp).width;
            const x = width - textWidth - 20;
            const y = height - 20;
            ctx.strokeText(timestamp, x, y);
            ctx.fillText(timestamp, x, y);
          }
        }
        
        // Compress to JPEG with 0.8 quality for better visual fidelity
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
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
                    }}
                    className="w-full p-4 bg-page-bg border border-border-custom rounded-2xl focus:ring-2 focus:ring-brand-primary outline-none transition-all text-text-primary font-medium"
                    required
                  >
                    <option value="">Select Project Name</option>
                    {projects.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>

                  <div className="relative">
                    <select
                      value={round}
                      onChange={(e) => setRound(e.target.value)}
                      disabled={!!selectedProject}
                      className={cn(
                        "w-full p-4 bg-page-bg border border-border-custom rounded-2xl focus:ring-2 focus:ring-brand-primary outline-none transition-all text-text-primary font-medium",
                        selectedProject && "opacity-70 cursor-not-allowed bg-gray-50"
                      )}
                    >
                      {!selectedProject ? (
                        <>
                          <option>Checkpoint 1</option>
                          <option>Checkpoint 2</option>
                          <option>Checkpoint 3</option>
                          <option>Checkpoint 4</option>
                          <option>Checkpoint 5</option>
                          <option>Checkpoint 6</option>
                          <option>Checkpoint 7</option>
                          <option>Checkpoint 8</option>
                          <option>Checkpoint 9</option>
                          <option>Checkpoint 10</option>
                        </>
                      ) : (
                        <option value={round}>{round}</option>
                      )}
                    </select>
                    {selectedProject && (
                      <div className="absolute right-12 top-1/2 -translate-y-1/2">
                        <div className="px-2 py-1 bg-brand-light rounded-lg">
                          <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider">Fixed for {selectedProject}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Image Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: imageCount }).map((_, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-3xl border border-border-custom shadow-sm">
                    <label className="flex items-center gap-2 text-xs font-bold text-text-secondary mb-4 uppercase tracking-wider">
                      <Camera className="w-4 h-4" /> Image-{idx + 1}
                    </label>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCameraSection(idx);
                          setIsCameraOpen(true);
                        }}
                        className="flex flex-col items-center justify-center p-4 bg-page-bg border-2 border-dashed border-border-custom rounded-2xl hover:bg-brand-light hover:border-brand-primary/30 transition-all group"
                      >
                        <Camera className="w-6 h-6 text-text-muted group-hover:text-brand-primary mb-1" />
                        <span className="text-[10px] font-bold text-text-secondary group-hover:text-brand-primary uppercase tracking-wider">Live Camera</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRefs[idx].current?.click()}
                        className="flex flex-col items-center justify-center p-4 bg-page-bg border-2 border-dashed border-border-custom rounded-2xl hover:bg-brand-light hover:border-brand-primary/30 transition-all group"
                      >
                        <Upload className="w-6 h-6 text-text-muted group-hover:text-brand-primary mb-1" />
                        <span className="text-[10px] font-bold text-text-secondary group-hover:text-brand-primary uppercase tracking-wider">Upload</span>
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
                        <div 
                          className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer hover:ring-2 hover:ring-brand-primary transition-all shadow-sm"
                          onClick={() => {
                            setPreviewImage({ url: images[idx]!, name: imageNames[idx] || `Image ${idx + 1}` });
                            setIsPreviewOpen(true);
                          }}
                        >
                          <img 
                            src={images[idx]!} 
                            alt="Thumbnail" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-text-primary truncate">{imageNames[idx]}</p>
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewImage({ url: images[idx]!, name: imageNames[idx] || `Image ${idx + 1}` });
                              setIsPreviewOpen(true);
                            }}
                            className="text-[10px] font-bold text-brand-primary flex items-center gap-1 hover:underline"
                          >
                            <Eye className="w-3 h-3" /> View Preview
                          </button>
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

      <ImagePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        imageUrl={previewImage?.url || null}
        imageName={previewImage?.name || null}
      />
    </div>
  );
}
