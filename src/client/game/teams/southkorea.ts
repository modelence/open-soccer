import { buildSquad, type TeamData } from './types';
import { F_4231 } from './formations';

// South Korea — 4-2-3-1.
export const southKorea: TeamData = {
  name: 'South Korea',
  abbr: 'KOR',
  formation: '4-2-3-1',
  color: '#c8102e',
  textColor: '#ffffff',
  kit: { shirt: '#c8102e', sleeve: '#a00b24', outline: '#5e0714' },
  gkKit: { shirt: '#111827', sleeve: '#0a0f1c', outline: '#000000' },
  kickoffFwd: 9,
  players: buildSquad(F_4231, [
    { num: 1, name: 'KIM SEUNG-GYU' },
    { num: 22, name: 'SEOL YOUNG-WOO' },
    { num: 4, name: 'KIM MIN-JAE' },
    { num: 5, name: 'KIM TAE-HYEON' },
    { num: 15, name: 'KIM MOON-HWAN' },
    { num: 6, name: 'HWANG IN-BEOM' },
    { num: 8, name: 'PAIK SEUNG-HO' },
    { num: 10, name: 'LEE JAE-SUNG' },
    { num: 19, name: 'LEE KANG-IN' },
    { num: 9, name: 'CHO GUE-SUNG' },
    { num: 7, name: 'SON HEUNG-MIN' },
  ]),
};
