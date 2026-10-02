import { useState } from 'react';
import useScrollToTop from '../src/hooks/useScrollToTop.js';

// Imita a troca de telas do App: a nova tela deve começar do topo.
function ScrollFixture() {
  const [screen, setScreen] = useState('lista');
  useScrollToTop(screen);

  return (
    <main>
      <h2>Tela: {screen}</h2>
      <div style={{ height: '3000px' }} />
      <button type="button" onClick={() => setScreen('edição')}>Trocar de tela</button>
    </main>
  );
}

export default ScrollFixture;
