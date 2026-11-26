import type { Tone } from '../tone';

export const CALLOUT_TYPES = ['nota', 'dica', 'atencao', 'perigo'] as const;
export type CalloutType = (typeof CALLOUT_TYPES)[number];

export interface CalloutSpec {
  tone: Tone;
  label: string;
}

const SPECS: Record<CalloutType, CalloutSpec> = {
  nota: { tone: 'menta', label: 'Nota.' },
  dica: { tone: 'manteiga', label: 'Dica.' },
  atencao: { tone: 'pessego', label: 'Atenção.' },
  perigo: { tone: 'rosa', label: 'Perigo.' },
};

export function isCalloutType(value: unknown): value is CalloutType {
  return (
    typeof value === 'string' &&
    (CALLOUT_TYPES as readonly string[]).includes(value)
  );
}

/** Tone and lead for a callout; an unknown type fails the build. */
export function calloutSpec(type: unknown): CalloutSpec {
  if (!isCalloutType(type)) {
    throw new Error(
      `<Callout type="${String(type)}">: expected one of ${CALLOUT_TYPES.join(', ')}`,
    );
  }
  return SPECS[type];
}
