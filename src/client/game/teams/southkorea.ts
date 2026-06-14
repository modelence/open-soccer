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
    { num: 1, name: 'JO HYEON-WOO' },
    { num: 2, name: 'KIM MOON-HWAN' },
    { num: 4, name: 'KIM MIN-JAE' },
    { num: 20, name: 'KWON KYUNG-WON' },
    { num: 14, name: 'LEE JAE-SUNG' },
    { num: 6, name: 'HWANG IN-BEOM' },
    { num: 16, name: 'PARK YONG-WOO' },
    { num: 10, name: 'LEE KANG-IN' },
    { num: 11, name: 'HWANG HEE-CHAN' },
    { num: 9, name: 'CHO GUE-SUNG' },
    { num: 7, name: 'SON HEUNG-MIN' },
  ]),
};
