import { body, validationResult } from 'express-validator';

const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|above|prior)\s+instructions/i,
  /forget\s+(your|all|previous|prior|the)\s+(previous|instructions|prompt|context)/i,
  /system\s*:/i,
  /\[INST\]/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /###\s*(instruction|system|assistant|user)/i,
  /you\s+are\s+now\s+(a|an)\s+(?!chef|cook|culinary|food)/i,
  /jailbreak/i,
  /bypass\s+your|override\s+your/i,
  /reveal\s+your\s+(system\s+)?prompt/i,
  /act\s+as\s+(if\s+you|a\s+(?!chef|cook|culinary))/i,
  /\bDAN\b/,
  /pretend\s+(you\s+are|to\s+be)\s+(?!a\s+chef)/i,
  /your\s+(instructions|training|programming)\s+(is|are|were)/i,
  /what\s+(are\s+your|is\s+your)\s+(instructions|system\s+prompt)/i,
  /<script[\s>]/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /\bexec\s*\(|\beval\s*\(|\bos\.(system|popen|exec)/i,
  /\$\{|`[^`]*`/,
  /<!--.*?-->/,
];

const ALLOWED_CHARS      = /^[\x20-\x7E\s]+$/;
const ALLOWED_IDEA_CHARS = /^[\x20-\x7E\n\r]+$/;

const MAX_INGREDIENT_LEN  = 80;
const MAX_LOCATION_LEN    = 100;
const MAX_IDEA_LEN        = 300;
const MAX_INGREDIENTS     = 20;
const MAX_AVOID           = 30;

function checkInjection(value) {
  for (const p of INJECTION_PATTERNS) {
    if (p.test(value)) return false;
  }
  return true;
}

export const validateRecipeInput = [
  // ── ingredients ──────────────────────────────────────────
  body('ingredients')
    .isArray({ min: 1, max: MAX_INGREDIENTS })
    .withMessage(`Provide between 1 and ${MAX_INGREDIENTS} ingredients.`),

  body('ingredients.*')
    .isString().trim().notEmpty()
    .withMessage('Ingredient cannot be empty.')
    .isLength({ max: MAX_INGREDIENT_LEN })
    .withMessage(`Each ingredient must be under ${MAX_INGREDIENT_LEN} characters.`)
    .custom(v => ALLOWED_CHARS.test(v))
    .withMessage('Ingredient contains invalid characters.')
    .customSanitizer(v => v.replace(/[^a-zA-Z0-9\s,\-.']/g, '').trim()),

  // ── location ─────────────────────────────────────────────
  body('location')
    .isString().trim().notEmpty()
    .withMessage('Location is required.')
    .isLength({ min: 2, max: MAX_LOCATION_LEN })
    .withMessage(`Location must be between 2 and ${MAX_LOCATION_LEN} characters.`)
    .custom(v => ALLOWED_CHARS.test(v))
    .withMessage('Location contains invalid characters.')
    .customSanitizer(v => v.replace(/[^a-zA-Z0-9\s,\-.']/g, '').trim()),

  // ── idea (optional) ───────────────────────────────────────
  body('idea')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('Idea must be a string.')
    .isLength({ max: MAX_IDEA_LEN })
    .withMessage(`Recipe idea must be under ${MAX_IDEA_LEN} characters.`)
    .custom(v => !v || ALLOWED_IDEA_CHARS.test(v))
    .withMessage('Idea contains invalid characters.')
    .customSanitizer(v => v ? v.replace(/[<>'"&\\`]/g, '').trim() : ''),

  // ── avoidIngredients (optional) ───────────────────────────
  body('avoidIngredients')
    .optional({ nullable: true })
    .isArray({ max: MAX_AVOID })
    .withMessage(`Avoid list cannot exceed ${MAX_AVOID} items.`),

  body('avoidIngredients.*')
    .isString().trim().notEmpty()
    .isLength({ max: MAX_INGREDIENT_LEN })
    .withMessage(`Each avoided ingredient must be under ${MAX_INGREDIENT_LEN} characters.`)
    .custom(v => ALLOWED_CHARS.test(v))
    .withMessage('Avoided ingredient contains invalid characters.')
    .customSanitizer(v => v.replace(/[^a-zA-Z0-9\s,\-.']/g, '').trim()),

  // ── unified injection check across all text fields ────────
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const allText = [
      ...(req.body.ingredients ?? []),
      req.body.location ?? '',
      req.body.idea ?? '',
      ...(req.body.avoidIngredients ?? []),
    ].join(' ');

    if (!checkInjection(allText)) {
      return res.status(400).json({
        error: 'Invalid input detected. Please enter food-related content only.',
      });
    }

    next();
  },
];
