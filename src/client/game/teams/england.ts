import { buildSquad, type TeamData } from './types';
import { F_4231 } from './formations';

// England — 4-2-3-1.
export const england: TeamData = {
  name: 'England',
  abbr: 'ENG',
  formation: '4-2-3-1',
  color: '#f4f4f4',
  textColor: '#0a1f44',
  kit: { shirt: '#f4f4f4', sleeve: '#dfe3ea', outline: '#13235b' },
  gkKit: { shirt: '#2bb673', sleeve: '#1d9159', outline: '#0c4f30' },
  kickoffFwd: 9,
  players: buildSquad(F_4231, [
    { num: 1, name: 'PICKFORD' },
    { num: 24, name: 'JAMES' },
    { num: 5, name: 'STONES' },
    { num: 6, name: 'GUÉHI' },
    { num: 3, name: 'O\u2019REILLY' },
    { num: 4, name: 'RICE' },
    { num: 8, name: 'ANDERSON' },
    { num: 10, name: 'BELLINGHAM' },
    { num: 7, name: 'SAKA' },
    { num: 9, name: 'KANE' },
    { num: 11, name: 'RASHFORD' },
  ]),
};
