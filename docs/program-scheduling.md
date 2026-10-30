# Program scheduling

Assign a program from its menu on the Programs page and choose its start date.
The date range includes every day in its total weeks, including rest days; the
last day is the start date plus `totalWeeks * 7 - 1` days.

Assignments with non-overlapping ranges stay on the calendar together. If the
new range overlaps an assigned program, the dialog lists every conflicting
program and its dates before anything changes. Cancel leaves the assignments
untouched. Replace and assign removes only the listed conflicting programs from
the calendar, preserves their templates and workout logs, and assigns the new
program. A changed date or changed set of conflicts requires another review.

The dashboard calendar combines all assigned programs, with a shortcut to each
program's start date. Next Workout chooses the earliest remaining workout from
current and upcoming programs. Programs whose date ranges have ended remain
visible on the calendar but no longer supply the next workout.

The program list beneath the calendar shows only current and upcoming assignments
by default, including a current program's final day. View all assigned programs
also shows past assignments; Show current and upcoming restores the default list.
This filter uses today's date, regardless of the date selected in the calendar.

The existing `program.isActive` field now means included in the calendar, so
multiple programs may have it set. Labels distinguish Current, Scheduled and
Ended using the date range. No database migration is required. Each program
still has one assignment; Reassign moves that program's dates and restarts its
workout progression. Duplicate a program to schedule another run separately.

# Free-pick accessories

Add Accessory offers Free-pick exercise for both individual exercises and
supersets. Enter criteria and prescribe sets, reps or seconds as usual. The
workout uses the existing free-pick flow to record the chosen exercise name,
weight and reps or seconds. Editing can add or remove a superset without losing
the free-pick criteria. Free picks remain accessory-only and cannot use PB
percentage loading.

# Skipping workouts and prescribed warmups

On the workout check-in page, choose **Skip workout** and confirm. No readiness,
bar feel, notes or exercise entries are required. The workout remains in history
as **Skipped**, leaves the active session, and advances Next Workout. Skipped
sessions are counted separately from completed sessions and included in exports.

Apply `migrations/010-workout-warmup.sql` before deploying warmup support.
Add optional free-text warmup instructions when creating a workout, or edit them
with **Save warmup** in the workout editor. Clearing the field removes the warmup.
Warmups are copied with workouts and programs and captured when a workout starts,
so its warmup step, history and export retain the original instructions.
Older snapshots without a warmup continue to show no warmup.

Apply `migrations/011-workout-warmup-status.sql` to save warmup decisions.
After check-in, a prescribed warmup appears as a separate step with the check-in
panel at the top. Choose **Done** or **Skip warmup** before continuing to the
first exercise. The choice is saved in the workout log and export, and is
remembered after a reload. Workouts without warmup instructions go directly to
exercises. Skipping the whole workout still requires no warmup decision.

Exercise selectors in the workout and accessory editors include a search box.
Type an exercise name to filter the list, then select a result with the mouse or
arrow keys and Enter.
