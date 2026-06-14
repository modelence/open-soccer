import { buildSquad, type TeamData } from './types';
import { F_4231 } from './formations';

// Uzbekistan — 4-2-3-1.
export const uzbekistan: TeamData = {
  name: 'Uzbekistan',
  abbr: 'UZB',
  formation: '4-2-3-1',
  color: '#1f8fff',
  textColor: '#ffffff',
  kit: { shirt: '#ffffff', sleeve: '#e6e6e6', outline: '#9ca3af' },
  gkKit: { shirt: '#1f8fff', sleeve: '#1670cc', outline: '#0b3e72' },
  kickoffFwd: 9,
  players: buildSquad(F_4231, [
    { num: 1, name: 'YUSUPOV' },
    { num: 4, name: 'SAYFIEV' },
    { num: 2, name: 'KHUSANOV' },
    { num: 5, name: 'ASHURMATOV' },
    { num: 3, name: 'ALIJONOV' },
    { num: 7, name: 'SHUKUROV' },
    { num: 9, name: 'HAMROBEKOV' },
    { num: 10, name: 'MASHARIPOV' },
    { num: 17, name: 'KHAMDAMOV' },
    { num: 14, name: 'SHOMURODOV' },
    { num: 22, name: 'FAYZULLAEV' },
  ]),
};
