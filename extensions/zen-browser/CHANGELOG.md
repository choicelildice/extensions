# Zen Changelog

## [Open Workspaces Beyond the Tenth] - {PR-MERGE-DATE}

- Search queries are now percent-encoded when an explicit search engine is configured, so `#`, `&` and spaces no longer truncate the URL or inject parameters.
- Keyboard shortcuts replayed through AppleScript are validated: keys must be a single letter or digit and modifiers must be from the known set. Zen's `accel` modifier now maps to ⌘ (it was `fn`, which System Events rejects), and a trailing space in the **New Tab Shortcut** preference no longer produces an empty key.
- The `zen-sessions.jsonlz4` decoder verifies the `mozLz40` header, caps the declared size and bounds-checks every read, so a corrupt or truncated session file fails fast instead of hanging or over-allocating.
- **Install with Homebrew** runs `brew` asynchronously from an absolute path with a timeout instead of blocking the extension with `execSync`.
- On Windows the profile directory is resolved with `os.homedir()` (`USERPROFILE`) instead of `HOME`, which is usually unset.
- Removed the unused `@types/sql.js` dev dependency and updated dev dependencies to clear an `npm audit` advisory.
- The **New Tab** AI tool now asks for confirmation, showing the exact query or URL, before opening a tab. Previously a prompt injection in AI Chat could navigate the browser silently.
- **New Tab** no longer goes through the clipboard on macOS: the query or URL is passed to Zen's executable as an argument (`--search` / `--new-tab`). On systems where the Zen app cannot be located, the old clipboard-and-paste path is used and the previous clipboard contents are restored afterwards.
- Fixed SQL injection in **Search History**, **Search Bookmarks** and the search-history AI tool: search terms were spliced into `LIKE '%term%'` unescaped, so a quote broke the query and `%`/`_` acted as wildcards, and the `Limit Results` preferences were interpolated into `LIMIT` unvalidated. Terms are now escaped as SQL literals with wildcards neutralised via `ESCAPE`, and limits must be positive integers (falling back to 50).
- Fixed a PowerShell command injection on Windows: opening a history entry interpolated the URL into a double-quoted PowerShell string, so a visited URL containing `$(...)` would have been executed when opened from **Search History**. The URL is now passed as a single-quoted literal via `psLiteral`, matching the existing search commands.
- Fixed the **Open Workspace** command only working for the first ten workspaces. Zen defines switch shortcuts for workspaces 1-10 only, so workspaces 11+ had no "Open Workspace" action and selecting them opened Zen's preferences instead. The command now switches workspaces with Zen's `--space <uuid>` command-line flag (Zen 1.23.3b+, see [zen-browser/desktop#15074](https://github.com/zen-browser/desktop/pull/15074)), which works for any number of workspaces and no longer requires a keyboard shortcut. Space ids are validated as UUIDs before being passed to the Zen process. The Zen process is spawned detached and never awaited, so the command cannot hang or terminate the browser when Zen was not already running. Older Zen versions keep the previous keyboard-shortcut behaviour. The shortcut badge was removed from the workspace list, since only the first ten workspaces could ever show one.

## [Fix] - 2026-09-19

- Fixed the **New Tab** command always searching with Google regardless of Zen's configured default search engine. Added a **Browser Default** search engine preference (now the default): queries are handed to Zen itself, which resolves them with its own default search engine.
- Hardened the Windows search commands so the search query is passed to PowerShell as a literal, preventing queries containing quotes or `$(...)` expressions from being interpreted as PowerShell code.

## [Fix Open Workspace Command for Recent Zen Versions] - 2026-06-05

- Fixed the **Open Workspace** command crashing with `no such table: zen_workspaces`. Zen Browser migrated workspace storage from the `zen_workspaces` SQLite table in `places.sqlite` to a dedicated `zen-sessions.jsonlz4` file (see [zen-browser/desktop#6469](https://github.com/zen-browser/desktop/pull/6469)). The extension now reads workspace data directly from `zen-sessions.jsonlz4` using a pure-TypeScript mozLz40/LZ4 decompressor — no new runtime dependencies required.

## [Fix Bookmark and History Search When Zen Is Running] - {PR-MERGE-DATE}

- Bumped `@raycast/utils` from `^2.2.0` to `^2.2.3` to pick up the fix for `useSQL` not falling back to a DB copy when `node:sqlite` reports `errcode: 5` ("database is locked"). Previously, searching bookmarks or history while Zen was running surfaced "Cannot query the data — database is locked" because the lock detector only matched error message text containing `(5)`/`(14)`, which the native `node:sqlite` path does not produce.

## [Add Kagi Search Engine] - 2026-04-23

- Added Kagi as a search engine option in the extension preferences.

## [Improved Bookmarks Search] - 2025-12-03

- Enhanced bookmark search to also match URLs, not just bookmark titles.

## [Added error handling and new private window command. Refactor actions] - 2025-12-03

- Added error handling to the new window and private window commands.
- Added a command to create a new private window in Zen Browser.
- Refactor actions: centralize AppleScript activation/keystroke helpers to remove duplication and improve reliability when focusing Zen.

## [Fix New Tab and History For Windows] - 2025-11-10

- Fix the new tab and history commands for Windows by using the PowerShell script to open the URL in Zen Browser.

## [Added Create New Window Command] - 2025-10-29

- Added a command to create a new window in Zen Browser.

## [Added Open Workspace Command] - 2025-10-09

- Added a command to open a specific workspace in Zen Browser.
- Added a hook to fetch user shortcuts.
- Improved retry mechanism for SQL queries.

## [Windows Support] - 2025-09-16

- Added Windows Support
- Added a preference to change the location of Zen profiles

## [Simplify Actions and Remove Browser Default Search] - 2025-09-16

- Simplified new tab and history actions to use native Raycast Action.Open instead of AppleScript
- Removed Browser Default search engine option and set Google as the new default
- Removed openHistoryTab and setActiveTab functions in favor of simpler browser opening
- Removed code for searching tabs as it was unused

## [Fix New Tab and History Tab] - 2025-06-11

- Fix new tab and history tab commands, by adding a delay to the script to ensure the URL bar is focused.

## [✨ AI Enhancements] - 2025-05-15

AI Tools to:

- Open New Tab
- Search History

## [Update brew install command] - 2025-04-24

- Update the brew install command from Firefox to Zen Browser.

## [Add Browser Default Search Engine] - 2025-04-22

- Added the ability to use the user's default browser search engine set within Zen as the search engine.
- Changed the default search engine to the Browser Default.

## [Changing the name of app called] - 2025-03-21

- Changed name of app being called from "Zen Browser" to "Zen"

## [Add custom new tab shortcut] - 2025-03-10

- Add ability to set a custom new tab shortcut.
- Default is `command t`.
- Quicker url entry with copy-paste command.

## [Fix Default Profile Detection] - 2025-02-09

- Made the default profile detection more resilient by expanding the profile
  directory search logic.
- Changed the URL for the Zen Browser logo.

## [Fix New Tab] - 2025-01-11

- Fix new tab command, by removing unnecessary app check.

## [Update Logo] - 2024-12-11

- Updated to latest logo since rebrand.

## [Fix Bookmark Duplicates Issue] - 2024-11-21

- Fix duplicate entries in bookmark search results. Previously, bookmarks would show up multiple times if they had tags. Now each bookmark appears only once regardless of how many tags it has.

## [Fix Bookmark Search] - 2024-11-18

- Fix Bookmark search by using the SQlite DB instead of bookmarkbackups directory.

## [Initial Version] - 2024-10-02

- Copied Firefox extension and rename all necessary parts.
