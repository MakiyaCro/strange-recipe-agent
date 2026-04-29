import { useState, useMemo } from 'react';
import FolderBrowser from './FolderBrowser.jsx';

const SECTION_TITLES = new Set(['INGREDIENTS', 'INSTRUCTIONS', "CHEF'S NOTES"]);
const META_PREFIXES  = ['RECIPE NAME', 'CUISINE FUSION', 'SERVES', 'PREP TIME', 'COOK TIME'];

function classifyLine(line) {
  const t     = line.trim();
  if (!t) return { type: 'blank' };
  const upper = t.toUpperCase();
  for (const prefix of META_PREFIXES) {
    if (upper.startsWith(prefix + ':')) {
      const idx = t.indexOf(':');
      return { type: 'meta', key: t.slice(0, idx), val: t.slice(idx + 1) };
    }
  }
  if (SECTION_TITLES.has(upper.replace(/:$/, '').trim())) return { type: 'section', text: t };
  return { type: 'body', text: t };
}

function RecipeLine({ line }) {
  const info = classifyLine(line);
  if (info.type === 'blank')   return <div className="r-line">&nbsp;</div>;
  if (info.type === 'section') return <div className="r-line section-title">{info.text}</div>;
  if (info.type === 'meta') {
    return (
      <div className="r-line meta">
        <span className="meta-key">{info.key}:</span>{info.val}
      </div>
    );
  }
  return <div className="r-line">{info.text}</div>;
}

function extractName(recipe) {
  const m = recipe.match(/RECIPE NAME\s*:\s*(.+)/i);
  return m ? m[1].trim().replace(/[^a-zA-Z0-9 \-_]/g, '').slice(0, 60) : 'recipe';
}

async function fetchPdfBlob(recipe) {
  const resp = await fetch('/api/pdf/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipe }),
  });
  if (!resp.ok) {
    const d = await resp.json().catch(() => ({}));
    throw new Error(d.error ?? 'PDF generation failed.');
  }
  return resp.blob();
}

export default function RecipeDisplay({ recipe }) {
  const defaultName = useMemo(() => extractName(recipe), [recipe]);

  const [showSave,      setShowSave]      = useState(false);
  const [showBrowser,   setShowBrowser]   = useState(false);
  const [selectedDir,   setSelectedDir]   = useState(null);
  const [filename,      setFilename]      = useState(defaultName);
  const [saveMsg,       setSaveMsg]       = useState(null);
  const [isSaving,      setIsSaving]      = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const sanitizeName = v => v.replace(/[^a-zA-Z0-9 \-_]/g, '').slice(0, 60);

  const handleFolderSelect = (folderPath) => {
    setSelectedDir(folderPath);
    setShowBrowser(false);
    setSaveMsg(null);
  };

  const handleSave = async () => {
    if (!selectedDir) { setShowBrowser(true); return; }
    setIsSaving(true);
    setSaveMsg(null);
    try {
      const resp = await fetch('/api/pdf/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe,
          folderPath: selectedDir,
          filename:   sanitizeName(filename) || 'recipe',
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok) {
        setSaveMsg({ ok: true, text: `Saved: ${data.savedTo}` });
      } else {
        setSaveMsg({ ok: false, text: data.error ?? 'Save failed.' });
      }
    } catch {
      setSaveMsg({ ok: false, text: 'Connection error — is the backend running?' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setSaveMsg(null);
    try {
      const blob = await fetchPdfBlob(recipe);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${sanitizeName(filename) || 'recipe'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setSaveMsg({ ok: false, text: err.message || 'Could not generate PDF.' });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      {showBrowser && (
        <FolderBrowser
          onSelect={handleFolderSelect}
          onCancel={() => setShowBrowser(false)}
        />
      )}

      <div className="recipe-display">
        <div className="recipe-header">
          <span className="recipe-header-title">// SYNTHESIZED RECIPE OUTPUT //</span>
          <div className="recipe-actions">
            <button className="btn btn-sm" onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? '...' : '[↓] DOWNLOAD PDF'}
            </button>
            <button
              className="btn btn-sm"
              onClick={() => { setShowSave(p => !p); setSaveMsg(null); }}
            >
              {showSave ? '[×] CLOSE' : '[>] SAVE TO FOLDER'}
            </button>
          </div>
        </div>

        <div className="recipe-body">
          {recipe.split('\n').map((line, i) => <RecipeLine key={i} line={line} />)}
        </div>

        {showSave && (
          <div className="pdf-panel">
            <span className="pdf-label">Save Folder</span>
            <div className="pdf-folder-row">
              <div className="pdf-folder-display">
                {selectedDir
                  ? <span className="folder-selected">[DIR] {selectedDir}</span>
                  : <span className="folder-none">-- no folder selected --</span>
                }
              </div>
              <button className="btn btn-sm" onClick={() => setShowBrowser(true)} disabled={isSaving}>
                [BROWSE]
              </button>
            </div>

            <span className="pdf-label">Filename</span>
            <div className="pdf-row">
              <input
                type="text"
                value={filename}
                onChange={e => setFilename(sanitizeName(e.target.value))}
                placeholder="recipe-name"
                disabled={isSaving}
              />
              <span className="pdf-ext">.pdf</span>
              <button
                className="btn btn-sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? '...' : '[SAVE]'}
              </button>
            </div>

            {saveMsg && (
              <div className={`save-msg ${saveMsg.ok ? 'ok' : 'err'}`}>
                {saveMsg.ok ? '>> ' : '!! '}{saveMsg.text}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
