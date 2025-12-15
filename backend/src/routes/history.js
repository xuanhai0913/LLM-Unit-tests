import express from 'express';
import { Generation } from '../models/index.js';

const router = express.Router();

/**
 * GET /api/history
 * Get all generation history
 * 
 * @query {number} [limit] - Max number of items (default: 50)
 * @query {number} [offset] - Offset for pagination (default: 0)
 */
router.get('/', async (req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const offset = parseInt(req.query.offset) || 0;

        const { count, rows } = await Generation.findAndCountAll({
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            attributes: ['id', 'framework', 'language', 'generationTime', 'isValid', 'createdAt'],
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                total: count,
                limit,
                offset,
                hasMore: offset + rows.length < count,
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/history/:id
 * Get specific generation by ID
 */
router.get('/:id', async (req, res, next) => {
    try {
        const generation = await Generation.findByPk(req.params.id);

        if (!generation) {
            return res.status(404).json({
                error: 'Generation not found',
            });
        }

        res.json({
            success: true,
            data: generation,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/history/:id
 * Delete specific generation
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const generation = await Generation.findByPk(req.params.id);

        if (!generation) {
            return res.status(404).json({
                error: 'Generation not found',
            });
        }

        await generation.destroy();

        res.json({
            success: true,
            message: 'Generation deleted successfully',
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/history
 * Clear all history
 */
router.delete('/', async (req, res, next) => {
    try {
        const count = await Generation.destroy({ where: {} });

        res.json({
            success: true,
            message: `Deleted ${count} generations`,
        });
    } catch (error) {
        next(error);
    }
});

export default router;
