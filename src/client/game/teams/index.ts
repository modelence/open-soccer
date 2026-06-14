// Registry of selectable nations for the FIFA-style team picker. Add a new
// country by creating its file in this folder and appending it here.
import { argentina } from './argentina';
import { france } from './france';
import { spain } from './spain';
import { england } from './england';
import type { TeamData } from './types';

export type { TeamData } from './types';

export const TEAMS: TeamData[] = [argentina, france, spain, england];
