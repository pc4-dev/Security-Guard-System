export interface Guard {
  id: string;
  name: string;
  phone: string;
  site: string;
}

export interface Checkpoint {
  id: string;
  name: string;
  site: string;
  latitude: number;
  longitude: number;
}

export interface PatrolLog {
  id: string;
  guardId: string;
  guardName: string;
  checkpointId: string;
  checkpointName: string;
  siteName: string;
  image1Url?: string;
  image2Url?: string;
  image3Url?: string;
  image4Url?: string;
  image5Url?: string;
  image6Url?: string;
  photoUrls: string[]; // Keeping for backward compatibility
  gpsLocation?: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
  status: 'Completed' | 'Missed';
  round: string;
  notes?: string;
  imageNames?: string[];
}

export interface Incident {
  id: string;
  guardId: string;
  guardName: string;
  checkpointName: string;
  description: string;
  photoUrls: string[];
  priority: 'Low' | 'Medium' | 'High';
  timestamp: string;
}

export interface DashboardStats {
  totalGuardsOnDuty: number;
  totalCheckpoints: number;
  totalSubmissionsToday: number;
  missedCheckpoints: number;
  recentActivity: PatrolLog[];
}

export interface UploadedFile {
  id: string;
  fileName: string;
  fileSize: number;
  storagePath: string;
  notes: string;
  uploadDate: string;
  summary: string;
  downloadUrl: string;
}
