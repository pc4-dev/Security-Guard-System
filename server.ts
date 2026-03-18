import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import session from "express-session";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

declare module 'express-session' {
  interface SessionData {
    tokens: any;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cookieParser());
  app.use(session({
    secret: process.env.SESSION_SECRET || 'neoteric-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { 
      secure: true, 
      sameSite: 'none',
      httpOnly: true
    }
  }));

  app.use(express.json({ limit: '50mb' }));

  // Mock Database
  let guards = [
    { id: "G001", name: "Ramesh Kumar", phone: "9876543210", site: "Regal Garden" },
    { id: "G002", name: "Suresh Singh", phone: "9123456789", site: "Garden City" },
  ];

  const sites = ["Regal Garden", "Garden City", "Nature Park", "OBC", "Milestone", "Hyde Park", "NG Grand"];

  let checkpoints = Array.from({ length: 145 }, (_, i) => ({
    id: `CP${String(i + 1).padStart(3, '0')}`,
    name: `Checkpoint ${i + 1}`,
    site: sites[i % sites.length],
    latitude: 26.2183 + (Math.random() - 0.5) * 0.05, // Gwalior Lat
    longitude: 78.1828 + (Math.random() - 0.5) * 0.05, // Gwalior Lng
  }));

  let patrolLogs: any[] = [];
  let incidents: any[] = [];

  // API Routes
  app.get("/api/guards", (req, res) => res.json(guards));
  app.get("/api/checkpoints", (req, res) => res.json(checkpoints));
  
  app.get("/api/patrol-logs", (req, res) => {
    // Logic to calculate missed checkpoints could go here
    res.json(patrolLogs);
  });

  app.post("/api/patrol-logs", (req, res) => {
    const log = {
      id: Date.now().toString(),
      ...req.body,
      timestamp: new Date().toISOString(),
      status: "Completed"
    };
    patrolLogs.push(log);
    res.status(201).json(log);
  });

  app.post("/api/incidents", (req, res) => {
    const incident = {
      id: Date.now().toString(),
      ...req.body,
      timestamp: new Date().toISOString()
    };
    incidents.push(incident);
    res.status(201).json(incident);
  });

  app.get("/api/dashboard-stats", (req, res) => {
    const today = new Date().toDateString();
    const todayLogs = patrolLogs.filter(log => new Date(log.timestamp).toDateString() === today);
    
    res.json({
      totalGuardsOnDuty: guards.length,
      totalCheckpoints: checkpoints.length,
      totalSubmissionsToday: todayLogs.length,
      missedCheckpoints: 0, // In a real app, this would be calculated based on schedules
      recentActivity: todayLogs.slice(-5).reverse()
    });
  });

  // Google OAuth Routes
  app.get("/api/auth/google/url", (req, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'],
      prompt: 'consent'
    });
    res.json({ url });
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      req.session.tokens = tokens;
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Error getting tokens:', error);
      res.status(500).send('Authentication failed');
    }
  });

  app.get("/api/auth/google/status", (req, res) => {
    res.json({ isAuthenticated: !!req.session.tokens });
  });

  app.post("/api/export/google-sheets", async (req, res) => {
    const tokens = req.session.tokens;
    if (!tokens) {
      return res.status(401).json({ error: 'Not authenticated with Google' });
    }

    oauth2Client.setCredentials(tokens);
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    try {
      // Create a new spreadsheet
      const spreadsheet = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: `Patrol Report - ${new Date().toLocaleDateString()}`
          }
        }
      });

      const spreadsheetId = spreadsheet.data.spreadsheetId;

      // Prepare data
      const header = ['Guard Name', 'Guard ID', 'Checkpoint', 'Site', 'Timestamp', 'Status', 'Location'];
      const rows = patrolLogs.map(log => [
        log.guardName,
        log.guardId,
        log.checkpointName,
        log.siteName,
        log.timestamp,
        log.status,
        `${log.gpsLocation.latitude}, ${log.gpsLocation.longitude}`
      ]);

      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId!,
        range: 'Sheet1!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [header, ...rows]
        }
      });

      res.json({ url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` });
    } catch (error) {
      console.error('Error exporting to Google Sheets:', error);
      res.status(500).json({ error: 'Export failed' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
