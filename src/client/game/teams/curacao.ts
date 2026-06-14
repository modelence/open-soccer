import { buildSquad, type TeamData } from './types';
import { F_4231 } from './formations';

// Curaçao — 4-2-3-1 (World Cup debut).
export const curacao: TeamData = {
  name: 'Curaçao',
  abbr: 'CUW',
  formation: '4-2-3-1',
  color: '#0a285f',
  textColor: '#ffd200',
  kit: { shirt: '#0a285f', sleeve: '#071e47', outline: '#030f24' },
  gkKit: { shirt: '#16a34a', sleeve: '#107a37', outline: '#08461f' },
  kickoffFwd: 9,
  players: buildSquad(F_4231, [
    { num: 1, name: 'ROOM' },
    { num: 2, name: 'SAMBO' },
    { num: 3, name: 'GAARI' },
    { num: 4, name: 'VAN EIJMA' },
    { num: 5, name: 'FLORANUS' },
    { num: 6, name: 'ROEMERATOE' },
    { num: 7, name: 'BACUNA J.' },
    { num: 10, name: 'BACUNA L.' },
    { num: 17, name: 'KUWAS' },
    { num: 9, name: 'LOCADIA' },
    { num: 21, name: 'CHONG' },
  ]),
};
