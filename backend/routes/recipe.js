import { Router } from 'express';
import { validateRecipeInput } from '../middleware/security.js';
import { generateRawConcept, formatToStandardRecipe } from '../services/ollama.js';

const router = Router();

router.post('/generate', validateRecipeInput, async (req, res) => {
  const { ingredients, location, idea = '', avoidIngredients = [] } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Throttle progress events — send at most every 120 ms to avoid flooding SSE
  let lastProgressSend = 0;
  const makeProgressHandler = (step) => ({ tokens, tps, done }) => {
    const now = Date.now();
    if (done || now - lastProgressSend >= 120) {
      lastProgressSend = now;
      send('progress', { step, tokens, tps: parseFloat(tps.toFixed(1)), done });
    }
  };

  try {
    send('status', { step: 1, message: 'Generating fusion recipe concept...' });
    const rawConcept = await generateRawConcept(
      ingredients, location, idea, avoidIngredients,
      makeProgressHandler(1)
    );

    send('status', { step: 2, message: 'Formatting to standard recipe layout...' });
    const formatted = await formatToStandardRecipe(
      rawConcept, location, avoidIngredients,
      makeProgressHandler(2)
    );

    send('complete', { rawConcept, recipe: formatted });
  } catch (err) {
    console.error('[Recipe Route]', err.message);
    send('error', { error: err.message });
  } finally {
    res.end();
  }
});

export default router;
