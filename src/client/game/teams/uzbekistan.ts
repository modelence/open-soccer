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
    { num: 1, name: 'NESTEROV' },
    { num: 4, name: 'KHOLMATOV' },
    { num: 5, name: 'ABDUKHOLIKOV' },
    { num: 6, name: 'ASHUROV' },
    { num: 3, name: 'KARIMOV' },
    { num: 8, name: 'MASHARIPOV' },
    { num: 16, name: 'KHAMROBEKOV' },
    { num: 10, name: 'URUNOV' },
    { num: 11, name: 'SHOMURODOV' },
    { num: 9, name: 'FAYZULLAEV' },
    { num: 7, name: 'TURGUNBOEV' },
  ]),
};
