# Release checklist

Run this by hand against the deployed app after every release.

- [ ] Log in with the household password.
- [ ] Add a new exercise.
- [ ] Register an entry for it.
- [ ] Check the status page shows the new value and delta.
- [ ] Open the exercise page and check the chart.
- [ ] Edit the entry inline and confirm the chart and status page update.
- [ ] Delete the entry and confirm the empty states show.
- [ ] Archive the exercise, confirm it leaves the status page, then restore it.
- [ ] Install the app on a phone home screen (Android "Installer app" or iOS "Legg til på Hjem-skjerm") and confirm it opens standalone.
- [ ] Register a body weight on `/vekt` and confirm the chart updates.
- [ ] Confirm `replication: 'on'` in `GET /api/health` after deploy.
