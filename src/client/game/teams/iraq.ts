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
    { num: 12, name: 'JALAL' },
    { num: 2, name: 'SULAKA' },
    { num: 26, name: 'PUTROS' },
    { num: 4, name: 'TAHSEEN' },
    { num: 6, name: 'YOUNIS' },
    { num: 7, name: 'AMYN' },
    { num: 16, name: 'AL-AMMARI' },
    { num: 14, name: 'IQBAL' },
    { num: 11, name: 'QASEM' },
    { num: 18, name: 'HUSSEIN' },
    { num: 17, name: 'JASIM' },
  ]),
};
