import { PatrolLog, Incident, DashboardStats, Guard, Checkpoint } from './types';

const API_BASE = '/api';

export const api = {
  getGuards: async (): Promise<Guard[]> => {
    const res = await fetch(`${API_BASE}/guards`);
    return res.json();
  },
  getCheckpoints: async (): Promise<Checkpoint[]> => {
    const res = await fetch(`${API_BASE}/checkpoints`);
    return res.json();
  },
  getPatrolLogs: async (): Promise<PatrolLog[]> => {
    const res = await fetch(`${API_BASE}/patrol-logs`);
    return res.json();
  },
  submitPatrolLog: async (log: Partial<PatrolLog>): Promise<PatrolLog> => {
    const res = await fetch(`${API_BASE}/patrol-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
    });
    return res.json();
  },
  submitIncident: async (incident: Partial<Incident>): Promise<Incident> => {
    const res = await fetch(`${API_BASE}/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(incident),
    });
    return res.json();
  },
  getDashboardStats: async (): Promise<DashboardStats> => {
    const res = await fetch(`${API_BASE}/dashboard-stats`);
    return res.json();
  },
};
