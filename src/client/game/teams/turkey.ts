import { buildSquad, type TeamData } from './types';
import { F_4231 } from './formations';

// Türkiye — 4-2-3-1 (best-effort current XI).
export const turkey: TeamData = {
  name: 'Türkiye',
  abbr: 'TUR',
  formation: '4-2-3-1',
  color: '#e30a17',
  textColor: '#ffffff',
  kit: { shirt: '#e30a17', sleeve: '#b30812', outline: '#5e040a' },
  gkKit: { shirt: '#1f1f24', sleeve: '#34343c', outline: '#000000' },
  kickoffFwd: 9,
  players: buildSquad(F_4231, [
    { num: 1, name: 'GÜNOK' },
    { num: 2, name: 'ÇELIK' },
    { num: 3, name: 'DEMIRAL' },
    { num: 14, name: 'BARDAKCI' },
    { num: 20, name: 'KADIOĞLU' },
    { num: 10, name: 'ÇALHANOĞLU' },
    { num: 6, name: 'KÖKÇÜ' },
    { num: 8, name: 'GÜLER' },
    { num: 7, name: 'AKTÜRKOĞLU' },
    { num: 21, name: 'YILMAZ' },
    { num: 11, name: 'YILDIZ' },
  ]),
};
