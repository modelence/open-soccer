import { buildSquad, type TeamData } from './types';
import { F_442 } from './formations';

// Sweden — 4-4-2.
export const sweden: TeamData = {
  name: 'Sweden',
  abbr: 'SWE',
  formation: '4-4-2',
  color: '#1f6bd6',
  textColor: '#ffd200',
  kit: { shirt: '#ffd200', sleeve: '#d8b000', outline: '#7a6300' },
  gkKit: { shirt: '#1f6bd6', sleeve: '#1652a8', outline: '#0a2a5e' },
  kickoffFwd: 9,
  players: buildSquad(F_442, [
    { num: 1, name: 'ZETTERSTRÖM' },
    { num: 6, name: 'JOHANSSON' },
    { num: 3, name: 'LINDELÖF' },
    { num: 4, name: 'HIEN' },
    { num: 5, name: 'GUDMUNDSSON' },
    { num: 11, name: 'ELANGA' },
    { num: 7, name: 'BERGVALL' },
    { num: 19, name: 'SVANBERG' },
    { num: 18, name: 'AYARI' },
    { num: 9, name: 'ISAK' },
    { num: 17, name: 'GYÖKERES' },
  ]),
};
