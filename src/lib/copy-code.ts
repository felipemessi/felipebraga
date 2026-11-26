// Copy button for code blocks. Kept behind small interfaces so Vitest can run it
// without a DOM. The bundled entry is src/scripts/copy-code.ts.

export interface TextNode {
  textContent: string | null;
}

export interface Frame {
  querySelector(selector: string): TextNode | null;
}

export interface CopyButton {
  hidden: boolean;
  closest(selector: string): Frame | null;
  addEventListener(type: 'click', listener: () => void): void;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

export interface Root {
  querySelectorAll(selector: string): Iterable<CopyButton>;
}

export interface Clipboard {
  writeText(text: string): Promise<void>;
}

export type Schedule = (callback: () => void, ms: number) => unknown;

export const COPIED_MS = 2000;
export const COPIED_LABEL = 'Copiado';
export const FAILED_LABEL = 'Não foi possível copiar';

/** The code exactly as written: no line numbers, no newline added. */
export function codeText(code: TextNode | null): string {
  return code?.textContent ?? '';
}

export function initCopyButtons(
  root: Root,
  clipboard: Clipboard,
  schedule: Schedule = setTimeout,
): void {
  for (const button of root.querySelectorAll('[data-copy]')) {
    const frame = button.closest('figure');
    if (frame === null) continue;
    // The button ships hidden: without this script there is no dead control.
    button.hidden = false;
    button.addEventListener('click', () => {
      const label = frame.querySelector('.code-copy-label');
      const status = frame.querySelector('[data-copy-status]');
      const announce = (message: string): void => {
        if (status !== null) status.textContent = message;
      };
      const original = label?.textContent ?? '';
      clipboard.writeText(codeText(frame.querySelector('pre code'))).then(
        () => {
          if (label !== null) label.textContent = COPIED_LABEL;
          button.setAttribute('data-copied', '');
          announce(COPIED_LABEL);
          schedule(() => {
            if (label !== null) label.textContent = original;
            button.removeAttribute('data-copied');
            announce('');
          }, COPIED_MS);
        },
        () => {
          announce(FAILED_LABEL);
        },
      );
    });
  }
}

/** True when the body has a fenced block that is not Mermaid (which is an SVG). */
export function hasCodeBlock(body: string): boolean {
  let fence: string | undefined;
  for (const line of body.split(/\r?\n/)) {
    const match = /^[ \t]*(`{3,}|~{3,})\s*(\S*)/.exec(line);
    if (match === null) continue;
    const marker = match[1] ?? '';
    if (fence === undefined) {
      fence = marker;
      if (match[2] !== 'mermaid' && !match[2]?.startsWith('mermaid'))
        return true;
    } else if (
      marker.startsWith(fence[0] ?? '') &&
      marker.length >= fence.length
    ) {
      fence = undefined;
    }
  }
  return false;
}
