import { Router } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { rateLimit } from '../middleware/rateLimit.js';
import * as quizService from '../services/quizService.js';
import * as sessionService from '../services/sessionService.js';
import { getLanAddresses } from '../utils/network.js';

const router = Router();

router.get(
  '/quizzes',
  asyncHandler(async (_req, res) => {
    const quizzes = quizService.getAllQuizzes();
    res.json(quizzes);
  }),
);

router.get(
  '/quizzes/:id',
  asyncHandler(async (req, res) => {
    const quiz = quizService.getQuizById(req.params.id);
    if (!quiz) throw new AppError(404, 'Quiz not found');
    res.json(quiz);
  }),
);

router.post(
  '/quizzes',
  rateLimit(60_000, 30),
  asyncHandler(async (req, res) => {
    const quiz = quizService.createQuiz(req.body);
    res.status(201).json(quiz);
  }),
);

router.put(
  '/quizzes/:id',
  asyncHandler(async (req, res) => {
    const quiz = quizService.updateQuiz(req.params.id, req.body);
    if (!quiz) throw new AppError(404, 'Quiz not found');
    res.json(quiz);
  }),
);

router.delete(
  '/quizzes/:id',
  asyncHandler(async (req, res) => {
    const deleted = quizService.deleteQuiz(req.params.id);
    if (!deleted) throw new AppError(404, 'Quiz not found');
    res.json({ success: true });
  }),
);

router.post(
  '/quizzes/:id/duplicate',
  rateLimit(60_000, 10),
  asyncHandler(async (req, res) => {
    const quiz = quizService.duplicateQuiz(req.params.id);
    if (!quiz) throw new AppError(404, 'Quiz not found');
    res.status(201).json(quiz);
  }),
);

router.post(
  '/quizzes/:id/questions',
  asyncHandler(async (req, res) => {
    const question = quizService.createQuestion(req.params.id, req.body);
    res.status(201).json(question);
  }),
);

router.put(
  '/questions/:id',
  asyncHandler(async (req, res) => {
    quizService.updateQuestion(req.params.id, req.body);
    res.json({ success: true });
  }),
);

router.delete(
  '/questions/:id',
  asyncHandler(async (req, res) => {
    const deleted = quizService.deleteQuestion(req.params.id);
    if (!deleted) throw new AppError(404, 'Question not found');
    res.json({ success: true });
  }),
);

router.put(
  '/quizzes/:id/questions/reorder',
  asyncHandler(async (req, res) => {
    const { questionIds } = req.body;
    if (!Array.isArray(questionIds)) throw new AppError(400, 'questionIds must be an array');
    quizService.reorderQuestions(req.params.id, questionIds);
    res.json({ success: true });
  }),
);

router.get(
  '/sessions',
  asyncHandler(async (_req, res) => {
    res.json(sessionService.getSessionSummaries());
  }),
);

router.get(
  '/sessions/:id/results',
  asyncHandler(async (req, res) => {
    const results = sessionService.getSessionResults(req.params.id);
    if (!results) throw new AppError(404, 'Session not found');
    res.json(results);
  }),
);

router.get(
  '/sessions/:id/export',
  asyncHandler(async (req, res) => {
    const csv = sessionService.exportSessionCSV(req.params.id);
    if (!csv) throw new AppError(404, 'Session not found');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="session-${req.params.id}.csv"`);
    res.send(csv);
  }),
);

router.get(
  '/network-info',
  asyncHandler(async (_req, res) => {
    const backendPort = parseInt(process.env.PORT ?? '3001', 10);
    const frontendPort = parseInt(process.env.FRONTEND_PORT ?? String(backendPort), 10);
    const interfaces = getLanAddresses();
    res.json({ port: frontendPort, interfaces });
  }),
);

export default router;
