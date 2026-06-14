import { buildSquad, type TeamData } from './types';
import { F_442 } from './formations';

// Australia — 4-4-2.
export const australia: TeamData = {
  name: 'Australia',
  abbr: 'AUS',
  formation: '4-4-2',
  color: '#0b6b3a',
  textColor: '#ffd200',
  kit: { shirt: '#f4c300', sleeve: '#d8aa00', outline: '#8a6c00' },
  gkKit: { shirt: '#0b6b3a', sleeve: '#075029', outline: '#032916' },
  kickoffFwd: 9,
  players: buildSquad(F_442, [
    { num: 1, name: 'RYAN' },
    { num: 19, name: 'ATKINSON' },
    { num: 20, name: 'SOUTTAR' },
    { num: 4, name: 'ROWLES' },
    { num: 16, name: 'BEHICH' },
    { num: 7, name: 'LECKIE' },
    { num: 13, name: 'IRVINE' },
    { num: 22, name: 'O\u2019NEILL' },
    { num: 23, name: 'GOODWIN' },
    { num: 9, name: 'DUKE' },
    { num: 11, name: 'BOYLE' },
  ]),
};
