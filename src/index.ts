import app from './app';
import { config } from './config/env';
import { startRecoveryCronJob } from './services/cron.service';

const startServer = () => {
  try {
    const server = app.listen(config.port, () => {
      console.log(`\n==================================================`);
      console.log(`🚀 Proservice Express API Server Running`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
      console.log(`🔗 URL: http://localhost:${config.port}`);
      console.log(`✅ Health Check: http://localhost:${config.port}/api/v1/health`);
      console.log(`==================================================\n`);

      // Initialize automated 10-minute recovery cron job
      startRecoveryCronJob();
    });

    // Graceful Shutdown
    process.on('SIGINT', () => {
      console.log('\n[SIGINT] Shutting down server...');
      server.close(() => {
        console.log('Server successfully closed.');
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      console.log('\n[SIGTERM] Shutting down server...');
      server.close(() => {
        console.log('Server successfully closed.');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
