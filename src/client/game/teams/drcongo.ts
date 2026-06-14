import { buildSquad, type TeamData } from './types';
import { F_433 } from './formations';

// DR Congo — 4-3-3.
export const drCongo: TeamData = {
  name: 'DR Congo',
  abbr: 'COD',
  formation: '4-3-3',
  color: '#1f8fff',
  textColor: '#ffd200',
  kit: { shirt: '#1f8fff', sleeve: '#1670cc', outline: '#0b3e72' },
  gkKit: { shirt: '#111827', sleeve: '#0a0f1c', outline: '#000000' },
  kickoffFwd: 9,
  players: buildSquad(F_433, [
    { num: 1, name: 'MPASI' },
    { num: 2, name: 'WAN-BISSAKA' },
    { num: 22, name: 'MBEMBA' },
    { num: 4, name: 'TUANZEBE' },
    { num: 26, name: 'MASUAKU' },
    { num: 6, name: 'MUKAU' },
    { num: 8, name: 'MOUTOUSSAMY' },
    { num: 14, name: 'SADIKI' },
    { num: 10, name: 'BONGONDA' },
    { num: 19, name: 'MAYELE' },
    { num: 20, name: 'WISSA' },
  ]),
};
