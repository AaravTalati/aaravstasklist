# Tasks

A plain-text to-do list with checkboxes, inline edits, and a compact entry line. Type a task and press Enter. Add a date at the end, like `Read chapter 11/15`. Dates due today appear red, and past dates appear yellow. Click a task to edit it. Enter or clicking away saves the edit. Clearing the line and saving removes the task.

## Run locally

Install Node.js 24 or newer. From the repository directory, run:

```sh
npm start
```

Open http://localhost:3000. There are no npm dependencies to install. The app stores tasks in `data/tasks.sqlite` by default.

## Host for access from multiple devices

Run the app behind an HTTPS reverse proxy on the same machine. Forward requests to `127.0.0.1:3000` and preserve the original Host header. Set these environment variables on the server before running `npm start`:

| Variable | Value |
| --- | --- |
| `TASKS_ORIGIN` | The external HTTPS address, such as `https://tasks.example.com` |
| `TASKS_PASSWORD` | A strong, unique password for this instance |
| `PORT` | Optional local listening port. Defaults to 3000. |
| `TASKS_DB` | Optional SQLite file path. Use persistent storage. |

Open the HTTPS address and sign in as `tasks` with the password you set. Use the same address on each device to see the same list. Each installation has one shared list for anyone with its password. Back up the SQLite file to preserve your tasks.

## Get updates

If you cloned the repository, run `git pull` and restart the server. If you forked it, sync your fork with the upstream repository first. Keep the same database file when updating.
