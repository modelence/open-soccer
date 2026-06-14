import { buildSquad, type TeamData } from './types';
import { F_4231 } from './formations';

// Japan — 4-2-3-1 (best-effort current XI).
export const japan: TeamData = {
  name: 'Japan',
  abbr: 'JPN',
  formation: '4-2-3-1',
  color: '#0b1f6b',
  textColor: '#ffffff',
  kit: { shirt: '#0b1f6b', sleeve: '#081852', outline: '#040d2e' },
  gkKit: { shirt: '#2bd47a', sleeve: '#17a95c', outline: '#0a5f33' },
  kickoffFwd: 9,
  players: buildSquad(F_4231, [
    { num: 1, name: 'SUZUKI' },
    { num: 2, name: 'SUGAWARA' },
    { num: 4, name: 'ITAKURA' },
    { num: 16, name: 'WATANABE' },
    { num: 5, name: 'NAGATOMO' },
    { num: 7, name: 'TANAKA' },
    { num: 15, name: 'KAMADA' },
    { num: 8, name: 'KUBO' },
    { num: 10, name: 'DOAN' },
    { num: 18, name: 'UEDA' },
    { num: 11, name: 'MAEDA' },
  ]),
};
