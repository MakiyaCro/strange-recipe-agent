import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import path from 'path';
import fs from 'fs';
import { generatePDF } from '../services/pdfService.js';

const router = Router();

const recipeBodyValidator = body('recipe')
  .isString()
  .trim()
  .isLength({ min: 10, max: 12000 })
  .withMessage('Invalid recipe content.');

// Stream PDF back to browser (browser download)
router.post('/download', [recipeBodyValidator], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  try {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="recipe.pdf"');
    await generatePDF(req.body.recipe, res);
  } catch (err) {
    console.error('[PDF Download]', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to generate PDF.' });
  }
});

// Save PDF to a local folder on the server machine
router.post('/save', [
  recipeBodyValidator,
  body('folderPath')
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Folder path is required.')
    .custom(val => {
      // Accept Windows absolute paths (C:\...) or Unix absolute paths (/...)
      return /^[a-zA-Z]:[\\\/]/.test(val) || val.startsWith('/');
    })
    .withMessage('Must be a valid absolute folder path (e.g. C:\\Users\\You\\Documents).'),
  body('filename')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Filename is required.')
    .matches(/^[a-zA-Z0-9 \-_]+$/)
    .withMessage('Filename may only contain letters, numbers, spaces, hyphens, and underscores.'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { recipe, folderPath, filename } = req.body;

  if (!fs.existsSync(folderPath)) {
    return res.status(400).json({ error: `Folder does not exist: ${folderPath}` });
  }

  const stats = fs.statSync(folderPath);
  if (!stats.isDirectory()) {
    return res.status(400).json({ error: 'The specified path is not a folder.' });
  }

  try {
    const safeName = filename.replace(/[^a-zA-Z0-9 \-_]/g, '').trim() || 'recipe';
    const filePath = path.join(folderPath, `${safeName}.pdf`);
    await generatePDF(recipe, filePath);
    res.json({ success: true, savedTo: filePath });
  } catch (err) {
    console.error('[PDF Save]', err.message);
    res.status(500).json({ error: 'Failed to save PDF. Check folder permissions.' });
  }
});

export default router;
