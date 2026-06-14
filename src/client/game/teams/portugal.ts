import { buildSquad, type TeamData } from './types';
import { F_433 } from './formations';

// Portugal — 4-3-3.
export const portugal: TeamData = {
  name: 'Portugal',
  abbr: 'POR',
  formation: '4-3-3',
  color: '#c8102e',
  textColor: '#ffffff',
  kit: { shirt: '#c8102e', sleeve: '#9d0c24', outline: '#5e0715' },
  gkKit: { shirt: '#2bd4c4', sleeve: '#17a99b', outline: '#0a5f57' },
  kickoffFwd: 9,
  players: buildSquad(F_433, [
    { num: 1, name: 'COSTA' },
    { num: 5, name: 'DALOT' },
    { num: 3, name: 'DIAS' },
    { num: 14, name: 'INÁCIO' },
    { num: 25, name: 'N. MENDES' },
    { num: 23, name: 'VITINHA' },
    { num: 15, name: 'J. NEVES' },
    { num: 8, name: 'B. FERNANDES' },
    { num: 10, name: 'B. SILVA' },
    { num: 7, name: 'RONALDO' },
    { num: 17, name: 'LEÃO' },
  ]),
};
