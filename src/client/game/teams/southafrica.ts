import { buildSquad, type TeamData } from './types';
import { F_433 } from './formations';

// South Africa — 4-3-3.
export const southAfrica: TeamData = {
  name: 'South Africa',
  abbr: 'RSA',
  formation: '4-3-3',
  color: '#0a7a3b',
  textColor: '#ffd200',
  kit: { shirt: '#0a7a3b', sleeve: '#075c2c', outline: '#033017' },
  gkKit: { shirt: '#f59e0b', sleeve: '#c47b06', outline: '#7a4d02' },
  kickoffFwd: 9,
  players: buildSquad(F_433, [
    { num: 1, name: 'WILLIAMS' },
    { num: 2, name: 'MUDAU' },
    { num: 5, name: 'MBEKILE' },
    { num: 4, name: 'XULU' },
    { num: 3, name: 'MODISE' },
    { num: 8, name: 'MOKOENA' },
    { num: 6, name: 'MVALA' },
    { num: 10, name: 'ZWANE' },
    { num: 7, name: 'TAU' },
    { num: 9, name: 'FOSTER' },
    { num: 11, name: 'MAYO' },
  ]),
};
