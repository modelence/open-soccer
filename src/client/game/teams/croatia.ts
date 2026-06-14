import { buildSquad, type TeamData } from './types';
import { F_433 } from './formations';

// Croatia — 4-3-3.
export const croatia: TeamData = {
  name: 'Croatia',
  abbr: 'CRO',
  formation: '4-3-3',
  color: '#d6132c',
  textColor: '#ffffff',
  kit: { shirt: '#e7e7e7', sleeve: '#d6132c', outline: '#9c0f20' },
  gkKit: { shirt: '#1f1f24', sleeve: '#34343c', outline: '#000000' },
  kickoffFwd: 9,
  players: buildSquad(F_433, [
    { num: 1, name: 'LIVAKOVIĆ' },
    { num: 2, name: 'STANIŠIĆ' },
    { num: 6, name: 'ŠUTALO' },
    { num: 3, name: 'PONGRAČIĆ' },
    { num: 4, name: 'GVARDIOL' },
    { num: 10, name: 'MODRIĆ' },
    { num: 8, name: 'KOVAČIĆ' },
    { num: 21, name: 'SUČIĆ' },
    { num: 14, name: 'PERIŠIĆ' },
    { num: 9, name: 'KRAMARIĆ' },
    { num: 15, name: 'PAŠALIĆ' },
  ]),
};
