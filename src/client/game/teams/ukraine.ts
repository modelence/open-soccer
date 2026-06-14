import { buildSquad, type TeamData } from './types';
import { F_433 } from './formations';

// Ukraine — 4-3-3 (best-effort current XI).
export const ukraine: TeamData = {
  name: 'Ukraine',
  abbr: 'UKR',
  formation: '4-3-3',
  color: '#ffd500',
  textColor: '#15171c',
  kit: { shirt: '#ffd500', sleeve: '#e0bb00', outline: '#7a6500' },
  gkKit: { shirt: '#2b7fff', sleeve: '#1f63cc', outline: '#0a2f6e' },
  kickoffFwd: 9,
  players: buildSquad(F_433, [
    { num: 1, name: 'TRUBIN' },
    { num: 22, name: 'KONOPLYA' },
    { num: 13, name: 'ZABARNYI' },
    { num: 4, name: 'MATVIYENKO' },
    { num: 21, name: 'MYKOLENKO' },
    { num: 8, name: 'MALINOVSKYI' },
    { num: 17, name: 'ZINCHENKO' },
    { num: 10, name: 'SUDAKOV' },
    { num: 7, name: 'YARMOLENKO' },
    { num: 9, name: 'DOVBYK' },
    { num: 11, name: 'MUDRYK' },
  ]),
};
