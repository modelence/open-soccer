import { buildSquad, type TeamData } from './types';
import { F_352 } from './formations';

// Qatar — 3-5-2.
export const qatar: TeamData = {
  name: 'Qatar',
  abbr: 'QAT',
  formation: '3-5-2',
  color: '#8a1538',
  textColor: '#ffffff',
  kit: { shirt: '#8a1538', sleeve: '#6c102b', outline: '#3a0817' },
  gkKit: { shirt: '#111827', sleeve: '#0a0f1c', outline: '#000000' },
  kickoffFwd: 9,
  players: buildSquad(F_352, [
    { num: 22, name: 'BARSHAM' },
    { num: 2, name: 'PEDRO MIGUEL' },
    { num: 16, name: 'KHOUKHI' },
    { num: 3, name: 'MENDES' },
    { num: 23, name: 'MADIBO' },
    { num: 6, name: 'HATEM' },
    { num: 12, name: 'BOUDIAF' },
    { num: 10, name: 'AL-HAYDOS' },
    { num: 14, name: 'HOMAM AHMED' },
    { num: 11, name: 'AFIF' },
    { num: 19, name: 'ALI' },
  ]),
};
