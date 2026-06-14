import { buildSquad, type TeamData } from './types';
import { F_4231 } from './formations';

// Costa Rica — 4-2-3-1 (best-effort current XI).
export const costaRica: TeamData = {
  name: 'Costa Rica',
  abbr: 'CRC',
  formation: '4-2-3-1',
  color: '#d52b1e',
  textColor: '#ffffff',
  kit: { shirt: '#d52b1e', sleeve: '#1a3a6b', outline: '#0c2452' },
  gkKit: { shirt: '#2bd47a', sleeve: '#17a95c', outline: '#0a5f33' },
  kickoffFwd: 9,
  players: buildSquad(F_4231, [
    { num: 1, name: 'NAVAS' },
    { num: 16, name: 'CALVO' },
    { num: 19, name: 'VARGAS' },
    { num: 3, name: 'DUARTE' },
    { num: 8, name: 'OVIEDO' },
    { num: 17, name: 'TEJEDA' },
    { num: 5, name: 'AGUILERA' },
    { num: 10, name: 'BRENES' },
    { num: 7, name: 'CAMPBELL' },
    { num: 9, name: 'CONTRERAS' },
    { num: 11, name: 'ZAMORA' },
  ]),
};
