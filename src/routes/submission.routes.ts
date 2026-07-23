import { Router } from 'express';
import { createSubmission, queueGeneration, getQueueStatus, triggerCronRecovery } from '../controllers/submission.controller';

const router = Router();

// POST /api/v1/submissions -> Creates the User + WebsiteSubmission DB rows
router.post('/', createSubmission);

// POST /api/v1/submissions/generate -> Queues generation task
router.post('/generate', queueGeneration);

// GET /api/v1/submissions/queue-status -> Gets active queue stats
router.get('/queue-status', getQueueStatus);

// POST /api/v1/submissions/cron-trigger -> Manually triggers recovery scan
router.post('/cron-trigger', triggerCronRecovery);

export default router;
