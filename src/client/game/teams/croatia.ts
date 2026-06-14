import { buildSquad, type TeamData } from './types';
import { F_433 } from './formations';

// Croatia — 4-3-3 (best-effort current XI).
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
    { num: 22, name: 'JURANOVIĆ' },
    { num: 6, name: 'POGEGA' },
    { num: 5, name: 'ERLIĆ' },
    { num: 19, name: 'SOSA' },
    { num: 10, name: 'MODRIĆ' },
    { num: 11, name: 'BROZOVIĆ' },
    { num: 8, name: 'KOVAČIĆ' },
    { num: 4, name: 'PERIŠIĆ' },
    { num: 9, name: 'KRAMARIĆ' },
    { num: 13, name: 'PAŠALIĆ' },
  ]),
};
