import { useEffect, useState } from 'react';

const sizes = [100, 125, 150];

function readPreference(key, fallback) {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function AccessibilityControls() {
  const [size, setSize] = useState(() => {
    const saved = Number(readPreference('quoteTextSize', '100'));
    return sizes.includes(saved) ? saved : 100;
  });
  const [highContrast, setHighContrast] = useState(() => readPreference('quoteHighContrast', 'false') === 'true');

  useEffect(() => {
    document.documentElement.dataset.textSize = String(size);
    document.documentElement.dataset.contrast = highContrast ? 'high' : 'normal';
    try {
      window.localStorage.setItem('quoteTextSize', String(size));
      window.localStorage.setItem('quoteHighContrast', String(highContrast));
    } catch {
      // A preferência continua válida nesta página quando o armazenamento está indisponível.
    }
  }, [size, highContrast]);

  return (
    <div className="accessibility-controls" role="group" aria-label="Acessibilidade">
      <span>Tamanho do texto</span>
      <button type="button" aria-label="Diminuir texto" onClick={() => setSize((current) => sizes[Math.max(0, sizes.indexOf(current) - 1)])} disabled={size === 100}>A−</button>
      <button type="button" aria-label="Aumentar texto" onClick={() => setSize((current) => sizes[Math.min(sizes.length - 1, sizes.indexOf(current) + 1)])} disabled={size === 150}>A+</button>
      <button type="button" aria-pressed={highContrast} onClick={() => setHighContrast((current) => !current)}>Alto contraste</button>
    </div>
  );
}

export default AccessibilityControls;
