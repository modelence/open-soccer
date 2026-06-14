import { buildSquad, type TeamData } from './types';
import { F_433 } from './formations';

// Brazil — 4-3-3 (best-effort current XI).
export const brazil: TeamData = {
  name: 'Brazil',
  abbr: 'BRA',
  formation: '4-3-3',
  color: '#fbe108',
  textColor: '#0a6b3a',
  kit: { shirt: '#fbe108', sleeve: '#1c9e57', outline: '#0a6b3a' },
  gkKit: { shirt: '#2b7fff', sleeve: '#1f63cc', outline: '#0a2f6e' },
  kickoffFwd: 9,
  players: buildSquad(F_433, [
    { num: 1, name: 'ALISSON' },
    { num: 2, name: 'DANILO' },
    { num: 3, name: 'MARQUINHOS' },
    { num: 4, name: 'G. MAGALHÃES' },
    { num: 6, name: 'WENDELL' },
    { num: 5, name: 'BRUNO G.' },
    { num: 8, name: 'PAQUETÁ' },
    { num: 10, name: 'RODRYGO' },
    { num: 7, name: 'RAPHINHA' },
    { num: 9, name: 'ENDRICK' },
    { num: 11, name: 'VINI JR.' },
  ]),
};
