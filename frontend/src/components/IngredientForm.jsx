import { useState } from 'react';

const DEFAULT_LOCATION = 'San Francisco Bay Area, California';
const MAX_INGREDIENTS  = 20;
const MAX_AVOID        = 30;
const MAX_IDEA_LEN     = 300;

function sanitizeIngredient(val) {
  return val.replace(/[^a-zA-Z0-9 ,\-.']/g, '').slice(0, 80);
}

function sanitizeIdea(val) {
  return val.replace(/[<>'"&\\`]/g, '').slice(0, MAX_IDEA_LEN);
}

function sanitizeLocation(val) {
  return val.replace(/[^a-zA-Z0-9 ,\-.']/g, '').slice(0, 100);
}

export default function IngredientForm({ onGenerate, isGenerating }) {
  const [ingredients,      setIngredients]      = useState(['']);
  const [avoidIngredients, setAvoidIngredients] = useState([]);
  const [location,         setLocation]         = useState(DEFAULT_LOCATION);
  const [idea,             setIdea]             = useState('');
  const [errors,           setErrors]           = useState({});

  // ── ingredient list helpers ─────────────────────────────
  const updateIng = (i, val) =>
    setIngredients(prev => { const n = [...prev]; n[i] = sanitizeIngredient(val); return n; });
  const addIng    = () => ingredients.length < MAX_INGREDIENTS && setIngredients(p => [...p, '']);
  const removeIng = i => setIngredients(p => p.filter((_, idx) => idx !== i));

  // ── avoid list helpers ──────────────────────────────────
  const updateAvoid  = (i, val) =>
    setAvoidIngredients(prev => { const n = [...prev]; n[i] = sanitizeIngredient(val); return n; });
  const addAvoid     = () => avoidIngredients.length < MAX_AVOID && setAvoidIngredients(p => [...p, '']);
  const removeAvoid  = i => setAvoidIngredients(p => p.filter((_, idx) => idx !== i));

  const filledIngs   = () => ingredients.filter(v => v.trim());
  const filledAvoids = () => avoidIngredients.filter(v => v.trim());

  const validate = () => {
    const errs = {};
    if (filledIngs().length === 0) errs.ingredients = 'Enter at least one ingredient.';
    if (!location.trim())          errs.location = 'Location is required.';
    return errs;
  };

  const handleSubmit = e => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    onGenerate({
      ingredients:      filledIngs(),
      avoidIngredients: filledAvoids(),
      location:         location.trim(),
      idea:             idea.trim(),
    });
  };

  return (
    <form className="panel" onSubmit={handleSubmit} noValidate>
      <div className="panel-title">Ingredient Input Matrix</div>

      {/* ── INGREDIENTS ── */}
      <div className="ingredient-list">
        {ingredients.map((ing, i) => (
          <div key={i} className="ingredient-row">
            <span className="ing-num">{String(i + 1).padStart(2, '0')}:</span>
            <input
              type="text"
              value={ing}
              onChange={e => updateIng(i, e.target.value)}
              placeholder={i === 0 ? 'e.g., chicken thighs' : `ingredient ${i + 1}`}
              maxLength={80}
              disabled={isGenerating}
              aria-label={`Ingredient ${i + 1}`}
            />
            {ingredients.length > 1 && (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => removeIng(i)}
                disabled={isGenerating}
                aria-label={`Remove ingredient ${i + 1}`}
              >
                DEL
              </button>
            )}
          </div>
        ))}
      </div>

      {errors.ingredients && <p className="field-error">{errors.ingredients}</p>}

      <div className="add-btn-row">
        {ingredients.length < MAX_INGREDIENTS && (
          <button type="button" className="btn btn-sm" onClick={addIng} disabled={isGenerating}>
            + ADD INGREDIENT
          </button>
        )}
        <div className="ing-counter">
          [{filledIngs().length} / {MAX_INGREDIENTS} INGREDIENTS LOADED]
        </div>
      </div>

      {/* ── AVOID LIST ── */}
      <div className="avoid-section">
        <div className="section-label">
          <span>// Ingredients to Avoid</span>
          <span className="section-hint">(allergies, preferences — optional)</span>
        </div>

        {avoidIngredients.length > 0 && (
          <div className="ingredient-list avoid-list">
            {avoidIngredients.map((item, i) => (
              <div key={i} className="ingredient-row">
                <span className="ing-num avoid-num">✕{String(i + 1).padStart(2, '0')}:</span>
                <input
                  type="text"
                  value={item}
                  onChange={e => updateAvoid(i, e.target.value)}
                  placeholder={`e.g., peanuts, shellfish, gluten`}
                  maxLength={80}
                  disabled={isGenerating}
                  aria-label={`Avoid ingredient ${i + 1}`}
                  className="avoid-input"
                />
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => removeAvoid(i)}
                  disabled={isGenerating}
                  aria-label={`Remove avoid item ${i + 1}`}
                >
                  DEL
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="add-btn-row">
          {avoidIngredients.length < MAX_AVOID && (
            <button type="button" className="btn btn-sm btn-avoid" onClick={addAvoid} disabled={isGenerating}>
              + ADD AVOID ITEM
            </button>
          )}
          {avoidIngredients.length > 0 && (
            <div className="ing-counter avoid-counter">
              [{filledAvoids().length} ITEMS — WILL BE EXCLUDED FROM RECIPE]
            </div>
          )}
        </div>
      </div>

      {/* ── LOCATION ── */}
      <div className="location-section">
        <label className="location-label" htmlFor="location">
          // Local Availability Region
        </label>
        <input
          id="location"
          type="text"
          value={location}
          onChange={e => setLocation(sanitizeLocation(e.target.value))}
          placeholder="San Francisco Bay Area, California"
          maxLength={100}
          disabled={isGenerating}
        />
        {errors.location && <p className="field-error">{errors.location}</p>}
        <p className="location-hint">[RECIPE WILL USE INGREDIENTS LOCALLY AVAILABLE IN THIS REGION]</p>
      </div>

      {/* ── IDEA ── */}
      <div className="idea-section">
        <label className="location-label" htmlFor="idea">
          // Recipe Idea <span className="optional-tag">(optional)</span>
        </label>
        <textarea
          id="idea"
          value={idea}
          onChange={e => setIdea(sanitizeIdea(e.target.value))}
          placeholder="e.g., something spicy and citrusy, a comfort dish with Japanese and Mexican influences..."
          maxLength={MAX_IDEA_LEN}
          rows={3}
          disabled={isGenerating}
        />
        <div className="ing-counter">[{idea.length} / {MAX_IDEA_LEN} CHARS]</div>
      </div>

      {/* ── GENERATE ── */}
      <div className="generate-row">
        <button type="submit" className="btn btn-lg" disabled={isGenerating}>
          {isGenerating ? '>> SYNTHESIZING RECIPE...' : '>> GENERATE RECIPE <<'}
        </button>
      </div>
    </form>
  );
}
