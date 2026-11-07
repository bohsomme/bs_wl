# Program run JSON export

Apply `migrations/006-workout-plan-snapshots.sql` before deploying this change.
The migration adds nullable columns and an index. It does not rewrite old logs.

Open a program in **Programs**, or select it in **Workout Log**, and choose
**Export run**. Set the run's Day 1 and an inclusive end date, then choose
**Download JSON**. Upload the downloaded file to ChatGPT for analysis.
Workouts are selected by their start date in the browser's time zone, including
in-progress workouts. Extend the end date if the run took longer than planned.
The app does not retain program assignment history, so dates identify the run;
separate runs on the same dates cannot be distinguished automatically.

The versioned JSON contains:

- `json_schema_version`: `1.4`. Increase this
  when the export structure or field meanings change.
- `block`: program name, description, selected dates, current week count and
  calculated program end date.
- `programmed_sessions`: the full current program, including rest days and
  workouts without logs. Each entry includes its exercises and functional blocks.
- `sessions`: recorded workouts, check-in ratings and notes, session RPE,
  post-workout and functional notes, and exercises with `planned` prescriptions
  beside their recorded `sets`. Workouts whose templates were removed remain here.
- `metadata`: units, date selection, rating and percentage semantics, and
  limitations relevant to analysis.

Apply `migrations/007-timed-exercises.sql` for timed exercise support. Timed
prescriptions use `duration_seconds` (a number or min/max range) and `reps: null`.
Logged timed sets use `duration_seconds` and `reps: null`; rep-based sets have
`duration_seconds: null`. Older snapshots without duration fields remain rep-based.

Apply `migrations/008-per-set-reps.sql` for individual set targets. Choose
**Reps by set** in the exercise or accessory editor, then enter a comma-separated
rep count for every set (including optional sets), such as `5, 3, 1`.
These prescriptions export `reps_by_set: [5, 3, 1]` and `reps: null`.
Shared rep targets and older snapshots export `reps_by_set: null`.

Apply `migrations/010-workout-warmup.sql` for optional workout warmups. Version
1.3 includes `warmup` in each programmed session and the recorded session's
`planned` object. Historical snapshots preserve the original warmup; older
snapshots export `null`. Skipped sessions have `status: "skipped"`, and their
exercise entries also report `skipped`.

Apply `migrations/011-workout-warmup-status.sql` for warmup decisions. Each
recorded session includes `warmup_status`: `completed`, `skipped`, or `null`
when no decision was recorded. This is separate from the overall workout status.

Apply `migrations/012-functional-workouts.sql` before deploying functional
workout logging. Functional blocks support a user-defined workout (the athlete
enters the workout during training) or a programmed workout (set in advance and
read-only during training). Both support optional programming notes.
Version 1.4 adds `is_programmed` and `workout` to planned functional blocks, and
`functional_results` to each recorded session. Every result contains
`template_block_id`, `workout`, `score_notes`, `rpe`, and a `status` of `logged`,
`not_logged`, or `skipped`. RPE is a number from 1–10 or null. Unrecorded fields
are null; explicitly saved empty text is an empty string. Results are retained
even if a legacy template block is removed. Existing `functional_notes` remain
available separately. Older blocks and snapshots default to user-defined.

Prescriptions include ranges for sets, reps, seconds and total reps; fixed weights,
percentage targets (including per-set ranges), target RPE, sections, supersets,
free-pick criteria and notes. Logs include chosen free-pick names, top-set RPE,
exercise notes, skipped flags, set RPE, missed-set reasons and makeup flags.
Numbers are JSON numbers; unknown values are `null`. No successful-rep counts,
WHOOP scores, separate goals or variations are invented. Readiness currently
uses 1–5, but some old entries used 1–10 and the scale was not stored.

New template workouts atomically save a prescription snapshot and seed their
exercise logs when started. The snapshot includes exercise names, functional
blocks and the estimated 1RM used for percentage loading. The active workout
uses this saved plan and reference even after program or PB edits. The existing
seed action remains idempotent for older clients. Exercise IDs within the
snapshot distinguish repeated lifts and free-pick slots.

`sessions[].plan_source` is `workout_start_snapshot`, `current_template`, or
`unavailable`. Older logs fall back to the current template and match exercises
by identity and position; ambiguous matches stay separate. A `no_plan_match`
can mean added work or an edited/deleted legacy prescription. `not_logged`
does not assert that work was skipped. Only an explicit skipped flag does that.
Missing plan data never removes recorded work.

The whole-program plan is always identified as `current_template`; it is not a
historical snapshot of unperformed sessions. Session-level snapshots preserve
what was prescribed when each new workout started. Older prescriptions and
deleted, unperformed template entries cannot be reconstructed.

Validation:

```sh
node --test lib/program-export.test.cjs lib/workouts.test.cjs lib/accessory.test.cjs lib/prescription.test.cjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
```
