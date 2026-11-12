# Lễ Hội Trò Chơi Dân Gian Miền Quê Việt Nam

A first-person, low-poly Vietnamese village festival with seven playable folk activities, solo AI and a seven-stamp passport. English instructions retain Vietnamese activity names.

## Play

Double-click `index.html` in a WebGL-capable desktop browser. The local Three.js renderer and gameplay require no server or installation. Choose Noob, Pro, Hacker or God, then enter the festival. Optional catalog audio and online records require connectivity, but their failure does not block local gameplay.

- WASD / arrows: camera-relative walking; mouse: look after clicking the scene. Movement remains responsive across interactions and activity transitions.
- Mobile: use the left joystick to walk or steer the top, drag the scene to look, and tap the highlighted interaction prompt. Context buttons support jumping, rope wrapping, holding/releasing throws, push beats and bamboo dance steps. Pause and leaving an activity remain available.
- Push game: both participants crouch to push a hand-held staff; no staff supports obstruct the arena.
- E: interact with the nearby object being looked at, pick up equipment or enter an activity. One item fits in your hands. E at its container returns the held item.
- Space: jump while exploring or tap the push beat. Dance uses the D / F / J / K letter shown in a circle. R: hold to wrap a top. Left mouse: hold and release to throw.
- Escape: pause; the visible Resume button returns to the current activity. Click the scene to recover mouse capture.
- Top after launch: WASD / arrows steer your spinning top relative to the camera; your character stays at the viewing position. Both tops keep drifting and rebound within the chalk circle. Motion, contact separation, and bounce impulses are solved strictly on the ground plane, independently of vertical world collision response.
- Board: click a highlighted own-side pit, then click its immediately adjacent left or right pit to sow in that direction, including empty neighbors and the end pits. No separate confirmation is needed. Pebbles are sown at 0.32-second intervals, with longer capture pauses and smoothly moving hands; existing pebble meshes are reused. Pebble counts appear above the physical pits; the corner panel shows scores and contextual instructions.
- Dance: one circular prompt displays D, F, J or K at a time. Press the displayed letter (or tap its circle on touch screens) before the outer ring closes; there are no scrolling notes or FNF lanes. Each prompt accepts input throughout its visible countdown. Noob / Pro / Hacker / God retain progressively faster beats and require 8 / 12 / 16 / 20 grounded steps; each correct input smoothly walks to the next marked tile instead of jumping. Wrong or missed prompts clamp the feet and restart the route. Graphics and other festival activities are unchanged.
- Sound on/off: one persistent shared mute for all music and effects.

## Festival Challenges

Walk to the signed entry points; there is no activity-teleport menu. Collect a top from its chest or a ball from its basket before entering the respective booth.

1. **Đánh Cù:** wrap, charge and launch against the AI. Outlast its spin. Exactly one 5% break roll occurs per new pair contact. Retrieve a stopped top on foot with E; replace broken equipment at the chest and rewrap every launch.
2. **Ô Ăn Quan:** twelve-cell traditional sowing with relay, alternating captures, mandarin ends, empty-row refill and final debt repayment. Highest value wins; ties can be replayed. Repeated wins against the same villager count once toward streaks. Select Next villager after a match to change opponents.
3. **Ném Còn:** ten physically simulated throws. A swept crossing through the open ring scores once. Collect another ball between throws. One or more hits earns the stamp; all results, including zero, have a valid 0–10 leaderboard score.
4. **Đẩy Gậy:** the arena canopy is removed to keep the camera view unobstructed. Tap Space as notes reach the gold target. Accurate beats overcome AI counterforce; crossing the chalk boundary decides the match.
5. **Nhảy Sạp:** follow accessible letter/touch timing cues through eight steps. Each hit advances the character with an automatic jump; bamboo motion is visual and no longer resets the dancer. Missed cues may be retried without losing progress.

Stamps survive activity failures and retries. All five complete the festival, with continued exploration available. Restart festival clears the local run, not external records. Difficulty changes timing, aim assistance and fair AI decisions, not traditional rules, ten-throw length or the 5% break chance.

## Editable Sources

- `data/game-spec.json`: approved design and procedural art brief.
- `data/config.json`: world layout, difficulty, challenge parameters and reviewed audio projection; `data/config.js` is its direct-open mirror.
- `data/assets.json`: preserved reviewed media bindings; `data/assets.js` is its mirror.
- `scripts/core.js`: lifecycle; `scripts/gameplay.js`: mechanics and authoritative collision builders.
- `scripts/renderer.js`: procedural visual roles; `scripts/ui.js`: DOM menus and HUD; `styles/main.css`: presentation.
- `scripts/input.js`, `scripts/audio.js`, `scripts/test-hook.js`: controls, audio and runtime inspection.

The village and characters use intentional code-native 3D artwork. Characters have smooth facial features, tailored clothing, and articulated five-finger hands with rounded joints and nails. Ném Còn shows all ten attempt outcomes, current throw, power percentage, and contextual instructions. All reviewed sound bindings are retained. Synthesized festival music and event-specific SFX provide offline fallbacks; browser autoplay restrictions can leave sound silent until a user gesture. Leaderboard failures retain local results and offer retry. There is no simulated online opponent.

## Validation And Integration

Source simulations exercised village movement, all five activity transitions, a full board settlement with value conservation, legitimate pushing and dance victories, and a complete ten-throw round with swept ring hits. The WebGL renderer was mocked for those Node checks; this is not browser evidence. Programmer handoff uses source-only creation validation. Independent Polisher owns real browser rendering, gameplay, layout and listening checks; these are not claimed by this stage. Final QA owns full creation validation and delivery proof.

`window.__CODEX_GAME_TEST__.snapshot()` exposes live readiness, activity state, scores, spatial evidence and audio mute. `simulate({type:"key",key:"KeyW",pressed:true,frames:60})` uses normal controls. `simulate({type:"outcome",state:"con-result"})` uses the common result transition; `restart()` resets the run. Simulation/restart sets sticky test mode, suppressing production leaderboard writes.

The supplied SoonLab iframe runtime bridge uses its supported protocol V2 `soonlab:parent-hello` / `soonlab:parent-ack` host handshake. No parent-origin override is configured. The embedding host must complete its normal handshake before relying on host messages; unavailable bridge service does not prevent local gameplay. No fullscreen permission is required.

### Polisher coverage

Polished the shared nickname editor to preserve draft, focus and selection between updates, validate names live, support Escape cancellation, and ignore stale rename responses after closing or starting another round. Personal-best cards now retain explicit unknown/loading/no-score states, distinguish best-score rank and target from the current round, and highlight the current player by identity. Compact menus wrap difficulty controls and keep menu scrolling separate from the leaderboard rows. Approved gameplay, materials and design data remain unchanged.

A real Chrome verification session was attempted but the browser connection closed before interactive readiness or screenshots could be recorded. Browser rendering, all five gameplay scenes, pointer lock, compact layout, audio listening, and online-record UI behavior therefore remain unverified. No production test scores were submitted. Final QA retains ownership of delivery proof.

### Gameplay revision coverage

The top now supports camera-relative steering, continued drift, AI pursuit and chalk-circle confinement without changing spin decay or contact break probability. The board uses an angled perspective camera with a raised collision anchor, direct 3D pit picking, selected/legal-pit highlights, physical stones and per-pit count labels; its duplicate 2D pit-button board is removed. Canopies above the pushing and board viewing areas are omitted to keep these views clear.

Focused Node simulations with a mocked WebGL renderer verified all five pit selections through real Three.js rays, board projection containment at wide/tall/short aspect ratios, sowing and value conservation, opposite steering directions, stationary observer, continuing top motion, circle confinement, canopy clearance and restart. Chrome failed before remote-debugging readiness, so this revision does not claim real-browser rendering, pointer input, visual layout or audio listening verification.


### Current revision checks

The focused mechanics simulation uses the package's real Three.js geometry, camera rig, and collision world with rendering stubbed out. It verifies the new dance timing, wrong/early inputs, missed-note progress retention, pause, eight-note completion, retry, ground-only top collisions under steering, throw-outcome recording, crouch articulation, and restart. The top stress run covers 1,100 fixed steps and 10 pair contacts with zero vertical drift. Browser startup is unavailable in this execution environment, so this revision's WebGL rendering, visual quality, responsive layout, and real touch interaction remain unverified.


### Circular pushing and difficulty-scaled bamboo dance

Stick pushing now starts at 50% / 50%. Press Space, click the scene, or tap the circular timing ring when the green orb crosses the red arc. PERFECT and GOOD add 3–8 percentage points. A bad press or missed pass stuns briefly, resets the combo and gives ground. Every two successive hits advances C → B → A → S → SS → SSS; the ring speeds up and the hit zone narrows. Semi-random AI pushes include five-second rushing events, doubled below rank S. The actors and staff slide along the arena floor, and 100% / 0% ends the match with win/loss feedback.

Bamboo dance now uses D/F/J/K and circular touch prompts. Wrong, early or missed inputs visibly close the poles and stumble the hands before restarting the route. Noob / Pro / Hacker / God require 8 / 12 / 16 / 20 successful jumps with faster cadence and tighter windows. The physical route stays the same length. Existing houses, booth signs, chalk rings and track mats receive extra modeled trim and surface details without adding obstructing roofs.

Focused Node tests exercise the actual gameplay classes with real Three vectors and mocked presentation/collision operations: four difficulty routes, miss recovery, wrong inputs, PERFECT/GOOD/MISS, rank SSS, rushing mitigation, percentage endpoints, and continuous 60Hz timing wins/idle losses. This is logic evidence, not WebGL, real collision, visual, touch or audio verification. Chrome was attempted but exited before debugging readiness; those browser checks remain unverified.


### God challenge, ten-ball inventory and village scenery

God pushing now requires a continuous chain of 24 PERFECT hits as well as a full force meter. GOOD breaks that chain; MISS breaks it and costs 15 percentage points. The red arc contracts and the orb accelerates during the chain, with continuous opponent pressure and stronger rushing phases. Other difficulties retain their original pushing tuning.

Entering Ném Còn grants all ten balls, including retries. Hold/release to throw again while previous balls remain airborne; a short 350 ms launch guard prevents accidental duplicate shots. The HUD shows inventory and in-flight counts, with results attached to their original throw slots. The round resolves once all ten throws finish, and leaving clears remaining equipment and projectiles. Existing scores, ring-hit rules and leaderboard bindings remain intact.

Three continuous modeled mountain ridges surround the inaccessible exterior. Sixteen birds orbit beyond the map boundary with flapping wings. Characters have layered faces, irises, hair, varied headwear, embroidered tunics, articulated fingers, blinking, breathing and subtle head motion. They remain intentional stylized procedural 3D models, not photographic scans. The supplied original PNG is preserved byte-for-byte and displayed intact in the expandable creator-art section of the ready menu.

Focused Node checks use actual Three.js scene construction, camera rig and collision geometry, with only WebGL and DOM presentation mocked. They pass timed God victory and idle defeat, the 24-PERFECT gate and penalties, unchanged lower-tier pushing tuning, all four D/F/J/K dance routes, concurrent ten-ball throws, inventory exhaustion, result completion, one score-submission intent, retry/leave cleanup, bird motion, character construction and restart. Chrome exits before remote debugging readiness, so rendered visual quality, mobile performance, real keyboard/touch interaction and audio listening remain unverified.

### Four-lane Nhảy Sạp and scene music
Nhảy Sạp now uses fixed left/down/up/right receptors (arrows or A/S/W/D), a continuous beat chart, upward desktop notes and downward touch notes. Each note shares its timing clock with bamboo claps and pole animation; SICK/GOOD/BAD judgments, score and combo are visible. A miss retains the existing foot-clamp and track-reset rule. Difficulty increases BPM and route length while narrowing the timing window. Pause freezes the chart.
Creator-provided tracks are selected by embedded titles: Home for exploration, Ruder Buster for pushing, Finale for spinning tops, Credit song to my death, but I'm taking you down with me for Ô Ăn Quan, and Determination for defeat (including the dance stumble). Home stops inside activities. Unassigned activity music retains a quiet synthesized arrangement; no uploaded recording or beat chart was requested for Nhảy Sạp. Remote tracks use the exact supplied URLs, one shared mute control and synthesized fallback on media failure.

Verification for this revision: focused Node checks pass all four difficulty charts at 60 Hz, arrow/WASD judgments, missed and wrong notes, foot-clamp reset, clap feedback, scene track identity, defeat/exploration transitions, pause, full mute and media-error fallback. Config and asset mirrors match their JSON sources, and every local entry script exists. Tests use real Three vectors with mocked collision/presentation and audio elements; no browser/WebGL rendering, touch-device layout or listening verification was available in this environment.


### Seven-activity festival: grounded dance, stilts and crossbow

Correct D/F/J/K dance prompts now move the player smoothly to the next marked ground tile without vertical jumping. Existing prompt timing, scoring, foot-clamp recovery and difficulty are retained.

- Đi Cà Kheo: enter the Q/E booth near the festival entrance. Alternate Q for the left foot and E for the right when the approaching ring reaches its border. Wrong foot, off-beat or missed steps cause an animated fall and a failed round. Noob / Pro / Hacker / God routes are 12 / 16 / 20 / 24 metres, with faster beats and tighter windows. The visible finish moves to the course length. Touch buttons use the same timing rules.
- Bắn Nỏ: enter the booth on the west side and aim at the gold center of the distant modeled target. Mouse or touch-drag changes aim; left click, Space or the BẮN NỎ button fires. Center hits are computed from the aim ray and target plane with obstruction checks; arrows visibly travel to their impact positions. Requirements: Noob 3/5, Pro 3/3, Hacker 5/5, God 7/7. All arrows must finish flying before the result. Retry clears the arrows; leaving restores the exploration view and zoom.
- Passport, village labels, map, ready menu and festival completion now include seven activities. Existing music, leaderboard, inventory and other minigames are preserved.

Verification: 81 focused assertions passed using actual Three.js scene geometry, camera rig, collision world and gameplay code with WebGL, DOM presentation and audio mocked. Coverage includes all four dance/stilts/crossbow difficulties, grounded stepping, successful rounds, wrong-foot and missed-beat falls, crossbow misses and arrow limits, pause, cleanup, seven-stamp completion and restart. Chrome exited before its debugging interface became available; rendered visuals, mobile/touch layout and audio listening remain unverified.


### Ném Còn and the banyan scenic swing
- The Ném Còn statistics panel stays in the upper-left corner, with compact layouts for narrow and short screens. Launch speed is 40% stronger (8.4–22.4 m/s); the trajectory preview and assisted aim use the same velocity. Noob / Pro / Hacker / God ring distances are 11 / 14 / 17 / 20 m from the throw line, and ring heights are 6 / 7 / 8.2 / 9.5 m. The hoop remains circular while its supporting pole grows. Ten-throw scoring, inventory and leaderboard behavior remain unchanged.
- Approach the wooden rope swing beneath the central banyan and press E or tap the interaction prompt to sit. The first-person view faces the festival gate and follows a gentle sway; mouse/touch look remains available, walking is locked, and E, Space, the touch stand button or the top stand button returns to walking. Pause and restart preserve their existing behavior.
- Intentional procedural 3D scenery now includes a warm-to-blue sky gradient, more detailed layered hills, fields beyond the gate, fine earth grain, instanced pebbles, meadow tufts and fallen banyan leaves. Existing drifting clouds, flapping birds and mature trees remain animated. These additions require no new remote artwork or runtime dependency.
- Focused Node simulation with actual Three.js geometry, the camera rig and collision world verifies reachable ring hits at all four difficulties, circular hoop transforms, stronger launch speed, swing interaction and gate-facing view, seated movement lock, sway, pause/resume, standing and restart. WebGL and DOM rendering are mocked in that check. Browser startup fails in this environment; rendered appearance, responsive DOM layout and mobile performance remain unverified.
