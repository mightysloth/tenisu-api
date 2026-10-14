import fixture from './headtohead.json' with { type: 'json' };
import type { Player } from '../domain/player.js';

export const seedPlayers: Player[] = fixture.players.map((player) => {
  if (player.sex !== 'M' && player.sex !== 'F') {
    throw new Error(`Invalid seed player sex: ${player.id}`);
  }
  return { ...player, sex: player.sex };
});
