import { useEffect } from 'react';
import { useVisualizerStore } from '@/store/useVisualizerStore';

function isEditorFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  // Monaco editor uses a textarea inside .monaco-editor
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return true;
  // Check if the element or any ancestor has the monaco-editor class
  let node: Element | null = el;
  while (node) {
    if (node.classList?.contains('monaco-editor')) return true;
    node = node.parentElement;
  }
  return false;
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isEditorFocused()) return;

      const store = useVisualizerStore.getState();

      switch (e.key) {
        case 'ArrowRight':
          store.goNext();
          break;
        case 'ArrowLeft':
          store.goBack();
          break;
        case ' ':
          e.preventDefault();
          store.togglePlayback();
          break;
        case 'Home':
          store.goToStart();
          break;
        case 'End':
          store.goToEnd();
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
