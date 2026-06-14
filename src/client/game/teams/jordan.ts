import { buildSquad, type TeamData } from './types';
import { F_4231 } from './formations';

// Jordan — 4-2-3-1.
export const jordan: TeamData = {
  name: 'Jordan',
  abbr: 'JOR',
  formation: '4-2-3-1',
  color: '#c8102e',
  textColor: '#ffffff',
  kit: { shirt: '#c8102e', sleeve: '#a00b24', outline: '#5e0714' },
  gkKit: { shirt: '#111827', sleeve: '#0a0f1c', outline: '#000000' },
  kickoffFwd: 9,
  players: buildSquad(F_4231, [
    { num: 1, name: 'ABU LAYLA' },
    { num: 2, name: 'NASIB' },
    { num: 5, name: 'AL-ARAB' },
    { num: 4, name: 'NASEEB' },
    { num: 3, name: 'HARITH' },
    { num: 6, name: 'AL-RASHDAN' },
    { num: 8, name: 'AL-NAIMAT N.' },
    { num: 10, name: 'AL-TAMARI' },
    { num: 7, name: 'OLWAN' },
    { num: 9, name: 'AL-NAIMAT' },
    { num: 11, name: 'HADDAD' },
  ]),
};
