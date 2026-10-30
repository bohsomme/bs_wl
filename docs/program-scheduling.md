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
