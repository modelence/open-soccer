import { buildSquad, type TeamData } from './types';
import { F_433 } from './formations';

// Argentina — 4-3-3 (Scaloni era, best-effort current XI).
export const argentina: TeamData = {
  name: 'Argentina',
  abbr: 'ARG',
  formation: '4-3-3',
  color: '#75aadb',
  textColor: '#0a2b4a',
  kit: { shirt: '#75aadb', sleeve: '#ffffff', outline: '#2f6aa8' },
  gkKit: { shirt: '#1f1f24', sleeve: '#34343c', outline: '#000000' },
  kickoffFwd: 9,
  players: buildSquad(F_433, [
    { num: 23, name: 'E. MARTÍNEZ' },
    { num: 26, name: 'MOLINA' },
    { num: 13, name: 'ROMERO' },
    { num: 19, name: 'OTAMENDI' },
    { num: 3, name: 'TAGLIAFICO' },
    { num: 7, name: 'DE PAUL' },
    { num: 24, name: 'ENZO' },
    { num: 20, name: 'MAC ALLISTER' },
    { num: 10, name: 'MESSI' },
    { num: 9, name: 'ÁLVAREZ' },
    { num: 11, name: 'N. GONZÁLEZ' },
  ]),
};
