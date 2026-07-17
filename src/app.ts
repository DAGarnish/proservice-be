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
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);

// Logging Middleware
app.use(morgan('dev'));

// Body Parsing Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
