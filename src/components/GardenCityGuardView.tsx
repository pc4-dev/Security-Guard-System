import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Send, CheckCircle2, Loader2, User, Building2, Camera, ClipboardCheck, Image as ImageIcon, Upload, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { firebaseService } from '../services/firebaseService';
import { Checkpoint, Guard } from '../types';
import { cn } from '../utils';
import CameraModal from './CameraModal';

export default function GardenCityGuardView() {
  const [guards, setGuards] = useState<Guard[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Form State
  const [selectedGuard, setSelectedGuard] = useState('');
  const [round, setRound] = useState('Checkpoint 1');
  const [images, setImages] = useState<(string | null)[]>(new Array(6).fill(null));
  const [imageNames, setImageNames] = useState<(string | null)[]>(new Array(6).fill(null));
  const [activeCameraSection, setActiveCameraSection] = useState<number | null>(null);

  const fileInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];
  
  const selectedProject = "Garden City";
  const filteredCheckpoints = checkpoints.filter(c => c.site === selectedProject);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [g, c] = await Promise.all([
          firebaseService.getGuards(),
          firebaseService.getCheckpoints()
        ]);
        // Filter guards by Garden City if possible, or just show all
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
      alert("Please fill all required fields.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setUploadProgress('Submitting...');
    
    try {
      const guard = guards.find(g => g.id === selectedGuard);

      setUploadProgress('Saving patrol log...');
      const logPayload = {
        guardId: selectedGuard,
        guardName: guard?.name || '',
        checkpointId: round, // Using round (Checkpoint X) as checkpointId
        checkpointName: round, // Using round (Checkpoint X) as checkpointName
        siteName: selectedProject,
        image1Url: images[0] || '',
        image2Url: images[1] || '',
        image3Url: images[2] || '',
        image4Url: images[3] || '',
        image5Url: images[4] || '',
        image6Url: images[5] || '',
        photoUrls: images.filter((url): url is string => !!url),
        status: 'Completed' as const,
        timestamp: new Date().toISOString(),
        round,
        notes: "",
        imageNames: imageNames.filter((n): n is string => n !== null)
      };

      await firebaseService.submitPatrolLog(logPayload);

      setSuccess(true);
      setError(null);
      setTimeout(() => {
        setSuccess(false);
        setUploadProgress('');
        setImages(new Array(6).fill(null));
      }, 3000);
    } catch (err) {
      console.error('Submission error:', err);
      let errorMessage = "Submission failed. Please check your internet connection and try again.";
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          errorMessage = parsed.error || err.message;
        } catch {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
    } finally {
      setSubmitting(false);
      setUploadProgress('');
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
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
        resolve(compressedBase64);
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (!selectedGuard) {
      alert("Please select your name first.");
      return;
    }
    const files = e.target.files;
    if (files && files[0]) {
      setIsUploading(true);
      setActiveCameraSection(index);
      const file = files[0];
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        const compressed = await compressImage(base64);
        const url = await firebaseService.uploadImage(compressed, selectedGuard);
        const newImages = [...images];
        newImages[index] = url;
        setImages(newImages);
        const newNames = [...imageNames];
        newNames[index] = file.name;
        setImageNames(newNames);
      } catch (err) {
        console.error("Upload failed", err);
        const message = err instanceof Error ? err.message : "Image failed to upload.";
        alert(`${message} Please try again.`);
      } finally {
        setIsUploading(false);
        setActiveCameraSection(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
        <p className="mt-4 text-text-secondary font-medium">Loading Garden City data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto font-sans">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-text-primary mb-2">Garden City Portal</h2>
        <p className="text-text-secondary">Dedicated patrol portal for Garden City security team.</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key="patrol"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
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

            {/* Checkpoint Selection */}
            <div className="bg-white p-6 rounded-3xl border border-border-custom shadow-sm">
              <label className="flex items-center gap-2 text-xs font-bold text-text-secondary mb-4 uppercase tracking-wider">
                <Building2 className="w-4 h-4" /> Checkpoint Details
              </label>
              <div className="space-y-4">
                <div className="p-4 bg-brand-light/30 border border-brand-primary/10 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <Building2 className="w-5 h-5 text-brand-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest">Active Site</p>
                    <p className="text-sm font-bold text-text-primary">Garden City</p>
                  </div>
                </div>

                <select
                  value={round}
                  onChange={(e) => setRound(e.target.value)}
                  className="w-full p-4 bg-page-bg border border-border-custom rounded-2xl focus:ring-2 focus:ring-brand-primary outline-none transition-all text-text-primary font-medium"
                >
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
                </select>
              </div>
            </div>

            {/* Image Sections */}
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div key={index} className="bg-white p-6 rounded-3xl border border-border-custom shadow-sm">
                <label className="flex items-center gap-2 text-xs font-bold text-text-secondary mb-4 uppercase tracking-wider">
                  <Camera className="w-4 h-4" /> Image-{index + 1}
                </label>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => {
                      setActiveCameraSection(index);
                      setIsCameraOpen(true);
                    }}
                    className="flex flex-col items-center justify-center p-4 bg-page-bg border-2 border-dashed border-border-custom rounded-2xl hover:bg-brand-light hover:border-brand-primary/30 transition-all group disabled:opacity-50"
                  >
                    {isUploading && activeCameraSection === index ? <Loader2 className="w-6 h-6 animate-spin text-brand-primary mb-1" /> : <Camera className="w-6 h-6 text-text-muted group-hover:text-brand-primary mb-1" />}
                    <span className="text-[10px] font-bold text-text-secondary group-hover:text-brand-primary uppercase tracking-wider">{isUploading && activeCameraSection === index ? 'Uploading...' : 'Live Camera'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRefs[index].current?.click()}
                    className="flex flex-col items-center justify-center p-4 bg-page-bg border-2 border-dashed border-border-custom rounded-2xl hover:bg-brand-light hover:border-brand-primary/30 transition-all group disabled:opacity-50"
                  >
                    {isUploading && activeCameraSection === index ? <Loader2 className="w-6 h-6 animate-spin text-brand-primary mb-1" /> : <Upload className="w-6 h-6 text-text-muted group-hover:text-brand-primary mb-1" />}
                    <span className="text-[10px] font-bold text-text-secondary group-hover:text-brand-primary uppercase tracking-wider">{isUploading && activeCameraSection === index ? 'Uploading...' : 'Upload'}</span>
                    <input
                      ref={fileInputRefs[index]}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, index)}
                    />
                  </button>
                </div>

                {images[index] && (
                  <div className="relative rounded-xl overflow-hidden aspect-video border border-border-custom bg-page-bg">
                    <img src={images[index]!} alt={`Image-${index + 1}`} className="w-full h-full object-contain" />
                    {!submitting && (
                      <button
                        type="button"
                        onClick={() => {
                          const newImages = [...images];
                          newImages[index] = null;
                          setImages(newImages);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full backdrop-blur-md hover:bg-black/70 transition-all shadow-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

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
              </motion.div>
            )}

            {/* Submit Button */}
            <div className="space-y-4">
              <button
                type="submit"
                disabled={submitting || success || isUploading}
                className={cn(
                  "w-full py-5 rounded-2xl font-bold text-lg shadow-lg transition-all flex flex-col items-center justify-center gap-1",
                  "bg-brand-primary hover:bg-brand-primary/90 text-white shadow-brand-primary/20",
                  (submitting || success || isUploading) && "opacity-70 cursor-not-allowed"
                )}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-xs font-medium opacity-80">{uploadProgress}</span>
                  </>
                ) : isUploading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-xs font-medium opacity-80">Uploading Images...</span>
                  </>
                ) : success ? (
                  <>
                    <CheckCircle2 className="w-6 h-6" />
                    Submitted Successfully
                  </>
                ) : (
                  <>
                    <Send className="w-6 h-6" />
                    Submit Garden City Check
                  </>
                )}
              </button>
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
          if (!selectedGuard) {
            alert("Please select your name first.");
            return;
          }
          if (activeCameraSection === null) return;
          
          setIsUploading(true);
          try {
            const compressed = await compressImage(imageData);
            const url = await firebaseService.uploadImage(compressed, selectedGuard);
            const newImages = [...images];
            newImages[activeCameraSection] = url;
            setImages(newImages);
            const newNames = [...imageNames];
            newNames[activeCameraSection] = `camera_capture_${new Date().getTime()}.jpg`;
            setImageNames(newNames);
          } catch (err) {
            console.error("Capture upload failed", err);
            alert("Failed to upload captured image.");
          } finally {
            setIsUploading(false);
          }
        }}
      />
    </div>
  );
}
