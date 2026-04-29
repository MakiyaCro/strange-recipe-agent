import { useState } from 'react';
import Header from './components/Header.jsx';
import IngredientForm from './components/IngredientForm.jsx';
import StatusTerminal from './components/StatusTerminal.jsx';
import RecipeDisplay from './components/RecipeDisplay.jsx';

export default function App() {
  const [recipe,      setRecipe]      = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [logs,        setLogs]        = useState([]);
  const [progress,    setProgress]    = useState(null);  // { step, tokens, tps }
  const [error,       setError]       = useState(null);

  const addLog = msg => setLogs(prev => [...prev, msg]);

  const handleGenerate = async ({ ingredients, avoidIngredients, location, idea }) => {
    setIsGenerating(true);
    setError(null);
    setRecipe(null);
    setLogs([]);
    setProgress(null);

    addLog('> BOOT SEQUENCE INITIATED...');
    addLog('> CONNECTING TO LOCAL OLLAMA INSTANCE...');

    try {
      const response = await fetch('/api/recipe/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients, avoidIngredients, location, idea }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Request failed.' }));
        throw new Error(data.error ?? 'Request failed.');
      }

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          if (!part.trim()) continue;

          let eventType = 'message';
          let dataStr   = '';

          for (const line of part.split('\n')) {
            if (line.startsWith('event: ')) eventType = line.slice(7).trim();
            if (line.startsWith('data: '))  dataStr   = line.slice(6).trim();
          }

          if (!dataStr) continue;

          let payload;
          try { payload = JSON.parse(dataStr); } catch { continue; }

          if (eventType === 'status') {
            addLog(`> [${payload.step}/2] ${payload.message.toUpperCase()}`);
            setProgress({ step: payload.step, tokens: 0, tps: 0 });
          } else if (eventType === 'progress') {
            setProgress({ step: payload.step, tokens: payload.tokens, tps: payload.tps });
          } else if (eventType === 'complete') {
            addLog('> RECIPE SYNTHESIS COMPLETE.');
            setProgress(null);
            setRecipe(payload.recipe);
          } else if (eventType === 'error') {
            throw new Error(payload.error);
          }
        }
      }
    } catch (err) {
      addLog(`> ERROR: ${err.message}`);
      setError(err.message);
      setProgress(null);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="crt-wrapper">
      <div className="scanlines"  aria-hidden="true" />
      <div className="vignette"   aria-hidden="true" />
      <div className="crt-screen">
        <Header />
        <main className="app-main">
          <IngredientForm onGenerate={handleGenerate} isGenerating={isGenerating} />

          {logs.length > 0 && (
            <StatusTerminal logs={logs} progress={progress} isRunning={isGenerating} />
          )}

          {error && !recipe && (
            <div className="error-panel" role="alert">
              <span className="error-label">!! SYSTEM ERROR !!</span>
              <p>{error}</p>
            </div>
          )}

          {recipe && <RecipeDisplay recipe={recipe} />}
        </main>

        <footer className="retro-footer">
          <span>SRG&nbsp;v1.0.0</span>
          <span className="sep">|</span>
          <span>OLLAMA:&nbsp;LOCAL</span>
          <span className="sep">|</span>
          <span>STATUS:&nbsp;<span className="blink online">ONLINE</span></span>
        </footer>
      </div>
    </div>
  );
}
