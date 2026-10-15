# Browser solve storage

CubeTimer365 writes one project-scoped record at
`cubetimer365:daily-history:v1`:

```json
{"version":1,"date":"2026-10-15","history":[12.34,23.45],"legacyMigration":"imported"}
```

The date retains the existing UTC daily history boundary; the scramble remains
based on the local calendar date. History is a chronological array of finite,
non-negative elapsed seconds. This changes key ownership and migration behavior,
not the timer's precision, penalties, statistics or daily scope. The existing
daily reset still starts an empty current-day history; it is not a new archive or
historical-day browser.

The date, times and legacy-import decision are saved in one write, so import does
not leave a partially written date/history pair or a separate repeat-import flag.
A saved `imported` or `ignored` decision survives reload and the UTC day change.
Normal saves, deletion and resets write only the namespaced key. They never write
or delete generic `history` / `today`, or call `localStorage.clear()`.

## Legacy ambiguity and import

The previous CubeTimer version used generic `history` and `today` keys. Those
values have no schema marker or origin-app provenance. A numeric array and a date
are plausible timer data, but do not prove ownership. They are never silently
adopted as CubeTimer solves.

When no owned results are present and today's shared values pass validation, a
compact **Review previous browser results** control offers a dated preview and an
explicit import choice. Import only if the results belong to this timer. Keeping
them separate records that decision without changing the shared values. Import
copies the reviewed snapshot to the namespaced record; original shared keys and
other applications' data remain byte-for-byte untouched. Reload never imports a
second time or resurrects results deleted from the owned record. New owned solves
take precedence over a pending shared candidate; import does not overwrite them.

Only a real `YYYY-MM-DD` matching the current UTC day, plus a nonempty array of
finite non-negative numbers, is offered. Invalid JSON, objects, numeric strings,
null/non-finite/negative entries and mismatched dates are ignored and preserved.
Older legacy data is also left intact for manual recovery rather than relabeled
as today's solves. No ownership is inferred from the shape of that data.

## Published app inspection

On 2026-10-15 the public `progbeat.dev` root was an empty landing document. Its
hosting repository also published `/lights-out/`; the actual deployed Lights Out
page used `lights-out.reaction-lab.v2`, with a versioned records object. The live
CubeTimer used generic `history` and `today`. This inspection found no current
collision between those published apps, but is not proof about every historical
or private application on the origin. It does not establish ownership of an
individual browser's generic keys.

A namespace prevents accidental collisions; it is not a security boundary between
scripts on the same origin. No other app or repository was modified for this fix.

## Storage failure and recovery

Unknown or malformed data at the owned key is not overwritten. Unreadable storage
and failed writes also leave previous serialized data intact. The timer continues
in memory and displays a storage warning; those new in-memory results will not
survive reload until persistence is repaired. Export/recover the old raw record
before deliberately replacing it; the app does not silently reset corrupt data.

Tests cover explicit import/refusal, repeat loads, deletion after import, the UTC
boundary, invalid dates/data, pre-existing owned results, failed writes, and other
app keys. Native Chromium checks assert that the original shared values and Lights
Out key remain unchanged during each migration path.

Inspected import previews: [desktop](images/storage-import-desktop.png) and
[phone](images/storage-import-phone.png); the 320 px view was also checked.
