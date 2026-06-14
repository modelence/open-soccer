import { buildSquad, type TeamData } from './types';
import { F_433 } from './formations';

// Cameroon — 4-3-3.
export const cameroon: TeamData = {
  name: 'Cameroon',
  abbr: 'CMR',
  formation: '4-3-3',
  color: '#0a7a3b',
  textColor: '#ffd200',
  kit: { shirt: '#0a7a3b', sleeve: '#075c2c', outline: '#033017' },
  gkKit: { shirt: '#c8102e', sleeve: '#a00b24', outline: '#5e0714' },
  kickoffFwd: 9,
  players: buildSquad(F_433, [
    { num: 1, name: 'ONANA' },
    { num: 2, name: 'FAI' },
    { num: 3, name: 'CASTELLETTO' },
    { num: 5, name: 'NOUHOU' },
    { num: 24, name: 'TOLO' },
    { num: 8, name: 'ANGUISSA' },
    { num: 18, name: 'KUNDE' },
    { num: 11, name: 'HONGLA' },
    { num: 7, name: 'MBEUMO' },
    { num: 9, name: 'CHOUPO-MOTING' },
    { num: 10, name: 'TOKO EKAMBI' },
  ]),
};
