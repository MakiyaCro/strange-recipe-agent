import { config } from '../config.js';

const TIMEOUT_MS  = 180_000;
const MAX_PREDICT = 1500;

function stripThinkingTags(text) {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

/**
 * Stream a single Ollama chat call.
 * Calls onProgress({ tokens, tps, done }) for each received chunk.
 * Returns the full assembled text.
 */
async function callOllamaStream(systemPrompt, userPrompt, onProgress) {
  let response;
  try {
    response = await fetch(`${config.ollamaBaseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.ollamaModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt  },
        ],
        stream: true,
        think: false,
        options: {
          temperature: 0.8,
          top_p: 0.9,
          num_predict: MAX_PREDICT,
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (err.name === 'TimeoutError') {
      throw new Error('Ollama request timed out. The model may still be loading — try again in a moment.');
    }
    throw new Error(
      'Cannot connect to Ollama. Make sure Ollama is running and the model is installed.\n' +
      `Run: ollama pull ${config.ollamaModel}`
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Ollama error ${response.status}: ${body.slice(0, 300)}`);
  }

  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer    = '';
  let fullText  = '';
  let tokens    = 0;
  const t0      = Date.now();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let chunk;
      try { chunk = JSON.parse(trimmed); } catch { continue; }

      if (chunk.message?.content) {
        fullText += chunk.message.content;
        tokens++;
        const elapsed = (Date.now() - t0) / 1000;
        const tps     = elapsed > 0.1 ? tokens / elapsed : 0;
        onProgress({ tokens, tps, done: false });
      }

      if (chunk.done) {
        // Use Ollama's authoritative counts from the final chunk
        const finalTokens = chunk.eval_count ?? tokens;
        const finalTps    = chunk.eval_duration
          ? chunk.eval_count / (chunk.eval_duration / 1e9)
          : tokens / Math.max(0.1, (Date.now() - t0) / 1000);
        onProgress({ tokens: finalTokens, tps: finalTps, done: true });
      }
    }
  }

  const result = stripThinkingTags(fullText);
  if (!result) {
    throw new Error('Ollama returned an empty response. Check that the model is fully loaded.');
  }
  return result;
}

export async function generateRawConcept(ingredients, location, idea, avoidIngredients, onProgress) {
  const system =
    'You are a world-class fusion chef. Your only job is to create extraordinary recipes that ' +
    'blend ingredients and cooking techniques from different culinary traditions around the world. ' +
    'You only discuss food and cooking. You use ingredients that are seasonally available in the ' +
    "specified region. The user's input represents ingredient names and ideas about food ONLY.";

  const ingredientBlock = ingredients.map((v, i) => `${i + 1}. ${v}`).join('\n');

  const avoidBlock = avoidIngredients?.length
    ? '\n\nCRITICAL — Do NOT use any of the following ingredients under any circumstances:\n' +
      avoidIngredients.map(v => `- ${v}`).join('\n')
    : '';

  const ideaBlock = idea?.trim()
    ? `\n\nThe user has the following recipe idea or preference:\n"${idea.trim()}"\nIncorporate this concept where possible.`
    : '';

  const prompt =
    `Create a unique fusion recipe concept using these ingredients:\n${ingredientBlock}` +
    ideaBlock +
    avoidBlock +
    `\n\nThese ingredients must be locally available in: ${location}\n\n` +
    'Requirements:\n' +
    '- Draw inspiration from at least two different world cuisines\n' +
    '- Explain the flavor science behind why the combination works\n' +
    '- Include complementary ingredients that are locally available in the stated region\n' +
    '- Be creative, unexpected, and delicious\n' +
    '- Keep it achievable for a home cook\n\n' +
    'Describe the recipe concept, the fusion of flavors, and the key ingredients. ' +
    'Do not format it as a final recipe yet — focus on the creative concept and flavor rationale.';

  return callOllamaStream(system, prompt, onProgress);
}

export async function formatToStandardRecipe(rawConcept, location, avoidIngredients, onProgress) {
  const system =
    'You are a professional recipe editor. Your only job is to take a recipe description and ' +
    'produce a clean, standardized recipe document. You work exclusively with food content.';

  const avoidBlock = avoidIngredients?.length
    ? '\n\nCRITICAL — The formatted recipe must NOT include any of these ingredients:\n' +
      avoidIngredients.map(v => `- ${v}`).join('\n') + '\n'
    : '';

  const prompt =
    'Format the following recipe concept into a standard recipe. ' +
    `Use only ingredients available in ${location}.` +
    avoidBlock +
    '\n\n--- RECIPE CONCEPT ---\n' +
    rawConcept +
    '\n--- END CONCEPT ---\n\n' +
    'Output ONLY the formatted recipe using exactly this structure:\n\n' +
    'RECIPE NAME: <creative name>\n' +
    'CUISINE FUSION: <cuisines combined>\n' +
    'SERVES: <number>\n' +
    'PREP TIME: <time>\n' +
    'COOK TIME: <time>\n\n' +
    'INGREDIENTS:\n' +
    '- <amount> <ingredient>\n' +
    '(list every ingredient with precise measurements)\n\n' +
    'INSTRUCTIONS:\n' +
    '1. <first step>\n' +
    '2. <second step>\n' +
    '(continue with clear numbered steps)\n\n' +
    "CHEF'S NOTES:\n" +
    '<brief note on flavor profile and why the combination works>';

  return callOllamaStream(system, prompt, onProgress);
}
