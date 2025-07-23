import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { setupSocketServer } from './socket/server';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import { performBackup } from './services/backup';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = setupSocketServer(server);

const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Get Supabase status (legacy)
    const { getDatabaseStatus } = await import('./config/database');
    const supabaseStatus = await getDatabaseStatus();
    
    // Get Firebase status if available
    let firebaseStatus = { connected: false, provider: 'Firebase', message: 'Not configured' };
    try {
      const { getFirebaseStatus, isFirebaseConfigured } = await import('./config/firebase');
      if (isFirebaseConfigured) {
        firebaseStatus = await getFirebaseStatus();
      }
    } catch (error) {
      console.error('Firebase status check error:', error);
    }
    
    res.status(200).json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      service: 'ScaenaHub API',
      databases: {
        legacy: supabaseStatus,
        firebase: firebaseStatus
      }
    });
  } catch (error) {
    res.status(200).json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      service: 'ScaenaHub API',
      databases: { 
        error: 'Failed to get database status'
      }
    });
  }
});

// Import routes
import authRoutes from './routes/auth';
import channelRoutes from './routes/channels';
import roleRoutes from './routes/roles';
import userRoutes from './routes/users';
import messageRoutes from './routes/messages';
import filesRoutes from './routes/files';
import scriptRoutes from './routes/script';
import backupRoutes from './routes/backup';

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/script', scriptRoutes);
app.use('/api/backup', backupRoutes);

// Catch-all for undefined API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Serve static files from React build (production only)
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
} else {
  // Development 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});


// Schedule backups
cron.schedule(process.env.BACKUP_SCHEDULE || '0 2 * * *', () => {
  console.log('Running scheduled backup...');
  performBackup();
});

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, async () => {
    console.log(`🚀 ScaenaHub server running on port ${PORT}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Test database connections
    try {
      // Test Supabase connection (legacy)
      const { testDatabaseConnection } = await import('./config/database');
      const isSupabaseConnected = await testDatabaseConnection();
      
      if (isSupabaseConnected) {
        console.log('✅ Legacy database (Supabase) connected successfully');
      } else {
        console.log('⚠️  Legacy database connection failed - check Supabase configuration');
      }
    } catch (error) {
      console.error('❌ Database connection error:', error);
    }
  });
}

export { app, io, server };