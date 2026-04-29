import { useState, useEffect } from 'react';

export default function Header() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setDate(now.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }));
      setTime(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="retro-header">
      <div className="header-left">
        <div className="header-title">Strange Recipe Generator</div>
        <div className="header-sub">// FUSION CUISINE AI SYNTHESIS ENGINE — OFFLINE LOCAL BUILD //</div>
      </div>
      <div className="header-right">
        <span>{date}</span>
        <span>{time}</span>
        <span className="model-tag">MODEL: QWEN3.5:9B</span>
        <span>NODE: LOCALHOST</span>
      </div>
    </header>
  );
}
