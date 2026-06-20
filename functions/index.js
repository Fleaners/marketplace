import * as functions from 'firebase-functions';
import { initializeApp } from 'firebase-admin/app';
import express from 'express';
import cors from 'cors';

// Initialize Firebase Admin SDK
initializeApp();

// Create Express app
const app = express();

// Middleware
app.use(cors({ origin: ['https://fleaners.github.io', 'http://localhost:3000', 'http://localhost:5173'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/status', (req, res) => {
  res.json({ 
    message: 'MarketPlace.Store backend is running on Firebase',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// Import routes
import authRoutes from './routes/auth.js';
import businessRoutes from './routes/business.js';
import productRoutes from './routes/products.js';
import postRoutes from './routes/posts.js';
import invoiceRoutes from './routes/invoices.js';
import aiRoutes from './routes/ai.js';

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/products', productRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/ai', aiRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Export as Cloud Function
export const api = functions
  .runWith({
    serviceAccount: 'marketplace-store-fef91@appspot.gserviceaccount.com',
  })
  .region('us-central1')
  .https.onRequest(app);
