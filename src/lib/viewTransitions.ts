type TransitionDocument = Document & {
  startViewTransition?: (update: () => void) => unknown;
};

export function startPageTransition(update: () => void) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update();
    return;
  }

  const startViewTransition = (document as TransitionDocument).startViewTransition;
  if (startViewTransition) {
    startViewTransition.call(document, update);
    return;
  }

  // Instant update without artificial delay
  update();
}
