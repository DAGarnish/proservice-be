import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';

const app: Application = express();

// Security Middlewares
app.use(helmet());

const allowedOrigins = config.clientUrl.split(',').map((url) => url.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like server-to-server Vercel API fetch, mobile apps, curl)
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Logging Middleware
app.use(morgan('dev'));

// Body Parsing Middleware
// Default Express limit is 100kb, which is too small for submissions that
// carry embedded base64 image data (logo/hero/gallery photos).
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// API Routes
app.use('/api/v1', routes);

// Base Route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Proservice Express API',
    docs: '/api/v1/health',
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;
