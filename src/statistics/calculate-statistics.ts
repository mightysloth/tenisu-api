import type { Player } from '../players/domain/player.js';

export interface CountryWinRatio {
  code: string;
  wins: number;
  matches: number;
  ratio: number;
}

export interface Statistics {
  bestCountry: CountryWinRatio | null;
  averageBmi: number | null;
  medianHeight: number | null;
  playerCount: number;
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateStatistics(players: readonly Player[]): Statistics {
  if (players.length === 0) {
    return {
      bestCountry: null,
      averageBmi: null,
      medianHeight: null,
      playerCount: 0,
    };
  }

  const countries = new Map<string, { wins: number; matches: number }>();
  let bmiSum = 0;
  const heights: number[] = [];

  for (const player of players) {
    const { weight, height, last } = player.data;
    bmiSum += weight / 1000 / (height / 100) ** 2;
    heights.push(height);

    const country = countries.get(player.country.code) ?? {
      wins: 0,
      matches: 0,
    };
    country.wins += last.reduce((sum, result) => sum + result, 0);
    country.matches += last.length;
    countries.set(player.country.code, country);
  }

  const rankedCountries = [...countries.entries()]
    .filter(([, country]) => country.matches > 0)
    .map(([code, country]) => ({
      code,
      ...country,
      ratio: country.wins / country.matches,
    }))
    .sort(
      (left, right) =>
        right.ratio - left.ratio || (left.code < right.code ? -1 : 1),
    );

  heights.sort((left, right) => left - right);
  const middle = Math.floor(heights.length / 2);
  const medianHeight =
    heights.length % 2 === 1
      ? heights[middle]!
      : (heights[middle - 1]! + heights[middle]!) / 2;

  return {
    bestCountry: rankedCountries[0] ?? null,
    averageBmi: round(bmiSum / players.length),
    medianHeight,
    playerCount: players.length,
  };
}
