import { deepStrictEqual, equal } from 'node:assert/strict';
import { test } from 'node:test';
import type { Player } from '../src/players/domain/player.js';
import { seedPlayers } from '../src/players/infrastructure/seed.js';
import { calculateStatistics } from '../src/statistics/calculate-statistics.js';

function player(
  code: string,
  last: number[],
  height = 180,
  weight = 81000,
): Player {
  return {
    ...structuredClone(seedPlayers[0]!),
    country: { code, picture: 'https://example.com/flag.png' },
    data: { rank: 1, points: 0, age: 25, height, weight, last },
  };
}

test('calculates the three requested statistics from the supplied dataset', () => {
  deepStrictEqual(calculateStatistics(seedPlayers), {
    bestCountry: { code: 'SRB', wins: 5, matches: 5, ratio: 1 },
    averageBmi: 23.36,
    medianHeight: 185,
    playerCount: 5,
  });
});

test('aggregates wins and matches by country instead of averaging player ratios', () => {
  const result = calculateStatistics([
    player('USA', [1]),
    player('USA', [0, 0, 0, 0]),
    player('SUI', [1, 0]),
  ]);
  deepStrictEqual(result.bestCountry, {
    code: 'SUI',
    wins: 1,
    matches: 2,
    ratio: 0.5,
  });
});

test('averages individual BMIs with the correct units', () => {
  equal(
    calculateStatistics([
      player('USA', [], 200, 80000),
      player('SUI', [], 100, 20000),
    ]).averageBmi,
    20,
  );
});

test('calculates the median for even counts without rounding half centimetres', () => {
  equal(
    calculateStatistics([
      player('USA', [], 190),
      player('USA', [], 181),
      player('USA', [], 180),
      player('USA', [], 175),
    ]).medianHeight,
    180.5,
  );
});

test('breaks country ties alphabetically and excludes countries with no matches', () => {
  deepStrictEqual(
    calculateStatistics([
      player('ZZZ', [1, 0]),
      player('AAA', []),
      player('BBB', [1, 1, 0, 0]),
    ]).bestCountry,
    { code: 'BBB', wins: 2, matches: 4, ratio: 0.5 },
  );
});

test('represents missing data with null, never NaN or a fabricated zero', () => {
  deepStrictEqual(calculateStatistics([]), {
    bestCountry: null,
    averageBmi: null,
    medianHeight: null,
    playerCount: 0,
  });
  equal(calculateStatistics([player('USA', [])]).bestCountry, null);
});

test('does not reorder or mutate the original dataset', () => {
  const before = structuredClone(seedPlayers);
  calculateStatistics(seedPlayers);
  deepStrictEqual(seedPlayers, before);
});
