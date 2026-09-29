# Birth profile edit policy

Deploy `supabase/migrations/202609280001_birth_profile_versions.sql` after the two existing account migrations and BEFORE deploying this application version. It has not been applied to the hosted database by this change.

- First save: version 1, no edit timestamp. Identical saves: no version/timestamp changes.
- Birth date, time, gender or timezone change: version increments and one rolling 720-hour cooldown starts. Names are not birth data.
- Authenticated backend calls the atomic SQL save function; it does not trust client clocks or a supplied user ID. An app-user row lock serializes edits and reservations.
- Reports have an owner version and birth-data snapshot. Fingerprints are namespaced by monotonically increasing version: returning to original birth data does not revive previous reports or refund credits. Existing quota consumption rules are reused unchanged.
- Old reports without snapshots remain stored and are marked old/unknown, never backfilled with guessed birth data. UI displays their saved JSON and disables recalculation by topic. New comparisons use current data and reserve quota normally.
- Reservations require the version used on the client; stale tabs are rejected. Result updates on old versions are rejected by a database trigger.
- Calendar is derived from the current chart; saving clears day selection and resets its month cursor. No notification scheduling or saved-calendar-item implementation exists yet. Future implementations must carry a profile version and cancel/ignore outdated jobs.
- Local mock mode remains unrestricted and uses browser storage; it is not an exemption accepted by the server.

Validation: run JS tests for profile-policy, profile-endpoint, account-api and line-session-function. `supabase/tests/birth_profile_versions.sql` exercises SQL behavior in a transaction that rolls back; run it against a migrated test database. Verify concurrent reservations/edits in staging before rollout. No production migration or deployment is performed automatically.
