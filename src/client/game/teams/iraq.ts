import { buildSquad, type TeamData } from './types';
import { F_433 } from './formations';

// Iraq — 4-3-3.
export const iraq: TeamData = {
  name: 'Iraq',
  abbr: 'IRQ',
  formation: '4-3-3',
  color: '#1f9d55',
  textColor: '#ffffff',
  kit: { shirt: '#1f9d55', sleeve: '#147a40', outline: '#0a4523' },
  gkKit: { shirt: '#f59e0b', sleeve: '#c47b06', outline: '#7a4d02' },
  kickoffFwd: 9,
  players: buildSquad(F_433, [
    { num: 1, name: 'JALAL' },
    { num: 2, name: 'BAYESH' },
    { num: 3, name: 'ADNAN' },
    { num: 5, name: 'TAHIR' },
    { num: 13, name: 'JABER' },
    { num: 6, name: 'AMEEN' },
    { num: 17, name: 'RESAN' },
    { num: 7, name: 'ALI' },
    { num: 10, name: 'BAYESH M.' },
    { num: 9, name: 'HUSSEIN' },
    { num: 11, name: 'JABBAR' },
  ]),
};
