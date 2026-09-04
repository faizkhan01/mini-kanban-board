import { applyMove, toPositions } from './ordering';

describe('applyMove', () => {
  it('reorders within a list (move forward)', () => {
    expect(applyMove(['a', 'b', 'c', 'd'], 'a', 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('reorders within a list (move backward)', () => {
    expect(applyMove(['a', 'b', 'c', 'd'], 'd', 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('is a no-op when moved onto its own index', () => {
    expect(applyMove(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'b', 'c']);
  });

  it('inserts an id coming from another list', () => {
    expect(applyMove(['x', 'y', 'z'], 'new', 1)).toEqual(['x', 'new', 'y', 'z']);
  });

  it('clamps an out-of-range target index to the end', () => {
    expect(applyMove(['a', 'b'], 'c', 99)).toEqual(['a', 'b', 'c']);
  });

  it('clamps a negative target index to the front', () => {
    expect(applyMove(['a', 'b'], 'c', -5)).toEqual(['c', 'a', 'b']);
  });
});

describe('toPositions', () => {
  it('produces gap-free 0-based positions', () => {
    expect(toPositions(['a', 'b', 'c'])).toEqual([
      { id: 'a', position: 0 },
      { id: 'b', position: 1 },
      { id: 'c', position: 2 },
    ]);
  });
});
