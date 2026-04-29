import { useState, useEffect, useCallback } from 'react';

export default function FolderBrowser({ onSelect, onCancel }) {
  const [roots,       setRoots]       = useState([]);
  const [currentPath, setCurrentPath] = useState(null);
  const [parent,      setParent]      = useState(null);
  const [dirs,        setDirs]        = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);

  const navigate = useCallback(async (targetPath) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/fs/list?path=${encodeURIComponent(targetPath)}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? 'Cannot read folder.');
      setCurrentPath(data.path);
      setParent(data.parent);
      setDirs(data.dirs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch('/api/fs/roots')
      .then(r => r.json())
      .then(data => {
        setRoots(data.roots ?? []);
        if (data.roots?.length > 0) navigate(data.roots[0]);
      })
      .catch(() => setError('Could not reach backend filesystem API.'));
  }, [navigate]);

  // Close on Escape key
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div className="fb-overlay" role="dialog" aria-modal="true" aria-label="Select folder">
      <div className="fb-panel">

        {/* Header */}
        <div className="fb-header">
          <span className="fb-title">// SELECT SAVE FOLDER //</span>
          <button className="btn btn-sm btn-danger" onClick={onCancel} aria-label="Cancel">
            [ESC] CANCEL
          </button>
        </div>

        {/* Drive / root quick-links */}
        {roots.length > 0 && (
          <div className="fb-roots">
            <span className="fb-roots-label">DRIVES:</span>
            {roots.map(r => (
              <button
                key={r}
                className={`btn btn-sm fb-drive-btn ${currentPath?.startsWith(r) ? 'active' : ''}`}
                onClick={() => navigate(r)}
              >
                {r}
              </button>
            ))}
          </div>
        )}

        {/* Current path breadcrumb */}
        <div className="fb-breadcrumb">
          <span className="fb-bc-label">PATH&gt;</span>
          <span className="fb-bc-path">{currentPath ?? '...'}</span>
        </div>

        {/* Directory listing */}
        <div className="fb-list">
          {parent && (
            <div className="fb-entry fb-up" onClick={() => navigate(parent)}>
              [..] &nbsp; (parent folder)
            </div>
          )}

          {loading && (
            <div className="fb-status">LOADING<span className="fb-dots">...</span></div>
          )}

          {error && !loading && (
            <div className="fb-status fb-error">!! {error}</div>
          )}

          {!loading && !error && dirs.length === 0 && (
            <div className="fb-status fb-empty">(no subfolders)</div>
          )}

          {!loading && dirs.map(d => (
            <div key={d.fullPath} className="fb-entry" onClick={() => navigate(d.fullPath)}>
              [&gt;] &nbsp;{d.name}
            </div>
          ))}
        </div>

        {/* Footer: select button */}
        <div className="fb-footer">
          <div className="fb-selected-path">
            {currentPath
              ? <><span className="fb-sel-label">SELECTED:</span> <span className="fb-sel-val">{currentPath}</span></>
              : <span className="fb-sel-label">-- navigate to a folder --</span>
            }
          </div>
          <button
            className="btn btn-lg"
            onClick={() => onSelect(currentPath)}
            disabled={!currentPath || loading}
          >
            [&gt;&gt;] SELECT THIS FOLDER
          </button>
        </div>

      </div>
    </div>
  );
}
