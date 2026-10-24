# Solve statistics

## Scope and order

The results table and best-results panel use the current `history` array, in its
original recording order. The project-scoped daily storage record retains the UTC
history boundary, while the daily scramble seed retains local-date behavior.
[Storage rules](STORAGE.md) describe key ownership and reviewed legacy import.
Statistics introduce no new session or scramble grouping.

The table displays newest solves first. Each row's AO5/AO12 belongs to the window
ending at that solve in recording order, including that solve and the preceding
four/eleven attempts. It never includes later attempts. The first four AO5 cells
and first eleven AO12 cells show `—` because their windows are incomplete.

## Averages and bests

For each complete five/twelve-result window, sort a copy of the effective times,
discard exactly one lowest and one highest result, and take the arithmetic mean
of the remaining three/ten. Tied extrema still remove only one occurrence each.
Use recorded precision for calculations; round only through the existing
centisecond display formatter, including correct minute carries.

On desktop, a sticky Best row beneath the table headings shows best single,
best AO5 and best AO12 across the current daily history. Each column is an
independent minimum, rather than values from one solve. The row has no solve
number or delete action and is excluded from the solve count and total. Mobile
retains the separate best-results panel and the original stacked panel order.
Best averages are the lowest completed rolling windows anywhere
in that history, rather than the most recent averages. No completed window means
`—`. Total solving time remains available in the table footer. The chart and table
use the same calculated rolling values.

Deleting any solve recalculates all affected windows, bests and total from the
remaining sequence. Renumbering, persistence and daily reset retain their existing
behavior. Saving a solve updates the newly eligible windows. Statistics are
computed only when history changes, using bounded five/twelve-result slices.

## Penalties and DNF boundary

The current app records finite numeric elapsed seconds; it has no separate +2 or
DNF entry fields. This change retains that storage contract, and Escape continues
to cancel an unsaved attempt rather than inventing a DNF result. Effective seconds
must already include any time penalty before entering the statistics calculation;
the calculation does not apply a second penalty.

The pure calculation layer accepts positive infinity as DNF. One DNF is the
discarded worst result; two or more DNFs make the complete average DNF. DNF is
distinct from an incomplete window and ranks after a finite result. Display DNF as
`DNF` and leave a gap in the chart rather than plotting infinity. Existing storage
does not encode this sentinel; a future DNF entry feature needs its own storage
adapter. Penalty entry and storage migration are outside this change.

The AO5 trimming and DNF rules follow [WCA 9f8](https://www.worldcubeassociation.org/regulations/#9f8)
and [9f9](https://www.worldcubeassociation.org/regulations/#9f9). AO12 retains the
app's existing training convention of trimming one result at each end. The app
retains its existing recorded precision and display rounding, rather than changing
to official competition timing/truncation rules.

## Responsive presentation and verification

The five table columns are number, time, AO5, AO12 and delete. Headers stay visible
while scrolling the history. At 320/390 px, the numeric cells remain readable and
the delete control keeps its 44 px target. Long values may scroll within the table
without making the whole page overflow. The desktop chart stays to the left of the
full-height history panel, beneath the timer. On a phone, the best-results panel
retains three values; the best single spans the first row and both averages share
the second.

Unit and native Chromium checks cover complete/incomplete windows, chronological
mapping, best-versus-latest averages, deletion/reload, append/daily reset, ties,
precision, effective penalized times, DNF math, and phone/desktop readability.

Inspected previews use illustrative history in an isolated localhost context:

- [Desktop, 1440 px](images/statistics-desktop.png)
- [Phone, 390 px](images/statistics-phone.png)
