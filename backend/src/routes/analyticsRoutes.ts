import { Router } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { rateLimit } from '../middleware/rateLimit.js';
import * as analyticsService from '../services/analyticsService.js';

const router = Router();

router.post(
  '/analytics/completions',
  rateLimit(60_000, 60),
  asyncHandler(async (req, res) => {
    const { packId, playerName, mode, score, totalPoints, correctAnswers, totalQuestions, timeTakenSeconds, details } = req.body;
    if (!packId || !playerName || !mode) {
      throw new AppError(400, 'packId, playerName, and mode are required');
    }
    const validModes = ['practice', 'exam', 'griot'];
    if (!validModes.includes(mode)) {
      throw new AppError(400, `mode must be one of: ${validModes.join(', ')}`);
    }
    const result = analyticsService.recordCompletion({
      packId,
      playerName: String(playerName).slice(0, 50),
      mode,
      score: Number(score) || 0,
      totalPoints: Number(totalPoints) || 0,
      correctAnswers: Number(correctAnswers) || 0,
      totalQuestions: Number(totalQuestions) || 0,
      timeTakenSeconds: timeTakenSeconds != null ? Number(timeTakenSeconds) : undefined,
      details: details != null ? (typeof details === 'string' ? details : JSON.stringify(details)) : undefined,
    });
    res.status(201).json(result);
  }),
);

router.get(
  '/analytics/player/:name',
  asyncHandler(async (req, res) => {
    const name = decodeURIComponent(req.params.name);
    if (!name) throw new AppError(400, 'Player name is required');
    const stats = analyticsService.getPlayerStats(name);
    res.json(stats);
  }),
);

router.get(
  '/analytics/leaderboard/:packId',
  asyncHandler(async (req, res) => {
    const leaderboard = analyticsService.getPackLeaderboard(req.params.packId);
    res.json(leaderboard);
  }),
);

export default router;
