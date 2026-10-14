export interface PlayerCountry {
  picture: string;
  code: string;
}

export interface PlayerData {
  rank: number;
  points: number;
  weight: number;
  height: number;
  age: number;
  last: number[];
}

export interface Player {
  id: number;
  firstname: string;
  lastname: string;
  shortname: string;
  sex: 'M' | 'F';
  country: PlayerCountry;
  picture: string;
  data: PlayerData;
}

export class PlayerAlreadyExistsError extends Error {}

export function comparePlayers(left: Player, right: Player): number {
  return (
    left.data.rank - right.data.rank ||
    right.data.points - left.data.points ||
    left.id - right.id
  );
}
