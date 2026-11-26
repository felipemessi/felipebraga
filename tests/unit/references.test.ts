import { describe, expect, it } from 'vitest';
import {
  findBrokenReferences,
  parsePostReferences,
} from '../../src/lib/content/references';

const tags = new Set(['devops', 'ia']);
const series = new Set(['agentes']);

describe('AC6: findBrokenReferences', () => {
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

describe('AC6: parsePostReferences', () => {
  const fm = 'title: x\ntags: [devops, ia]\nseries: agentes';

  it('reads tags and series', () => {
    expect(parsePostReferences('a', `---\n${fm}\n---\n\nbody`)).toEqual({
      references: { id: 'a', tags: ['devops', 'ia'], series: 'agentes' },
    });
  });

  it('reads CRLF files and block-style lists', () => {
    const source = '---\r\ntags:\r\n  - devops\r\n  - ia\r\n---\r\nbody';
    expect(parsePostReferences('a', source).references?.tags).toEqual([
      'devops',
      'ia',
    ]);
  });

  it('ignores a UTF-8 byte order mark instead of skipping the check', () => {
    const parsed = parsePostReferences('a', `\uFEFF---\ntags: [ghost]\n---\n`);
    expect(parsed.references?.tags).toEqual(['ghost']);
  });

  it('fails loudly when there is no frontmatter', () => {
    for (const source of ['body only', '\n---\ntags: [a]\n---\n', '']) {
      expect(parsePostReferences('a', source).problem).toBe(
        'posts/a: missing frontmatter',
      );
    }
  });

  it('reports invalid YAML with the post id', () => {
    const parsed = parsePostReferences('a', '---\ntitle: a: b\n---\n');
    expect(parsed.problem).toMatch(/^posts\/a: invalid frontmatter \(/);
  });

  it('treats a missing tags field as no tags and a non-object block as empty', () => {
    expect(parsePostReferences('a', '---\ntitle: x\n---\n')).toEqual({
      references: { id: 'a', tags: [], series: undefined },
    });
    expect(
      parsePostReferences('a', '---\njust text\n---\n').references,
    ).toEqual({
      id: 'a',
      tags: [],
      series: undefined,
    });
  });
});
