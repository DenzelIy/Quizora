import { Router } from 'express';
import { ZodError } from 'zod';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import * as packService from '../services/packService.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

router.get(
  '/packs',
  asyncHandler(async (req, res) => {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    if (search) {
      const packs = packService.searchPacks(search, category);
      res.json(packs);
    } else {
      const packs = packService.getAllPacks(category);
      res.json(packs);
    }
  }),
);

router.post(
  '/packs/import',
  asyncHandler(async (req, res) => {
    try {
      const pack = packService.importPack(req.body);
      res.status(201).json(pack);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new AppError(400, `Invalid pack data: ${err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')}`);
      }
      throw err;
    }
  }),
);

router.post(
  '/packs/create',
  rateLimit(60_000, 10),
  asyncHandler(async (req, res) => {
    try {
      const pack = packService.createPack(req.body);
      res.status(201).json(pack);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new AppError(400, `Invalid pack data: ${err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')}`);
      }
      throw err;
    }
  }),
);

router.get(
  '/packs/:id/export',
  asyncHandler(async (req, res) => {
    const data = packService.exportPack(req.params.id);
    if (!data) throw new AppError(404, 'Pack not found');
    const filename = `${data.pack.slug}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(data);
  }),
);

router.put(
  '/packs/:id/update',
  asyncHandler(async (req, res) => {
    try {
      const pack = packService.updatePack(req.params.id, req.body);
      if (!pack) throw new AppError(404, 'Pack not found');
      res.json(pack);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new AppError(400, `Invalid pack data: ${err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')}`);
      }
      throw err;
    }
  }),
);

router.get(
  '/packs/:slug',
  asyncHandler(async (req, res) => {
    const pack = packService.getPackBySlug(req.params.slug);
    if (!pack) throw new AppError(404, 'Pack not found');
    res.json(pack);
  }),
);

router.post(
  '/packs/:id/import',
  asyncHandler(async (req, res) => {
    const { questionIds, quizId } = req.body;
    if (!Array.isArray(questionIds) || !quizId) {
      throw new AppError(400, 'questionIds array and quizId are required');
    }
    const result = packService.importPackQuestionsToQuiz(req.params.id, questionIds, quizId);
    res.json(result);
  }),
);

export default router;
