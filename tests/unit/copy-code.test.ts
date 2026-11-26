import { describe, expect, it, vi } from 'vitest';
import {
  codeText,
  COPIED_MS,
  hasCodeBlock,
  initCopyButtons,
  type CopyButton,
  type TextNode,
} from '../../src/lib/copy-code';

function setup(code = 'a: 1\nb: 2') {
  const label: TextNode = { textContent: 'Copiar' };
  const status: TextNode = { textContent: '' };
  const codeNode: TextNode = { textContent: code };
  const frame = {
    querySelector(selector: string) {
      if (selector === '.code-copy-label') return label;
      if (selector === '[data-copy-status]') return status;
      if (selector === 'pre code') return codeNode;
      return null;
    },
  };
  let click: (() => void) | undefined;
  const attributes = new Set<string>();
  const button: CopyButton = {
    hidden: true,
    closest: () => frame,
    addEventListener: (_type, listener) => {
      click = listener;
    },
    setAttribute: (name) => attributes.add(name),
    removeAttribute: (name) => attributes.delete(name),
  };
  return { button, label, status, attributes, click: () => click?.() };
}

describe('AC7: copy button', () => {
  it('reveals the button that shipped hidden', () => {
    const { button } = setup();
    initCopyButtons(
      { querySelectorAll: () => [button] },
      { writeText: vi.fn() },
    );
    expect(button.hidden).toBe(false);
  });

  it('copies the code text exactly, without a trailing newline', async () => {
    const t = setup('a: 1\nb: 2');
    const writeText = vi.fn().mockResolvedValue(undefined);
    initCopyButtons({ querySelectorAll: () => [t.button] }, { writeText });
    t.click();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith('a: 1\nb: 2');
  });

  it('shows Copiado for 2 s, announces it, then restores the label', async () => {
    const t = setup();
    const schedule = vi.fn();
    initCopyButtons(
      { querySelectorAll: () => [t.button] },
      { writeText: () => Promise.resolve() },
      schedule,
    );
    t.click();
    await Promise.resolve();
    expect(t.label.textContent).toBe('Copiado');
    expect(t.status.textContent).toBe('Copiado');
    expect(t.attributes.has('data-copied')).toBe(true);
    expect(schedule).toHaveBeenCalledWith(expect.any(Function), COPIED_MS);
    expect(COPIED_MS).toBe(2000);

    (schedule.mock.calls[0]?.[0] as () => void)();
    expect(t.label.textContent).toBe('Copiar');
    expect(t.status.textContent).toBe('');
    expect(t.attributes.has('data-copied')).toBe(false);
  });

  it('announces a failure instead of throwing', async () => {
    const t = setup();
    initCopyButtons(
      { querySelectorAll: () => [t.button] },
      { writeText: () => Promise.reject(new Error('denied')) },
    );
    t.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(t.status.textContent).toBe('Não foi possível copiar');
    expect(t.label.textContent).toBe('Copiar');
  });

  it('leaves a button outside a figure hidden', () => {
    const button: CopyButton = {
      hidden: true,
      closest: () => null,
      addEventListener: vi.fn(),
      setAttribute: vi.fn(),
      removeAttribute: vi.fn(),
    };
    initCopyButtons(
      { querySelectorAll: () => [button] },
      { writeText: vi.fn() },
    );
    expect(button.hidden).toBe(true);
  });

  it('works when the label and status nodes are missing', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const frame = {
      querySelector: (selector: string) =>
        selector === 'pre code' ? { textContent: 'x' } : null,
    };
    let click: (() => void) | undefined;
    const button: CopyButton = {
      hidden: true,
      closest: () => frame,
      addEventListener: (_type, listener) => {
        click = listener;
      },
      setAttribute: vi.fn(),
      removeAttribute: vi.fn(),
    };
    const schedule = vi.fn();
    initCopyButtons(
      { querySelectorAll: () => [button] },
      { writeText },
      schedule,
    );
    click?.();
    await Promise.resolve();
    (schedule.mock.calls[0]?.[0] as () => void)();
    expect(writeText).toHaveBeenCalledWith('x');
  });

  it('codeText handles a missing node', () => {
    expect(codeText(null)).toBe('');
    expect(codeText({ textContent: null })).toBe('');
  });
});

describe('AC7: pages that need the script', () => {
  it('finds a fenced block', () => {
    expect(hasCodeBlock('texto\n\n```yaml\na: 1\n```\n')).toBe(true);
    expect(hasCodeBlock('~~~\nx\n~~~')).toBe(true);
    expect(hasCodeBlock('  ```bash title="x"\nls\n```')).toBe(true);
  });

  it('ignores prose and a Mermaid-only post', () => {
    expect(hasCodeBlock('só texto com `código` inline')).toBe(false);
    expect(
      hasCodeBlock('```mermaid title="x"\nflowchart LR\n  A --> B\n```\n'),
    ).toBe(false);
  });

  it('finds a code block after a Mermaid one', () => {
    expect(
      hasCodeBlock('```mermaid title="x"\nA --> B\n```\n\n```sh\nls\n```'),
    ).toBe(true);
  });

  it('does not close a fence with a shorter or different marker', () => {
    expect(hasCodeBlock('````mermaid title="x"\n```\nA\n```\n````\n')).toBe(
      false,
    );
    expect(hasCodeBlock('```mermaid title="x"\n~~~\nA\n```\n')).toBe(false);
  });
});
