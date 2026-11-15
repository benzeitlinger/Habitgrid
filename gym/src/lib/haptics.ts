/*
 * Leichtes haptisches Feedback.
 * iOS Safari (18+) hat keine Vibration-API, löst aber beim Umschalten eines
 * <input type="checkbox" switch> ein Haptik-Tick aus – den nutzen wir.
 */
let label: HTMLLabelElement | null = null;

export function tick(): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(8);
    }
    // Nicht während einer Eingabe – sonst könnte die Tastatur zugehen.
    const a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) return;
    if (!label) {
      label = document.createElement('label');
      label.setAttribute('aria-hidden', 'true');
      label.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      label.appendChild(input);
      document.body.appendChild(label);
    }
    label.click();
  } catch {
    /* egal */
  }
}
