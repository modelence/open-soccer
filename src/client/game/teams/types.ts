// Country squad data model. Each nation lives in its own small file under
// this folder and exports a single `TeamData`. The engine is team-agnostic:
// it takes two `TeamData` (home + away) and builds the match from them.

export interface Vec {
  x: number;
  y: number;
}

export interface Kit {
  shirt: string;
  sleeve: string;
  outline: string;
}

export interface SquadPlayer {
  /** Shirt number, shown on the jersey + broadcast lower-third. */
  num: number;
  /** Surname, shown in the broadcast lower-third. */
  name: string;
  /** Formation position as a fraction of the field, attacking RIGHT. */
  pos: Vec;
}

export interface TeamData {
  name: string;
  /** 3-letter code for the scoreboard. */
  abbr: string;
  /** Display formation, e.g. "4-3-3". */
  formation: string;
  /** Primary kit colour used for UI accents (bars, badges). */
  color: string;
  /** Legible colour to draw on top of `color`. */
  textColor: string;
  /** Outfield kit. */
  kit: Kit;
  /** Goalkeeper kit (distinct, like real football). */
  gkKit: Kit;
  /** Index of the player who takes the kickoff (usually the central striker). */
  kickoffFwd: number;
  /** Exactly 11 players; index 0 is always the goalkeeper. */
  players: SquadPlayer[];
}

/** Pairs a name/number roster with a shared formation position template so
 *  each country file stays tiny. */
export function buildSquad(
  formation: Vec[],
  roster: { num: number; name: string }[],
): SquadPlayer[] {
  return roster.map((r, i) => ({ num: r.num, name: r.name, pos: formation[i] }));
}
