import { Router } from 'express';
import { checkHealth } from '../controllers/health.controller';
import submissionRoutes from './submission.routes';

const router = Router();

// Health Check Route
router.get('/health', checkHealth);

// Website Submissions Generation & Queue Routes
router.use('/submissions', submissionRoutes);

export default router;
