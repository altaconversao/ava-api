import express from 'express';
import { handleOpenAI } from '../services/openaiService.js';

const router = express.Router();

router.post('/chat', handleOpenAI);

export default router;
