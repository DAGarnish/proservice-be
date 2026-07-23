import { Router } from 'express';
import { createContactSubmission } from '../controllers/contact.controller';

const router = Router();

// POST /api/v1/contact -> Creates a ContactSubmission DB row
router.post('/', createContactSubmission);

export default router;
