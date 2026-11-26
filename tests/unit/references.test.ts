import { describe, expect, it } from 'vitest';
import { findBrokenReferences } from '../../src/lib/content/references';

const tags = new Set(['devops', 'ia']);
const series = new Set(['agentes']);

describe('findBrokenReferences', () => {
  it('returns nothing when every reference exists', () => {
    expect(
      findBrokenReferences(
        [
          { id: 'a', tags: ['devops', 'ia'] },
          { id: 'b', tags: ['ia'], series: 'agentes' },
        ],
        tags,
        series,
      ),
    ).toEqual([]);
  });

  it('names the post and the missing tag', () => {
    expect(
      findBrokenReferences(
        [{ id: 'a', tags: ['devops', 'nope'] }],
        tags,
        series,
      ),
    ).toEqual(['posts/a: tag "nope" does not exist in the tags collection']);
  });

  it('names the post and the missing series', () => {
    expect(
      findBrokenReferences(
        [{ id: 'b', tags: ['ia'], series: 'ghost' }],
        tags,
        series,
      ),
    ).toEqual([
      'posts/b: series "ghost" does not exist in the series collection',
    ]);
  });

  it('reports every problem across posts', () => {
    const problems = findBrokenReferences(
      [
        { id: 'a', tags: ['x'] },
        { id: 'b', tags: ['y'], series: 'z' },
      ],
      tags,
      series,
    );
    expect(problems).toHaveLength(3);
  });

  it('handles no posts', () => {
    expect(findBrokenReferences([], tags, series)).toEqual([]);
  });
});
