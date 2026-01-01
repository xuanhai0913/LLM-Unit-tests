import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

/**
 * Scan uploaded files and return file list
 * POST /api/scan/files
 */
router.post('/files', optionalAuth, upload.array('files', 100), async (req, res) => {
    try {
        const files = req.files || [];

        if (files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const scannedFiles = [];
        const supportedExtensions = ['.py', '.js', '.ts', '.jsx', '.tsx'];

        for (const file of files) {
            const ext = path.extname(file.originalname).toLowerCase();

            // Skip non-code files
            if (!supportedExtensions.includes(ext)) continue;

            // Skip test files and node_modules
            if (file.originalname.includes('test') ||
                file.originalname.includes('spec') ||
                file.originalname.includes('node_modules') ||
                file.originalname.includes('__pycache__')) {
                continue;
            }

            const content = file.buffer.toString('utf-8');
            const lines = content.split('\n').length;

            scannedFiles.push({
                name: file.originalname,
                path: file.originalname,
                content: content,
                lines: lines,
                language: getLanguage(ext),
                size: file.size
            });
        }

        // Sort by name
        scannedFiles.sort((a, b) => a.name.localeCompare(b.name));

        res.json({
            success: true,
            data: {
                files: scannedFiles,
                totalFiles: scannedFiles.length,
                totalLines: scannedFiles.reduce((sum, f) => sum + f.lines, 0)
            }
        });

    } catch (error) {
        console.error('Scan error:', error);
        res.status(500).json({ error: 'Failed to scan files' });
    }
});

/**
 * Scan from GitHub URL
 * POST /api/scan/github
 */
router.post('/github', optionalAuth, async (req, res) => {
    try {
        const { url, branch = 'main' } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'GitHub URL is required' });
        }

        // Extract owner and repo from URL
        const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) {
            return res.status(400).json({ error: 'Invalid GitHub URL format' });
        }

        const [, owner, repo] = match;
        const repoName = repo.replace('.git', '');

        // Use GitHub API to get file tree
        const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/git/trees/${branch}?recursive=1`;

        const response = await fetch(apiUrl, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'LLM-Unit-Tests'
            }
        });

        if (!response.ok) {
            return res.status(400).json({
                error: 'Failed to fetch repository. Make sure it exists and is public.'
            });
        }

        const data = await response.json();
        const supportedExtensions = ['.py', '.js', '.ts', '.jsx', '.tsx'];

        const scannedFiles = [];

        for (const item of data.tree || []) {
            if (item.type !== 'blob') continue;

            const ext = path.extname(item.path).toLowerCase();
            if (!supportedExtensions.includes(ext)) continue;

            // Skip test files and common excluded dirs
            if (item.path.includes('test') ||
                item.path.includes('spec') ||
                item.path.includes('node_modules') ||
                item.path.includes('__pycache__') ||
                item.path.includes('.git')) {
                continue;
            }

            scannedFiles.push({
                name: path.basename(item.path),
                path: item.path,
                sha: item.sha,
                url: item.url,
                size: item.size,
                // Estimate lines (avg 30 chars per line)
                estimatedLines: item.size ? Math.ceil(item.size / 30) : 0,
                language: getLanguage(ext)
            });
        }

        res.json({
            success: true,
            data: {
                repoName: `${owner}/${repoName}`,
                branch,
                files: scannedFiles,
                totalFiles: scannedFiles.length
            }
        });

    } catch (error) {
        console.error('GitHub scan error:', error);
        res.status(500).json({ error: 'Failed to scan GitHub repository' });
    }
});

/**
 * Fetch file content from GitHub
 * POST /api/scan/github/content
 */
router.post('/github/content', optionalAuth, async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'File URL is required' });
        }

        const response = await fetch(url, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'LLM-Unit-Tests'
            }
        });

        if (!response.ok) {
            return res.status(400).json({ error: 'Failed to fetch file content' });
        }

        const data = await response.json();
        const content = Buffer.from(data.content, 'base64').toString('utf-8');

        res.json({
            success: true,
            data: {
                content,
                lines: content.split('\n').length
            }
        });

    } catch (error) {
        console.error('Fetch content error:', error);
        res.status(500).json({ error: 'Failed to fetch file content' });
    }
});

function getLanguage(ext) {
    const langMap = {
        '.py': 'python',
        '.js': 'javascript',
        '.ts': 'typescript',
        '.jsx': 'javascript',
        '.tsx': 'typescript'
    };
    return langMap[ext] || 'javascript';
}

export default router;
