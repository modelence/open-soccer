import { buildSquad, type TeamData } from './types';
import { F_433 } from './formations';

// Portugal — 4-3-3 (best-effort current XI).
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
    { num: 20, name: 'CANCELO' },
    { num: 3, name: 'PEPE' },
    { num: 4, name: 'DIAS' },
    { num: 19, name: 'MENDES' },
    { num: 8, name: 'B. FERNANDES' },
    { num: 6, name: 'PALHINHA' },
    { num: 16, name: 'VITINHA' },
    { num: 11, name: 'B. SILVA' },
    { num: 7, name: 'RONALDO' },
    { num: 21, name: 'L. FÉLIX' },
  ]),
};
