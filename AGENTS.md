## PROJECT: PitchKick — arcade browser football game

A FIFA-like top-down football game played in the browser vs the CPU. Fully
client-side, rendered on `<canvas>` with `requestAnimationFrame`. No backend
game state yet (no Stores/queries for gameplay).

### Game architecture
- FILE SPLIT (June 2026, domains 1-5 of a 10-domain analysis): the old monolith
  `engine.ts` (~2,834 lines) was split BY DOMAIN into pure/stateless modules.
  `engine.ts` now imports from them and is ~1,924 lines (just the stateful
  `PitchKickGame` class: loop, physics, input, AI, possession, match rules).
  New sibling files in `src/client/game/`:
  - `constants.ts` — ALL world scale/geometry/physics/gameplay tunables
    (FIELD_W, PX_PER_M, FIELD_H, M(), goal geom, PLAYER_R, BALL_R, BALL_VIS_SCALE,
    PLAYER_SCALE, GRAVITY/BOUNCE/CONTROL_HEIGHT, every *_SPEED, CONTROL_DIST,
    BALL_DECAY, CHARGE_FULL, KICK_BUFFER, MATCH_*_SECS, ACCEL, TURN_RATE,
    HAIR_COLORS, SKIN_TONES, CANVAS_W/H). Import-free.
  - `math.ts` — pure helpers: len, dist, clamp, shade, distToSegment.
  - `types.ts` — Vec, Team, Role, PlayerEntity, HudState, StateListener.
  - `projection.ts` — the TV broadcast camera: holds module state viewCamX/Y,
    exports `proj()`, `setCamera(camX,camY)`, S_FAR/ZOOM/PITCH_TOP and the
    CAM_MIN/MAX/CAM_Y_MIN/MAX clamps. setCamera is how the engine syncs the cam.
  - `render.ts` — PURE renderer (~810 lines, was the biggest domain). Exports
    `renderScene(ctx, scene)` + `Scene`/`BallView` types. The engine builds a
    `Scene` snapshot each frame (camX/camY, ball, players[] as {p,kit} away-first,
    controlled, switchHint) and hands it over; `renderScene` calls `setCamera`
    then draws sky/crowd/pitch/goals/depth-sorted sprites+ball. NO game state
    lives here — all former `this.X` draw methods are private free functions.
  engine.ts RE-EXPORTS `CANVAS_W`, `CANVAS_H`, `HudState`, `TeamData` so
  HomePage.tsx still imports them from `@/client/game/engine` unchanged.
  Domains 6-10 (input, player-actions, off-ball AI, possession/physics, match
  rules) were NOT extracted — they read/write shared private class state and
  would need a GameContext refactor (higher risk); left in engine.ts for now.
- `src/client/game/engine.ts` — `PitchKickGame` class: the whole game loop,
  physics, input handling (window keydown/keyup), PC AI, and canvas rendering.
  REAL-SCALE PITCH: everything derives from `PX_PER_M = FIELD_W/105` (a
  regulation pitch is 105m × 68m). FIELD_W=2200 (105m, anchor), FIELD_H=
  Math.round(68*PX_PER_M)≈1425 (true 105:68 aspect — was 950, too narrow).
  Helper `M(metres)` → field px. NOTE: formations & proj() are all FRACTIONS
  of FIELD_W/FIELD_H, so the camera framing + players' on-screen positions/
  scales are UNCHANGED by the FIELD_H grow; only relative marking/player/ball
  sizes became correct. Caveat: speeds are still px/s, so vertical (depth)
  coverage now reads ~⅓ slower on screen than before — retune speeds if
  defending feels sluggish. 56px margin (`CANVAS_W=1162`/`CANVAS_H=700`
  exported). The camera only shows part of the pitch (FIFA tele cam style):
  engine `camX` follows ball + vel*0.25 lookahead with exponential smoothing
  (k = 1-exp(-2.6dt)), clamped to CAM_MIN=360..CAM_MAX=FIELD_W-360. Render
  syncs module-level `viewCamX` from it; `proj()` offsets x by viewCamX.
  CLOSER ZOOM: S_FAR=0.66, S_NEAR=1.24, PITCH_TOP=110, PITCH_DRAW_H=560.
  BROADCAST ZOOM/CROP (user: "camera too far, don't show full field"):
  global `ZOOM=1.5` multiplies scale `s` AND the vertical offset, so the
  field is enlarged and CROPPED (touchlines run off top/bottom) like a TV
  tele cam. proj y = VIEW_ANCHOR_Y(400) + (baseDepthY(y)-baseDepthY(viewCamY))
  *ZOOM, where baseDepthY is the pre-zoom integral foreshortening. Camera now
  ALSO follows depth: engine `camY` follows ball.y + vy*0.18 (gentler,
  k=1-exp(-1.8dt)) clamped CAM_Y_MIN=0.30·FIELD_H..CAM_Y_MAX=0.70·FIELD_H;
  render syncs `viewCamY`. CAM_MIN/MAX pulled to 360 so the goalmouth stays
  framed at the tighter horizontal view. The ball sits ≈VIEW_ANCHOR_Y on
  screen. To zoom more/less change ZOOM (and re-check goal framing/anchor).
  Crowd+hoarding now anchor to the DYNAMIC far-touchline screen y
  (`proj(0,0).y`) since the far line moves with the depth pan; parallax uses
  farScale=S_FAR*ZOOM.
  Players projected off-screen (±60px horizontally) are culled.
  Calls a `HudState` listener each frame to push score/time/possession to React.
- `src/client/pages/HomePage.tsx` — hosts the canvas, scoreboard HUD, intro +
  team-select overlays, GOAL flash, and the controls legend. A `phase` state
  drives everything: `'intro'` (Kick Off button) → `'select'` (team picker) →
  `'playing'` (engine running). The engine is instantiated in a `useEffect`
  keyed on `phase`/`gameKey`, passing the two selected `TeamData`. The
  scoreboard is a compact FIFA pill (`absolute top-3 left-3`): `[home bar][abbr]
  [home]–[away][abbr][away bar][clock]`, colours/abbrs from the selected teams.
  Header shows Rematch (replay same teams) + Change teams (back to select) while
  playing.
- TEAM-SELECT SCREEN (FIFA-style, `phase==='select'`): two `TeamCrest` panels,
  LEFT = you (home), RIGHT = CPU (away). One side is `activeSide` at a time
  (home first). A window keydown effect (only mounted during select): ArrowLeft/
  Right cycle the active side's team (wrapping; CPU skips the home pick so the
  two differ); Enter / S / D confirm — home confirm locks (✓) and hands control
  to the away side, away confirm sets `phase='playing'`. Selection held as
  `homeIdx`/`awayIdx` into `TEAMS`. Crest (`TeamCrest`) draws a `KitJersey` SVG
  shirt illustration from the team's `kit` colours (shirt/sleeve/outline) with the
  kickoff striker's real shirt number, on a dark gradient block faintly tinted by
  team.color; the full team name sits below in `text-lg sm:text-xl`. Volt ring +
  pulsing chevrons when active. `readableOn(hex)` picks a legible number colour.
- TEAM DATA (per-country, small files): `src/client/game/teams/` — one file per
  nation exporting a `TeamData` (name, abbr, formation string, color/textColor
  for UI, outfield `kit` + `gkKit`, `kickoffFwd`, and 11 `players`
  {num,name,pos}; index 0 = GK). Each `Kit` has shirt/sleeve/outline + an optional
  `shorts` (real home-kit shorts colour, e.g. Germany black, Argentina/Uruguay
  black, England/Spain navy, Brazil/Colombia/Sweden blue, Portugal/Senegal/
  Australia green; falls back to `sleeve`); `shorts` drives both the team-select
  `KitJersey` SVG and the in-game player shorts. `types.ts` defines the model + `buildSquad()`
  (pairs a roster with a shared formation template); `formations.ts` holds
  position templates `F_433` / `F_4231` / `F_442` / `F_352` / `F_343` (fractions,
  attacking RIGHT). `index.ts` exports the `TEAMS` array (the selectable roster).
  The 48 official WC2026 qualified nations (verified against Wikipedia's qualified
  list June 2026) — one file each, grouped by confederation in `index.ts`:
  UEFA 16, CAF 10, AFC 9, CONMEBOL 6, CONCACAF 6, OFC 1. NOTE: Italy, Denmark,
  Ukraine, Poland, Serbia, Costa Rica, Jamaica, Nigeria, Cameroon did NOT qualify
  (do not re-add — their files were deleted).
  ROSTERS VERIFIED (June 2026): every team's 11-man XI was transcribed ONE BY ONE
  from the official Wikipedia "2026 FIFA World Cup squads" page (real shirt numbers
  + real current players, captains honoured, withdrawn/injured players excluded —
  e.g. Germany has NEUER back as #1, no retired players like Kroos). The fetch
  method: get section indices via the Wikipedia parse API
  (`action=parse&page=2026_FIFA_World_Cup_squads&prop=sections`), then fetch each
  team's wikitext by `&section=N`. Each XI is ordered GK→4DF→4MF→2FW to match the
  engine's index→role mapping (i=0 GK, i≤4 DF, i≤8 MF, else ST; kickoffFwd=9 =
  central striker). When two squad members share a surname, disambiguate with an
  initial (e.g. `N. AL-DAWSARI`/`S. AL-DAWSARI`, `J. RODRÍGUEZ`, `I. SARR`).
  Surnames UPPERCASE with diacritics preserved. DO NOT rewrite squads from memory —
  always re-fetch the source if updating.
  WC2026 SCHEDULE & DEFAULT MATCHUP (`src/client/game/teams/schedule.ts`):
  a predownloaded group-stage fixture list so the team picker DEFAULTS to the
  live/next real World Cup 2026 game. Exports: `GROUPS` (the REAL official FIFA
  Dec-2025 draw — 12 groups A-L × 4 of our 48 TeamData, sourced from Al Jazeera,
  e.g. A=Mexico/SouthAfrica/SouthKorea/Czechia, I=France/Senegal/Iraq/Norway),
  `MATCHES` (all 72 real group-stage fixtures as `{kickoffUTC:Date, home, away,
  group, venue}` with the published GMT(=UTC) kickoff times Jun 11-28 2026,
  sorted by time; venues use FIFA stadium names, host-city mapping approximate),
  and `findCurrentOrNextMatch(now=new Date()): Match|null` — returns the LIVE
  match (kickoff ≤ now < kickoff+110min) else the next upcoming else null.
  Only GROUP STAGE is stored (knockouts reference TBD group-position teams, not
  usable as concrete defaults). HomePage seeds `homeIdx`/`awayIdx` from it once
  (via `useRef`, so nav still works) and renders a `FixtureBanner` on the select
  screen (Live now / Next up badge + Group + venue + local kickoff time). Falls
  back to TEAMS[0]/[1] when no fixture is current/upcoming.
  The ENGINE is team-agnostic: `new PitchKickGame(canvas, listener, homeTeam,
  awayTeam)` builds the match from the two `TeamData` (away mirrored on x),
  stores `this.homeTeam`/`this.awayTeam`, and uses them for names/numbers/kits
  (`kitFor` method) + GOAL / full-time messages. To add a nation: create its
  file and append it to `TEAMS`.
- Player names: each `PlayerEntity` has a `name` (surname) and real `num`. Names
  are shown as FIFA broadcast lower-thirds in the BOTTOM CORNERS (NOT above the
  player): home active player bottom-left, CPU active player bottom-right
  (each tag's accent + number text colour come from the selected team) —
  `PlayerNameTag` in HomePage, fed by HUD fields `homePlayer`/`awayPlayer`.
  `homePlayer` = `this.controlled`; `awayPlayer` = `this.awayActive` (away
  carrier, else outfield CPU nearest ball, computed in `updateAwayActive`).
  Above the head: the human-controlled player wears a solid green chevron; the
  Q switch-hint wears a hollow chevron. The CPU (away active) player gets NO
  above-head marker.
- Shot/pass power gauge: rendered in React as a thin (h-1) fill line directly
  UNDER the home player's bottom-left `PlayerNameTag`, fed by HUD `charge`
  (0..1 or null) from `chargeLevel()`. Gradient green->yellow->red, width
  animates with charge, hidden when not charging. The old canvas bottom-center
  `drawPowerMeter` segmented bar was removed.
- Match clock: counts UP like a real soccer clock (0:00 -> 90:00), accelerated.
  Engine tracks real `elapsed` secs; `MATCH_REAL_SECS=180` real seconds maps to
  `MATCH_DISPLAY_SECS=5400` (90'). HUD field is `clock` (in-game secs);
  `fmtTime` renders MM:SS. Full time fires at `elapsed >= MATCH_REAL_SECS`.

### Controls (FIFA PC style)
- Arrows = move, E = sprint, D = shot, S = short pass, A = long pass,
  W = through pass (leads receiver ~110px toward goal), Q = switch player.
- Q+W = LOFTED through ball (FIFA chipped through pass): hold Q while charging
  W. Q acts as a MODIFIER, not a player-switch, when used during a kick —
  handleSwitchKey suppresses the switch if owner===controlled, a charge is in
  progress, or any KICK_KEY is held. chargeLofted is captured at charge start
  (this.keys.has('KeyQ')); fire point recomputes lofted = chargeLofted ||
  keys.has('KeyQ') and forwards it through doHomeKick(code,charge,lofted) into
  passAssisted opts.lofted. In passAssisted, `isThrough && lofted` uses the
  SAME lead-into-space aim as the grounded through ball but a ballistic arc
  (T=clamp(0.5+d/M(95)+charge*0.2,0.5,1.15), vz=0.5*GRAVITY*T, hspeed=(d/T)*1.08)
  — lower/faster than a long ball so it still threads behind a stepping defender.
- KICK CHARGING (FIFA-researched: passes/shots charge on PRESS, execute
  on RELEASE; hold duration = power): chargeKey/chargeTime fields,
  CHARGE_FULL=0.8s. Release reads t=0..1; receiver & aim resolved at
  RELEASE (late lock). Lost ball mid-charge cancels; kickoff resets.
  Shot power = 430 + 870*t (~3x spread so charge is clearly felt; was
  500+340 which felt flat). Pass power = frictionBase * (0.78 + 0.55*t),
  capped 1600 — tap arrives soft, full overruns.
  Gauge UI: FIFA-style FIXED power meter — `drawPowerMeter(ctx)` called
  last in render(), a 320x16 rounded bar centred at bottom of screen
  (y=CANVAS_H-34), green→yellow→red gradient with diagonal chevron ticks
  and a "POWER" label, only while chargeLevel()!=null. (Replaced the old
  tiny above-the-player gauge — FIFA shows power bottom-centre, not on the
  player.) justReleased array cleared each frame like justPressed.
- INPUT BUFFERING (FIFA first-time kicks): a shot/pass pressed WHILE the ball
  is still travelling to your player used to be DROPPED (charge only started
  `if (!chargeKey && owns)` and cancelled the instant `!owns`). Now: when the
  ball is loose from our own kick (`incoming = !owns && owner===null &&
  lastKicker.team==='home'`), a kick key starts a buffered charge with
  `bufferTimer=KICK_BUFFER` (0.5s). While in transit it keeps charging (or, if
  released early, sets `kickPending`); the moment possession is gained (owns
  becomes true) it fires via doHomeKick — a first-time shot/pass. Buffer is
  dropped if an opponent intercepts (owner.team==='away') or the window
  expires. The KeyD standing-tackle is SUPPRESSED while `incoming` so it
  buffers a shot instead of lunging at our own pass. bufferTimer/kickPending
  reset on kickoff.
- JUST-KICKED GRACE (`ballFree`, set 0.12s in afterKick): a struck ball used
  to be "canceled" the same frame — afterKick sets owner=null but updateBall
  runs AFTER resolvePossession, so the ball is still at the kicker's feet when
  resolvePossession hands it to the nearest player within CONTROL_DIST
  (~29px), excluding only the locked kicker. An opponent leaning on the
  kicker's back is in range → instantly "receives" the kick. Fix: while
  ballFree>0, resolvePossession keeps owner=null and returns, so the ball
  physically clears the body cluster (~100-150px) before anyone can claim it.
  A defender genuinely down the lane can still intercept once it expires.
  ballFree decremented in the timers block; reset on kickoff.
- Shot assist (`shootAssisted`): shot always goes toward the CPU goal.
  The VERTICAL arrow held at the moment of pressing D picks the ZONE of
  the frame (Up = top half, desired spot = top corner; Down = bottom
  half; none/horizontal-only = whole frame, desired = center; facing.y
  lean >0.45 fallback when no arrows held). Within the zone, 9 candidate
  y's are sampled and scored: min(clearance,50) + inputPreference*16,
  where clearance = nearest distance of ANY other player (both teams) to
  the ball->target segment minus their radius (distToSegment helper near
  top of engine.ts). Picks the clearest lane so shots steer around
  blockers — user demanded this after shots kept hitting opponents.
- Pass receiver selection (v2, FIFA-researched after W kept skipping the
  near runner): the HELD ARROW direction at the moment of the pass picks
  the receiver (`heldDir`, falls back to facing when no arrow held).
  Score = align*260, -400 if align<0.1 (behind aim = last resort);
  short/through subtract d*(0.3/0.22) so the FIRST man in the aimed cone
  wins; long ADDS clamp(d,0,900)*0.12 (far outlet). NO distance bands
  (old ~380 through band caused the skip). Through passes exclude the GK.
  No-target fallback knock also uses heldDir.
  Control follows YOUR pass to the receiver (user-initiated, FIFA-style).
- BALL GRAVITY ON RECEPTION (added after "receiver runs away and misses the
  pass"; v2 after "I keep a direction pressed and they run off and miss"):
  passAssisted sets `this.passReceiver = target` (right after the null-target
  check, so all branches share it); cleared in resolvePossession (once
  possession resolves) and resetKickoff. In updateControlled's movement `else`
  block, while `incoming && p === this.passReceiver`, we PREDICT whether the
  user's CURRENT held run will actually intercept the ball: a stepped 1.3s
  simulation (stepT 0.05) advances the player at the input-intended velocity
  and the ball with its exponential friction (grounded k=BALL_DECAY=1.5,
  airborne k*0.12) — `dispK=(1-e^{-k·stepT})/k` per step — tracking minGap (the
  closest the run gets to the ball) and meetX/Y (ball pos at that moment). This
  friction model is essential: a constant-velocity approx made a slowing ball
  look like it could always catch a runaway player, so gravity barely applied
  — the v1 bug. `gravity = hasInput ? clamp((minGap-(CONTROL_DIST+6))/45,0,1) :
  1`. So if the current run already meets the ball (minGap within reach) →
  gravity 0, run untouched; if it would miss → ramps to full override toward
  meetX/Y; no arrow held → full auto. Heading = lerp(input, dir-to-meet,
  gravity); speed bumps to RUN_SPEED when gravity>0.25 (unless sprinting) so
  they can actually get there.
- GOALKEEPER REWORK (added after "keeper deflects onto shooter / too passive /
  no pickup / no control-switch / W rush"). 5 changes in engine.ts:
  (1) ACTIVE POSITIONING — `keeperTarget` replaced by `keeperPlan(p)` returning
  {pos,speed}. Base behaviour = angle play: come off the line by
  `comeOut=clamp(220-ballDX*0.26,14,150)` and shift BOTH axes toward the ball
  (`f=clamp(comeOut/gl,0,0.5)` lerp from goal-center toward ball), all clamped
  inside the box (x to ownGoalX±M(16) boxEdge, y to goalTop+14..goalBottom-14).
  Speed RUN_SPEED if >90px away else WALK_SPEED. Used via offBallPlan
  (`if (p.isGK) return this.keeperPlan(p)`).
  (2) SWEEPER/AGGRESSION RUSH — auto-rush when a loose ball (no owner) or an
  OPPONENT carrier is inside the box AND no own defender is within 64px of the
  ball; also manual rush when home GK + `gkRush>0`. "In the box" requires BOTH
  depth (ballDX<M(18)) AND centrality (|by-mid|<M(18)) — without the centrality
  gate the keeper charged sideways out of his net on FLANK attacks (ball near
  the goal line in X but far out wide), leaving the goal gaping. Flank balls now
  keep him home playing the angle/near post. Rush charges at SPRINT_SPEED toward
  the ball lead-point (ball + vel*lead). MANUAL W rush vs AUTO sweeper rush differ
  in leash: auto is clamped to the box (x≤M(16) out, y within goal mouth ±28) so
  he never strays to midfield; MANUAL W is an explicit "rush keeper out" so he
  chases the REAL ball up to M(40) out across the FULL pitch width (y 20..FIELD_H-20).
  Bug fixed: previously BOTH used the box clamp, so pressing W with a central
  upfield ball slid the keeper horizontally to the box edge and stopped instead
  of running AT the ball — now manual W aims at the actual ball. Handles 1v1.
  (3) PICK UP LOOSE/SLOW BALL — in resolvePossession the GK's gather reach is
  CONTROL_DIST + (ballSpeed<320 ? 34 : 18) vs CONTROL_DIST for outfielders, so a
  slow ball near his feet is claimed before an attacker can steal it.
  (4) CONTROL SWITCH TO GK — removed the old `!best.isGK` exclusion; when the
  home GK gains possession he becomes `this.controlled` (auto-switch like any
  outfielder). On any GK gain we set stealProtect=1.1 (secure catch, can't be
  immediately re-stolen) and clear gkRush.
  (5) GK HOLDS BALL AT BODY — `dribble(owner)` has a GK branch at the top:
  ball snaps to the keeper's body (lerp 0.6), z/vz zeroed, velocity = owner's —
  so a saved/caught ball stays glued instead of being pushed forward onto the
  onrushing shooter (the old deflect-onto-shooter bug).
  W-WITHOUT-BALL: in updateControlled, `!owns && !incoming`: a TAP of W sets
  `gkRush=1.5`, and HOLDING W refreshes `gkRush` to ≥0.25 each frame (FIFA
  hold-to-rush) so the keeper stays out instead of back-pedalling mid-charge.
  gkRush decays each frame in update(), reset in resetKickoff, cleared on GK gain.
  YO-YO FIX v2 (after "GK rushes too early while I'm far, then goes back as I
  get closer"): the v1 attempt that committed the keeper EARLY (carrier within
  M(28) and approaching) backfired — he bolted off his line while the attacker
  was still way out, parked at the box edge (clamped), then back-pedalled toward
  goal tracking the ball as the attacker finally entered the box. Fix: the AUTO
  carrier rush now triggers ONLY once the carrier is genuinely CLOSE — within
  M(13) of own goal (≈ penalty spot) AND central (|carrier.y-mid|<M(20)). Until
  then the keeper just plays the angle (comeOut). Because the trigger is now
  inside the box, the rush target (the ball, clamped to box edge M(16) / lateral
  mid±M(14)) never makes him retreat — keeper and attacker converge as he comes
  out to smother, and his bigger gather reach wins it. `carrierClose =
  |carrier.x-ownGoalX|<M(13) && |carrier.y-mid|<M(20)`; loose-ball rush still
  needs ballInBoxX && ballCentral. Holding W still overrides for a manual charge.
  COVERING-DEFENDER GUARD (added after "should the keeper rush if defenders are
  between him and the ball?"): autoRush also requires `!defenderCovering` — no
  own outfielder is positioned GOAL-SIDE of the ball (|m.x-ownGoalX| < ballDX-8)
  AND within 70px of the keeper→ball segment (perp distance via projection t
  clamped 0..1). If a defender is covering the lane the situation's handled, so
  the keeper holds his line instead of charging out past his own man and
  vacating the goal. `defenderOnBall` (mate within 64px of ball) still applies
  too. MANUAL W ignores both guards — explicit player command.
- PASS-LANE OPENNESS (added after "passes go straight into the opponent"):
  receiver selection now also scores how OPEN the passing lane is, not just
  alignment+distance. For ground passes (short/through, NOT lofted long) each
  mate's lane endpoint (`passLaneEnd`: short = receiver +vel*0.2, through =
  led into their run, mirrors passAssisted's aim) is tested vs every outfield
  opponent via distToSegment - o.r. If clearance < LANE_OK(26px) the mate is
  penalized (LANE_OK-clearance)*7 — a defender in the lane (clearance≈0) ≈
  -180, strong enough to flip to an open teammate in the same direction but
  not an absolute veto. Opponents within 34px of the kicker are IGNORED (the
  back-presser sits at the start of every lane; handled by ballFree grace).
  Long passes skip the lane test (they fly over). This is the FIFA-assist
  behaviour: avoid threading the ball into a defender's feet.
- Switch selection (`switchScore`, lower = better): when CPU has the ball,
  candidates are scored by distance to an INTERCEPT point ~70px ahead of
  the carrier (direction = 50/50 blend of "toward home goal at x=0" and
  carrier velocity), with -55 bonus for goal-side players (p.x < carrier.x-5)
  and +60 penalty for players behind the play (p.x > carrier.x+15).
  Loose ball / own possession: distance to ball position + vel*0.35.
  User demanded this after Q kept picking players above/below the carrier
  instead of the goal-side defender. Hint shows when candidate score +25
  beats controlled's score.
- NO other automatic switching (user explicitly requested this). A hollow ▽
  marker (`switchHint`) shows who Q would select: home ball-owner if not
  controlled, else nearest home player to ball when meaningfully (30px)
  closer than the controlled one. Solid volt ▼ = controlled player.
- When a home outfield player gains possession (interception, loose ball,
  received pass), control AUTO-SNAPS to them in `resolvePossession`
  (FIFA-style: you always control the man on the ball). The GK is the
  exception — he auto-distributes. Off-ball switching is still Q-only.
  The old "stand and shield until Q" branch remains only as a fallback
  (reachable if the user Qs away from the carrier).

### Visuals: TV broadcast pseudo-3D camera (v3, user-requested)
- User never wanted pure top-down — wanted FIFA/TV angle. Simulation stays
  flat 2D (x = goal-to-goal, y = depth between touchlines); ONLY rendering
  changed. Projection in engine.ts top: `proj(x,y)` → screen {x,y,s} with
  scale lerp S_FAR=0.56 (far touchline, y=0) → S_NEAR=1.0 (near, y=FIELD_H);
  screenY uses the INTEGRAL of scale so vertical foreshortening is correct.
  PITCH_TOP=116, PITCH_DRAW_H=510, CANVAS_H=700 (CANVAS_W unchanged).
- `drawHumanoid()` draws UPRIGHT footballers at foot position, scaled by
  depth: two-tone legs (skin + sock + boot w/ kit-accent flash) scissor with
  distance-driven `animPhase`, lift on swing, kick pose extends striking leg,
  arms counter-swing (far arm behind torso, near in front). GRAPHICS PASS:
  running LEAN (ctx.rotate(vx/SPRINT*0.13) when moving), torso vertical
  GRADIENT via shade() helper, collar arc, side seam, shirt NUMBER (per
  SHIRT_NUMBERS[i], drawn only when toward<0.1 = seeing the back), neck
  segment, radial head-shading gradient, gradient shorts. Head shows
  back-of-head hair when facing away (facing.y<-0.3), mirror by facing.x
  sign. Body height 44 at scale 1. HEAD radius `HR=2.9` (REAL proportion:
  ≈7.5 heads tall → ~0.24m head ≈ ball size; was 4.4 cartoon big-head which
  made the true-scale ball look wrong — user noticed). Hair/sideburn/neck
  all scale off HR. Markers ▼/▽ at q.y - 50*gs.
  `shade(hex,f)` global helper lightens/darkens #rrggbb by a factor.
- BODY ANATOMY ANCHORS (true ~7.5-heads proportion, audited): hipY=-H*0.47
  (raised from 0.42 so legs aren't stubby), shoulderY=-H*0.82 (was 0.78),
  headY=-H*0.92 (was 0.9). Torso narrowed to ±5.5 shoulders / ±4.4 hem (was
  6.5/5.2) ≈0.46m shoulders; side seam ±2.9→2.4 (was 3.4/2.8). Shorts
  roundRect(-5,...,10,8) (was -6,12). Arms lineWidth 2.5 ≈0.10m (was 3),
  anchors dir*4.8/6/4.4, hand r1.4 (was 5.5/7/5, r1.6). Limbs were ~15-20%
  too broad before this pass.
- LEG/BOOT THICKNESS audited to true scale (1 local unit ≈0.042m): thigh
  lineWidth 3.3 (~0.14m), shin 2.8 (~0.11m calf), sock tapers 2.5→1.9 toward
  the ankle (~0.07m), knee dot 1.5, boot ellipse 3.5×1.4 + accent 1.3×0.5.
  NOTE: ball PHYSICS radius BALL_R is true-scale, but the DRAWN ball is
  oversized by BALL_VIS_SCALE=1.3 (≈5.7×s px diameter) — football games draw
  the ball bigger than life so it's trackable. True-scale (4.38×s) read as
  "too small" to the user across several rounds; collision still uses BALL_R.
  Thigh ≈2.9×s px. When a user says "ball smaller than legs" prefer THINNER
  LEGS, but the visual ball is now deliberately ~head-sized for playability.
- LEGS are TWO-BONE IK (`drawLeg(footX,footY,lift,hipX,far)`): SEG=10.8
  thigh≈shin, knee solved at half hip→foot distance + perpendicular rigid
  offset (hgt=sqrt(SEG²-a²)) bent FORWARD (perp x-sign matched to facing),
  reach-clamped. Draws thigh (hip→knee skin), shin (knee→calf skin,
  calf→foot sock), knee highlight dot, angled boot w/ kit accent. `far`
  leg shaded darker. Called far first (drawLeg(...,-side*2.2,true)) then
  near (drawLeg(...,side*2.2,false)).
- Pitch: `projPath()` helper projects polygons. GRAPHICS PASS: 20 mow
  stripes each with its own vertical depth gradient, gradient apron,
  projected lines/boxes, centre circle + spot, penalty SPOTS + "D" arcs
  (via `strokeArc()`), corner arcs, and a radial VIGNETTE overlay.
  `strokeArc(cx,cy,r,a0,a1)` samples a field-space arc through proj;
  `spot(x,y)` draws a marking dot. GRASS TEXTURE: `drawGrassSpeckle()`
  (REPLACED the old horizontal mow lines per user request) — procedural
  blades on a 26px grid via deterministic per-cell sin-hash (stable, no
  flicker), short leaning tufts lighter/darker than turf, only visible
  cells visited, near tufts larger via proj scale.
- Goals are REAL standing frames: `goalGeom()` posts at (0|FIELD_W,
  goalTop/goalBottom), postH=M(2.44)*s, net + back structure drawn BEFORE
  players (`drawGoalBack`), posts+crossbar AFTER (`drawGoalFront`).
- FULL ENCLOSED NET (`drawGoalBack`): four wire panels via `netMesh(bf,bn,tf,
  tn,nu,nv,disp?)` (+`bilerp` of 4 screen corners) — back panel + roof +
  far-side + near-side, net sloping to 0.82 height at the back. HIT RIPPLE:
  engine `netRipple{left,right}` (0..1, decays ~0.6/s) passed in Scene;
  `startCelebration` bumps the scored side to 1; ALL FOUR panels displace via
  per-panel disp fns sharing `wobAt(phase)` cos shimmer: back = sin(πu)·sin(πv)
  bell out+down; roof = sin(πu)·v sag (pinned crossbar, deepest at back); sides
  = u·sin(πv) billow out+flutter (pinned post/rails, strongest at back). All
  pinned to the rigid frame, sign per `out` = side.
- GEOMETRY FIX (user: posts/boxes floated off the field line): the projection
  maps a CONSTANT-X field line (goal line, halfway, box depth-edge) to a BOWED
  curve, but they were drawn as straight 2-pt chords while posts sit at true
  proj positions → ~64px float. `projPathSmooth(pts,close,steps=12)`
  subdivides each segment so those lines follow the bow; used for the field
  outline, halfway line, and both boxes. Posts/boxes now sit ON the line.
- GOAL CELEBRATION (engine): scoring no longer instantly resets. `handleGoals`
  → `startCelebration(scoringTeam,msg,nextKickoff,side)`: settles the ball in
  the net (x = ±M(1.4) past the goal line), bumps `netRipple`, sets
  `celebration=4`s + `celebrateTeam`/`pendingKickoff`/`scorer` (=lastKicker if
  same team), flags non-GK players `celebrating=true`. `update()` runs
  `updateCelebration` (scorer wheels to the near corner, M(16) in; teammates
  mob behind) + `updateCamera` while frozen, then `resetKickoff(pendingKickoff)`
  when it expires. `drawHumanoid` raises BOTH arms above the head when
  `p.celebrating`. `PlayerEntity.celebrating?:boolean` in types.ts.
  CONCEDING SIDE NOT FROZEN (added after "opponent players freeze completely
  during celebration"): updateCelebration now loops ALL players, not just the
  scoring team. Non-celebrating players (the whole conceding team + the scoring
  keeper) walk back toward their formation `anchor` at WALK_SPEED*0.6 (slow,
  dejected) instead of standing still; the conceding keeper instead drifts
  toward the ball in the net (retrieving it). `concededTeam = (p.team==='home')
  !== scoredRight`.
- Stadium dressing: gradient sky, deterministic crowd dots, PITCHKICK
  hoarding strip above far touchline.
- Ball + players depth-sorted together into one draw list (ball is a
  drawable at depth ball.y); ball drawn with radial gradient, lifted 0.7r.
- Kits: HOME_KIT blue / AWAY_KIT red; HAIR_COLORS/SKIN_TONES vary per player.
- Researched open sprite options earlier: Kenney Sports Pack (CC0, static
  poses), LPC (4-dir 3/4 view) — procedural chosen deliberately.
- Uses ctx.roundRect (Chrome 99+/modern browsers OK).

### Movement feel (tuned for smoothness, v2)
- Inertia: `steer()` lerps velocity toward target (`ACCEL=8`/s); facing
  rotates at max `TURN_RATE=13` rad/s (`faceToward`). AI `moveToward`
  decelerates within 36px of target to prevent orbiting.
- Speeds (slowed from v1): walk 165, sprint 255, teammate 155, CPU chase
  180 / carry 165 / formation 140. Shot power 660, CPU shot 640.

### Gameplay model (current: 11v11)
- Both teams: 11 players from the selected `TeamData.players` (index 0 = GK,
  1-4 DF, 5-8 MF, 9-10 ST by index → `role`). Away is x-mirrored. Each team's
  `kickoffFwd` (a striker) is the kickoff/initially-controlled player.
- Home attacks right; ball owner gets a lime ring.
- Non-controlled teammates hold formation, shifted by ball position
  (`formationTarget`: anchor + ball offset * 0.35x/0.25y).
- GOALKEEPERS (basic, `isGK` flag on index 0; distinct kits via `kitFor`:
  home amber HOME_GK_KIT, away mint AWAY_GK_KIT):
  - `keeperTarget`: tracks ball depth along the line (mid + (ball.y-mid)*0.55,
    clamped inside the frame), steps out 46px when ball within 320 of own
    goal, else 26. Never chases.
  - Home GK with the ball: `homeKeeperDistribute(dt)` — holds 0.7s
    (gkHoldTimer), then auto-passes to the most open non-GK teammate
    (openness = nearestOpponentDist - |x - FIELD_W*0.45|*0.1), power
    clamp(d*1.4, 480, 740). NOT user-controlled distribution.
  - Away GK with the ball: stands, then clears long to most open teammate.
  - GKs excluded from Q-switching (unless owner or ball within 160) and
    from CPU chaser selection (unless ball within 200).
- CPU AI: carrier dribbles toward left goal, shoots when x < 300, passes to a
  more-advanced open teammate when pressured (<85px); nearest non-carrier
  chases ball with anticipation; rest use offBallPlan. Decisions every 0.45s.
- OFF-BALL INTELLIGENCE (`offBallPlan`, both teams, user-requested "players
  should attack/defend/get open like FIFA"; applies to everyone except the
  controlled player, the carrier, the away chaser and the home presser):
  - v2 SHAPE MODEL (after user said v1 was too static + defence collapsed
    to the goal line): BALL-RELATIVE line depths, not anchor shifts.
    Players have `role` ('GK'|'DF'|'MF'|'ST' from formation index; also
    `isGK`). Depth = distance from OWN goal along attack dir. Per phase:
    - defend: DF clamp(ballD-200, 170, W*.52) — floor ≈ box edge, never
      goal line; MF clamp(ballD-20, 340, W*.68); ST clamp(ballD+230,
      W*.4, W*.75) stay up as outlet.
    - attack: DF clamp(ballD-420, 280, W*.58); MF clamp(ballD-150, 450,
      W*.8); ST clamp(ballD+170, 720, W-170).
    - loose: DF -300/220/.55, MF -80/400/.74, ST +200/640/.85.
    Plus formation stagger (anchorDepthFrac - roleCenter[.15/.33/.52])
    * W*1.6; y = anchor.y + ballShift * (defend .4 : .28). `formationTarget`
    was REMOVED (only keeperTarget remains). Catch-up: callers boost to
    RUN_SPEED when >240px from target spot.
  - ATTACK extras — ROLE-BASED SUPPORT (v2, after user: "as soon as I have
    the ball everyone runs to the opponent's goal / all do the same thing /
    nobody opens up or comes back"). Old v1 made EVERY non-DF level/ahead of
    the carrier within 560px run to the SAME spot (carrier.x+260) → whole
    team funneled at goal. FIFA model (confirmed via EA FC26 Pitch Notes:
    "always have someone available as a passing option", a MIX of run types)
    is now implemented as a team-level assignment `computeAttackSupport()`
    (recomputed every 0.35s with computeMarking; fills `attackRole` Map for
    the team in possession; roles: 'run'|'short'|'width'|'hold'):
    - run: up-to-2 most-advanced non-DFs that are level/ahead of the carrier
      → penetrate to carrier.x + dir*300, staggered into their lane
      (y = mid + laneSide*FIELD_H*0.22 + ballShift*0.2), RUN_SPEED.
    - width: remaining non-DFs whose anchor lane is wide (|anchor.y-mid| >
      FIELD_H*0.2) → hold touchline (y = mid + laneSide*FIELD_H*0.4) a touch
      ahead of the ball (fromDepth(ballD+90)).
    - short: up-to-2 nearest remaining mates behind/level with the carrier →
      check BACK to carrier.x - dir*150, offset laneSide*150 (safe outlet).
    - hold: everyone else (DFs + deep mids) keep the zonal line `t` to
      recycle possession + screen the counter.
    laneSide = anchor.y < mid ? -1 : 1. Final spot still drifts away from
    any opponent within 95px. Net effect: a couple run in behind, a couple
    show short, wingers stretch wide, defenders stay home — varied options.
  - DEFEND extras — man-marking overrides the zonal spot:
    `computeMarking()` every 0.35s (markTimer, markAssign Map
    defender->threat, cleared on kickoff) greedily assigns threats
    (non-GK attackers within 62% of pitch from defended goal, sorted by
    danger) to nearest free defender within 320px; excluded: GKs,
    this.controlled. `markTarget` = 40px off the attacker, direction 75%
    toward own goal + 25% toward ball. Markers move at 190.
  - HOME PRESSER: nearest non-controlled non-GK home player presses the
    CPU carrier (or a loose ball last kicked by the CPU — never chases
    home-kicked balls so teammates don't steal your passes) at
    PRESS_SPEED=200. Without this the home team never defended.
- PASS PHYSICS (v2, fixed after user reported passes dying short): ball
  friction is exponential (BALL_DECAY=1.5/s) so a kick at power v rolls
  only v/1.5 px TOTAL — old distance-multiplier powers physically could
  not reach targets past ~360px. All passes now use friction-aware
  `passPower(d, arrival, max) = min(BALL_DECAY*d + arrival, max)` so the
  ball ARRIVES still rolling at `arrival` px/s: short (260, 880), through
  (240, 1050), long (320, 1500), GK distribute/clear (300, 1300), CPU
  pass (260, 880). Shots still fixed 660 (unchanged, deliberately).
- THROUGH BALL aim (v3): leads along the receiver's actual RUN direction
  (their velocity, when moving >50; else straight at the opponent goal);
  lead is SPEED-PROPORTIONAL clamp(sp*0.45, 45, 110) — v2's fixed 200px
  was unreachable (user report). Never leads backwards (forward component
  forced to 0.55 if run points back). Through arrival speed 240 (was 300,
  rolled away from the runner). Short/long passes still lead vel*0.2.
  (Receiver selection: see "Pass receiver selection (v2)" above.)
- Pitch markings are now REAL DIMENSIONS via `M()`: centre circle & "D" arc
  r=M(9.15), penalty box M(16.5)deep×M(40.32)wide, six-yard M(5.5)×M(18.32),
  penalty spot M(11) from goal, corner arc M(1), spot dots M(0.12).
  GOAL_HEIGHT=M(7.32)≈153 (mouth width), GOAL_DEPTH=M(2.0)≈42, goal posts
  M(2.44) tall. PLAYER_R=M(0.52)≈11, BALL_R=M(0.11)≈2.3 (TRUE real-life
  scale per user — 0.22m ball; deliberately tiny; height renderer grows it as
  it rises so airborne balls stay readable),
  CONTROL_DIST=PLAYER_R+BALL_R+16. Sprite: `PLAYER_SCALE=M(1.85)/44` applied
  in drawHumanoid (ground decos use `gs=s*PLAYER_SCALE`; body `ctx.scale(gs,
  gs)`; head markers at q.y-50*gs) → footballer stands ~1.85m.
- Possession: nearest player (either team) within CONTROL_DIST grabs ball;
  kicker is excluded for 0.45s after kicking (`lastKicker`/`kickerLock`) so
  passes aren't instantly re-grabbed; lock clears when anyone receives.
- BALL HEIGHT (z-axis), user-requested for FIFA feel. Ball now has z/vz on
  top of x,y. `GRAVITY=M(46)` (exaggerated vs real 9.8 for arcade arcs),
  `BOUNCE=0.58` restitution, `CONTROL_HEIGHT=M(1.25)` (ball above this sails
  over everyone — resolvePossession early-returns owner=null while high).
  updateBall integrates z + ground bounce; horizontal friction is ~12% of
  normal while AIRBORNE (lofted balls carry, grounded balls decay as before),
  and a bounce scrubs 14% of roll. dribble() forces z=vz=0; resetKickoff
  zeroes them. `kickBallToward(aim,power,kicker,loft=0,spread=0.03)` — loft is
  upward vz launch; `spread` = angular error envelope (radians). Every kick gets
  FIFA-like imperfection: aim deflected by `spread*kickNoise()` and power *
  (1+0.05*kickNoise()), where `kickNoise()` = `random()-random()` (triangular,
  peaked at 0 → most kicks near-perfect, rare big sprays). Short/ground passes
  use the tight default 0.03; LONG ball 0.045; SHOTS the widest, 0.05+charge*
  0.045 (a power blast is less accurate than a placed side-foot). SHOTS:
  loft=M(0.6)+charge*M(7) (driven, rises slightly, stays
  under bar). LONG PASS (A) = BALLISTIC LOFT: solves hang time T=clamp(0.62+
  d/M(70)+charge*0.25,0.6,1.5), vz=0.5*GRAVITY*T, hspeed=d/T*1.12 → flies
  over defenders, drops on receiver. Short/through stay grounded. handleGoals
  rejects balls with z>M(2.44) (over the bar). drawBall lifts sprite by
  z*q.s, shrinks/fades the ground shadow with height (hf=1/(1+z*0.03)), and
  grows the ball slightly as it rises. Ball depth-sorts at its GROUND y.
- Tackling (fixed twice after user reports; v2 fixed the GEOMETRY, not just
  timers — the dribble used to push the ball ahead of the tackler's facing,
  i.e. straight back into the opponent):
  - On tackle win: winner's `facing` is flipped AWAY from the tackled
    opponent and the ball is placed on that far side.
  - While `stealProtect` > 0 the dribble glues the ball to the feet
    (ahead = r+ball.r-2, snap 0.55) instead of 4px out front (snap 0.3).
  - Hysteresis: current owner retains vs challengers unless challenger is
    7px closer to the ball AND `stealProtect` elapsed (same-team takeovers
    bypass the margin).
  - `stealProtect`: 0.9s after winning a tackle, 0.35s after a clean
    receive. `dispossessed` lockout: 1.2s (loser can't claim at all).
  - `separatePlayers()`: soft circle collision each frame (minD = sum of
    radii - 4) so opponents can't stand inside the carrier.
  - All timers reset on kickoff.
- DEFENDING CONTROLS (FIFA-style, added after user noted tackles felt
  passive-only):
  - `canTackle(tackler, carrier)`: REALISM GATE shared by every steal path.
    Requires (a) defender on the BALL side of the carrier — sideDot =
    (ball-carrier)·(tackler-carrier) >= 0, so a defender shielded out behind
    the carrier can't win it; and (b) defender facing the ball — faceDot of
    (tackler.facing · dirToBall) > 0.15 (~within 80°). Added after user
    reported steals from behind / facing away.
  - `pokeTackle(tackler, reach)`: shared steal primitive — if an opposing
    non-GK carrier exists, stealProtect elapsed, tackler not `dispossessed`,
    ball within reach, AND canTackle passes, the ball is placed 6px past the
    tackler on the far side from the carrier (resolvePossession then awards
    it via the normal tackle-won path: 0.9s protect, 1.2s dispossess lockout).
  - D with NO ball = standing tackle: `tackleTimer=0.22s` lunge at
    TACKLE_LUNGE_SPEED=310 toward ball+vel*0.1 (`tackleDir`), poking with
    reach CONTROL_DIST+18 each frame; `tackleCooldown=0.8s` commit (whiff =
    beaten). D WITH ball still charges a shot (charge starts only if owns).
  - C (hold) = contain: auto-jockeys to a spot 30px goal-side of the away
    carrier at JOCKEY_SPEED=180 (E sprint → SPRINT*0.94), auto-pokes at
    reach CONTROL_DIST+8 (0.5s cooldown). With loose ball, C hunts the ball.
    KeyC added to MOVE_KEYS (hold key, no justPressed).
  - Auto jostle (`updateJostle`, runs before resolvePossession, both teams):
    nearest opposing non-GK in body contact with the carrier (centre dist <
    r+r+9) accumulates `jostle` += dt (decays 2.5x when no contact /
    protected); at 0.5s the challenger pokes the ball loose automatically.
    `jostle` reset on possession change, kickoff and successful pokes.
  - FIFA reference: tackles are manual buttons; contain auto-pokes; physical
    seal-outs from running into the dribbler are automatic; C = contain on
    PC keyboard.
- Ball bounces off all walls except goal mouths (no throw-ins yet).
- 2-minute timer; goals reset to kickoff (conceding team kicks off);
  full-time verdict freezes play.
- OFFSIDE (both teams): `snapshotOffside(kicker)` runs inside `afterKick` (the
  single kick choke point), recording into `offsideFlags` (Set<PlayerEntity>)
  every teammate who, AT THE INSTANT OF THE PASS, is (a) in the opponent half,
  (b) ahead of the ball, AND (c) ahead of the 2nd-last defender (offside line).
  Positions are projected onto the attack axis via `fwd(x)=x*atk` (atk=+1 home /
  -1 away) so "more forward" is always larger; offside line = 2nd-largest
  `fwd(opp.x)` (keeper is usually deepest/last). 6px tolerance so level=onside;
  GK excluded as a receiver. In `resolvePossession`, the FIRST teammate to touch
  the played ball: if they're in `offsideFlags` → `callOffside(them)`; any other
  first touch (defender or onside mate) clears the flags (phase resolved).
  `callOffside` = FULL RESTART (user: "it should restart like FIFA, not keep
  playing"): ball stopped dead at the spot. Players KEEP their live positions
  (play stopped where it was) — we only zero momentum + face them upfield. The
  ONLY exception: the offending attacking team's players that are ahead of the
  ball get pulled BACK onside (x → spotX - atkDir*(28+ahead), preserving their
  y lane). NOTE: the earlier version teleported EVERYONE to anchor+shift which
  clamped them onto the far goal line (bug the user reported — "everyone at the
  goal line"); do NOT reintroduce a global shift. Nearest outfield defender is
  dropped on the ball as `owner` (and `controlled` if home defends, else control
  reverts to home's kickoff fwd); camera pans to the spot; "OFFSIDE" msg + 1.1s
  freeze; all transient state (stealProtect=1.2, marks, jostle, tackle/charge
  timers) reset. Flags also cleared in resetKickoff. Through/long balls/GK punts
  all funnel through afterKick, so all are policed.

### NOT YET BUILT (future slices)
- GK diving/saving animations (keeper is just a line-tracking outfielder
  sprite for now), fouls, throw-ins/corners.
- Slide tackle, ball height (lobs/crosses/chips).
- Difficulty levels, player stats, persistence of results to a Store.

## Comprehensive Project Structure Overview

### 1. PROJECT STRUCTURE

```
/user-app/
├── src/
│   ├── client/                      # React frontend (React 19)
│   │   ├── assets/                  # Images/logos (favicon.svg, modelence.svg)
│   │   ├── components/
│   │   │   ├── ui/                  # Reusable UI components (shadcn-style)
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Label.tsx
│   │   │   │   └── Card.tsx
│   │   │   ├── LoadingSpinner.tsx    # Custom loading component
│   │   │   ├── Page.tsx              # Page wrapper with header (accepts `seo` prop)
│   │   │   └── Seo.tsx               # Renders <title> via React 19 native metadata
│   │   ├── pages/                    # Route pages
│   │   │   ├── HomePage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── SignupPage.tsx
│   │   │   ├── ExamplePage.tsx
│   │   │   ├── PrivateExamplePage.tsx
│   │   │   ├── LogoutPage.tsx
│   │   │   ├── TermsPage.tsx
│   │   │   └── NotFoundPage.tsx
│   │   ├── lib/
│   │   │   ├── utils.ts              # Utility functions (cn helper)
│   │   │   └── autoLogin.ts          # Sandbox auto-login hook
│   │   ├── router.tsx                # React Router configuration
│   │   ├── seo.config.ts             # Single source of truth for site name / <title>
│   │   ├── index.tsx                 # App entry point
│   │   ├── types.d.ts
│   │   └── index.css
│   │
│   └── server/                       # Node.js backend
│       ├── app.ts                    # Server entry point
│       ├── example/
│       │   ├── index.ts              # Module definition with queries/mutations
│       │   ├── db.ts                 # Database schemas
│       │   └── cron.ts               # Scheduled jobs
│       └── migrations/
│           └── createDemoUser.ts     # Seeds the sandbox demo user
│
├── Configuration Files
│   ├── tsconfig.json                 # TypeScript 
│   ├── vite.config.ts                # Vite bundler config (loads @tailwindcss/vite)
│   └── modelence.config.ts           # Modelence framework config
│
└── package.json                      # Dependencies & scripts
```

### 2. AVAILABLE UI COMPONENTS (SHADCN-STYLE)

All components are custom implementations located in `/user-app/src/client/components/ui/`:

#### Button Component (`/user-app/src/client/components/ui/Button.tsx`)
- **Variants**: default, destructive, outline, secondary, ghost, link
- **Sizes**: default, sm, lg, icon
- **Features**: Forward ref, fully styled with Tailwind, hover/active states
- **Props**: `ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>`

#### Input Component (`/user-app/src/client/components/ui/Input.tsx`)
- **Features**: Forward ref, styled with Tailwind
- **Supports**: All standard HTML input attributes
- **Styling**: Border, focus ring, dark mode, placeholder colors

#### Label Component (`/user-app/src/client/components/ui/Label.tsx`)
- **Features**: Semantic label element with peer-disabled states
- **Props**: `LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement>`

#### Card Component (`/user-app/src/client/components/ui/Card.tsx`)
- **Subcomponents**: 
  - `Card` - Main container
  - `CardHeader` - Header section with padding
  - `CardTitle` - Title text styling
  - `CardDescription` - Description text styling
  - `CardContent` - Content wrapper
  - `CardFooter` - Footer section

All components use the `cn()` utility function for class merging.

### 3. UTILITY FUNCTIONS

**File**: `/user-app/src/client/lib/utils.ts`

```typescript
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```
- Uses `clsx` for conditional classes
- Uses `tailwind-merge` to prevent class conflicts
- Perfect for merging component classes with custom overrides

### 4. EXISTING FORM PATTERNS

The app already has two working form examples you can reference:

#### LoginForm (`/user-app/src/client/pages/LoginPage.tsx`)
- Email and password fields
- `FormData` API for form submission
- Card-based layout with headers and footers
- Validation and error handling
- Links to signup

#### SignupForm (`/user-app/src/client/pages/SignupPage.tsx`)
- Email, password, confirm password
- Checkbox for terms acceptance
- Success state handling
- Client-side password validation
- Toast error notifications
- `useCallback` hook for form submission
- State management for success state

### 5. APP STRUCTURE & ARCHITECTURE

#### Client Setup (`/user-app/src/client/index.tsx`)
```typescript
- React Query (TanStack) integration
- React Router DOM
- React Hot Toast for notifications
- Suspense boundaries with loading state
- Global error handler
```

#### Router Configuration (`/user-app/src/client/router.tsx`)
- **Public Routes**: Home, Example, Terms, Logout, 404
- **Guest Routes**: Login, Signup (redirects to home if authenticated)
- **Private Routes**: PrivateExamplePage (redirects to login if not authenticated)
- **Route Protection**: 
  - `GuestRoute` component for auth-only pages
  - `PrivateRoute` component for protected pages
  - Redirect with `_redirect` query param to return after login

#### Page Wrapper (`/user-app/src/client/components/Page.tsx`)
- Header with a Home button (left) and either user handle + Logout or a Sign in button (right) — no logo
- Responsive layout with max-width
- Body section with optional loading state
- Accepts a `seo` prop (`{ title?, noindex? }`) that is forwarded to `<Seo />`
  to set the document `<title>` per page (see SEO/TITLE PATTERN below)

### 6. MODULE SYSTEM (Backend)

**File**: `/user-app/src/server/example/index.ts`

Example shows Module pattern with:

```typescript
new Module('example', {
  configSchema: { /* configuration */ },
  stores: [ /* database stores */ ],
  queries: {
    getItem: async (args, { user }) => { /* query logic */ },
    getItems: async (args, { user }) => { /* query logic */ }
  },
  mutations: {
    createItem: async (args, { user }) => { /* mutation logic */ },
    updateItem: async (args, { user }) => { /* mutation logic */ }
  },
  cronJobs: {
    dailyTest: dailyTestCron
  }
})
```

#### Database Pattern (`/user-app/src/server/example/db.ts`)
```typescript
export const dbExampleItems = new Store('exampleItems', {
  schema: {
    title: schema.string(),
    createdAt: schema.date(),
    userId: schema.userId(),
  },
  indexes: []
});
```

### 7. BUILD & DEVELOPMENT

**Scripts** (from package.json):
```bash
npm run dev          # Development server
npm run build        # Production build
npm start            # Start production server
npm test             # Run tests (not configured)
```

**Vite Configuration**:
- Root: `src/client`
- Path alias: `@/` → `./src/`
- Dev server: `0.0.0.0:5173` (allows external access)
- React plugin enabled

### 8. STYLING SETUP

- **Tailwind CSS v4** via the `@tailwindcss/vite` plugin. All Tailwind config
  is CSS-first in `src/client/index.css` (`@import "tailwindcss"`, `@theme`,
  `@source`, etc.) — customize the design system there.
- **Color Scheme**: PitchKick design system in `index.css @theme`. `night-950..600`
  = pitch-side darks for SURFACES/BORDERS/backgrounds ONLY (don't use as text —
  too dark on the near-black bg). `night-500..200` (#5d738c→#c6d2de) = readable
  muted SLATE TEXT tints; use `text-night-300` for default muted copy, `-400/-500`
  for dimmer secondary text. `volt-500/400/300` = electric-lime accent. Fixed
  after user reported gray-on-black text ("ARCADE FOOTBALL", hints, etc.) was
  near-invisible — all `text-night-600/700` were remapped to the 300/500 tints.

### 9. SEO (TITLE, DESCRIPTION, OG TAGS)

- `src/client/seo.config.ts` is the single source of truth for `siteName` and
  the site-wide meta `description`. **You MUST update both fields** as soon as
  the product name is known — they default to the literal string
  `"Empty Project"` and a generic placeholder description, both of which ship
  broken SEO and social previews. Update them on any landing-page task or
  product-rename request.
- `<Seo />` (in `src/client/components/Seo.tsx`) renders `<title>`, the meta
  description, and Open Graph / Twitter card tags from `seoConfig`. It is
  already mounted once at the app root in `src/client/index.tsx`, so every
  page inherits the site-wide defaults automatically.
- Per-page overrides: pass `seo` to `<Page />`, e.g.
  `<Page seo={{ title: 'Sign in' }}>` or
  `<Page seo={{ title: 'Pricing', description: '...' }}>`. Set
  `noindex: true` for auth, terms, and 404 pages.
- Rendered at runtime via React 19 native `<title>` / `<meta>` hoisting; no
  SEO library needed.
- Heading hierarchy: every page must have exactly one `<h1>` and headings
  must descend monotonically (`h1 → h2 → h3`, never skip a level). Skipped
  levels hurt accessibility audits and SEO.

### 10. REUSABLE PATTERNS FOR NEW FEATURES

When adding a new feature, reach for these existing building blocks before
introducing new ones:

1. **Forms**: native `FormData` API, mirroring `LoginPage` / `SignupPage`.
2. **Validation**: Zod on the server (inside module queries/mutations);
   lightweight client-side checks before submit.
3. **UI Components**: `Button`, `Input`, `Label`, `Card` from
   `src/client/components/ui/`. Avoid pulling in external UI libraries.
4. **Page Layout**: wrap routes in `<Page>` (sets header + `<title>` via
   the `seo` prop).
5. **Icons**: `lucide-react`.
6. **Toast Notifications**: `react-hot-toast` for user feedback.
7. **Server State**: `@tanstack/react-query` via `@modelence/react-query`
   helpers (`useQuery`, `useMutation`).
8. **Local State**: standard React hooks (`useState`, `useCallback`,
   `useMemo`, `useRef`). On React 19, prefer ref-as-prop over `forwardRef`
   in any new components.
9. **Styling**: Tailwind classes combined with the `cn()` helper from
   `src/client/lib/utils.ts`.
10. **Backend feature**: add a new `Module` under `src/server/<feature>/`
    following the `example` module shape (`configSchema`, `stores`,
    `queries`, `mutations`, optional `cronJobs`), and register it in
    `src/server/app.ts`.

### Summary

This is a full-stack Modelence framework application with:
- Clean component structure ready for new features
- All necessary UI building blocks already available
- Form handling patterns established
- Database and backend module patterns ready to follow
- Authentication system in place
- TypeScript support throughout
- No external shadcn/ui dependency needed — custom components are already implemented

### 11. MOBILE APP (Expo, optional)

A project may *optionally* include a mobile app alongside the web app. The
template ships an empty `mobile/` folder, but the studio treats the mobile
app as "not yet created" until the marker file
`mobile/.modelence-mobile-enabled` exists. The Mobile tab in the studio shows
a "Create mobile app" CTA in this state.

**Folder layout**

```
project-root/
├── src/server/        # Modelence backend (unchanged)
├── src/client/        # Web client (unchanged)
├── package.json       # Web dependencies (+ postinstall for mobile)
└── mobile/            # Expo / React Native app (shipped but unhooked)
    ├── .modelence-mobile-enabled  # marker file — present once created
    ├── package.json   # Expo's deps (main: "expo-router/entry")
    ├── app.config.js  # Expo config (includes scheme for deep linking)
    ├── index.ts       # configureClient + auth token persistence (side-effect module)
    ├── app/           # Expo Router file-based routes
    │   ├── _layout.tsx          # root layout — SafeAreaProvider, AppProvider, QueryClientProvider, RouteGuard
    │   ├── (auth)/
    │   │   ├── _layout.tsx      # headerless Stack for unauthenticated screens
    │   │   └── sign-in.tsx      # sign-in screen
    │   └── (app)/
    │       ├── _layout.tsx      # headerless Stack for authenticated screens
    │       └── home.tsx         # home screen (requires auth)
    ├── babel.config.js
    └── tsconfig.json
```

**Important rules**

- The studio's "Create mobile app" flow (button or matching free-text prompt)
  scaffolds/installs the Expo app and writes `mobile/.modelence-mobile-enabled`.
  Do NOT write that marker without first installing Expo dependencies — the
  studio assumes mobile is fully usable once the marker is present.
- The mobile app uses **Expo Router 4.x** (file-based routing). The entry
  point is `expo-router/entry` (set in `mobile/package.json`'s `"main"` field).
  Route groups: `(auth)` for unauthenticated screens, `(app)` for protected
  screens. The `RouteGuard` component in `app/_layout.tsx` redirects based on
  `useSession()` — unauthenticated → `/(auth)/sign-in`, authenticated →
  `/(app)/home`. Do not revert to a manual `registerRootComponent` + `App.tsx`
  setup.
- `index.ts` is a side-effect module (imported by `app/_layout.tsx`) that runs
  `configureClient` and rehydrates the auth token from AsyncStorage. It does
  NOT call `registerRootComponent`.
- Keep `mobile/`'s `package.json` and `node_modules` separate from the web
  app's. Metro and Vite cannot share the same dependency tree.
- The Studio sandbox runs `expo start --tunnel` automatically when the user
  opens the Mobile preview tab. **Do not** add a long-running Expo process
  to the root `package.json`'s `dev` script.
- The root `package.json` has a `postinstall` that runs
  `node scripts/postinstall.mjs`. That script re-installs mobile deps whenever
  the marker exists and no-ops otherwise. Do not remove either; do not change
  the script to run unconditionally.
- Optional convenience scripts you may add at the project root:
  `"dev:mobile": "cd mobile && npm run start"`.
- API calls from the mobile app to the Modelence backend should target the
  sandbox URL exposed in the studio preview (set via an env var the user
  configures in `mobile/app.json`'s `extra` field).
- When adding shared logic, prefer plain TypeScript modules under
  `src/shared/` and import them from both the web client and `mobile/App.tsx`.
  Avoid React-DOM-only or Node-only imports in shared code.
