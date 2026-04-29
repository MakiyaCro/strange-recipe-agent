import { Router } from 'express';
import { query } from 'express-validator';
import { validationResult } from 'express-validator';
import fs from 'fs';
import path from 'path';
import os from 'os';

const router = Router();

// Return filesystem roots: drives on Windows, home+root on Unix
router.get('/roots', (_req, res) => {
  if (process.platform === 'win32') {
    const drives = [];
    for (let c = 67; c <= 90; c++) {           // C → Z
      const drive = `${String.fromCharCode(c)}:\\`;
      try { fs.accessSync(drive); drives.push(drive); } catch { /* not mounted */ }
    }
    return res.json({ roots: drives, sep: '\\' });
  }
  res.json({ roots: [os.homedir(), '/'], sep: '/' });
});

// List subdirectories at a given path
router.get('/list', [
  query('path')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('path is required')
    .isLength({ max: 500 })
    .withMessage('path too long'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  // Resolve to an absolute path — prevents traversal tricks
  const resolved = path.resolve(req.query.path);

  let entries;
  try {
    entries = fs.readdirSync(resolved, { withFileTypes: true });
  } catch (err) {
    return res.status(400).json({ error: `Cannot read folder: ${err.code ?? err.message}` });
  }

  const dirs = entries
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => ({ name: e.name, fullPath: path.join(resolved, e.name) }))
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  const parentResolved = path.dirname(resolved);
  const parent = parentResolved !== resolved ? parentResolved : null;

  res.json({ path: resolved, parent, dirs });
});

export default router;
