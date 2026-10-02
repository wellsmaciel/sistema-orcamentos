import { useEffect } from 'react';

// O app troca de tela sem recarregar a página, e o navegador manteria a rolagem da tela anterior.
// Cada tela nova começa do topo; quem precisa rolar até um item (como a revisão) faz isso depois.
function useScrollToTop(screenKey) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screenKey]);
}

export default useScrollToTop;
