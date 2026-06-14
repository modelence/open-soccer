import type { TeamData } from './types';
export type { TeamData } from './types';

// UEFA
import { argentina } from './argentina';
import { france } from './france';
import { spain } from './spain';
import { england } from './england';
import { germany } from './germany';
import { portugal } from './portugal';
import { netherlands } from './netherlands';
import { italy } from './italy';
import { croatia } from './croatia';
import { belgium } from './belgium';
import { switzerland } from './switzerland';
import { denmark } from './denmark';
import { austria } from './austria';
import { turkey } from './turkey';
import { ukraine } from './ukraine';
import { poland } from './poland';
import { serbia } from './serbia';

// CONMEBOL
import { brazil } from './brazil';
import { uruguay } from './uruguay';
import { colombia } from './colombia';
import { ecuador } from './ecuador';
import { paraguay } from './paraguay';

// CONCACAF
import { usa } from './usa';
import { mexico } from './mexico';
import { canada } from './canada';
import { costaRica } from './costarica';
import { panama } from './panama';
import { jamaica } from './jamaica';

// AFC
import { japan } from './japan';
import { southKorea } from './southkorea';
import { iran } from './iran';
import { australia } from './australia';
import { saudiArabia } from './saudiarabia';
import { qatar } from './qatar';
import { uzbekistan } from './uzbekistan';
import { iraq } from './iraq';
import { jordan } from './jordan';

// CAF
import { morocco } from './morocco';
import { senegal } from './senegal';
import { nigeria } from './nigeria';
import { egypt } from './egypt';
import { ghana } from './ghana';
import { cameroon } from './cameroon';
import { algeria } from './algeria';
import { ivoryCoast } from './ivorycoast';
import { tunisia } from './tunisia';
import { southAfrica } from './southafrica';

// OFC
import { newZealand } from './newzealand';

export const TEAMS: TeamData[] = [
  argentina, france, spain, england, germany, portugal, netherlands, italy,
  croatia, belgium, switzerland, denmark, austria, turkey, ukraine, poland, serbia,
  brazil, uruguay, colombia, ecuador, paraguay,
  usa, mexico, canada, costaRica, panama, jamaica,
  japan, southKorea, iran, australia, saudiArabia, qatar, uzbekistan, iraq, jordan,
  morocco, senegal, nigeria, egypt, ghana, cameroon, algeria, ivoryCoast, tunisia, southAfrica,
  newZealand,
];
