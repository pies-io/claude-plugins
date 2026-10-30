---
name: pies-build
description: Build a working PIES Studio app (tables, sample rows, screens, dashboard, menu) from a one-line description using the pies MCP tools.
---

Build the app the user described in PIES Studio, using only the `pies` MCP tools. Follow this order; it is the recipe that built a working Job Tracker on Hobby.

**Carry the build through to the end without stopping to ask.** The only thing you may ask for is the sign-in email when `$PIES_USER_EMAIL` is unset and the prompt does not give one. Never ask the user for an app id, user id or workspace id: get them from the tools (`list_apps`, `list_workspaces`, the id `create_app` returns). If a call fails, read the error, fix the arguments and retry; do not hand the plan back to the user.

1. **Find the local user and client_id.** Every tool needs `user_email`: use `$PIES_USER_EMAIL` if set, otherwise ask the user for the email they sign in to PIES Studio with. Call `list_apps` with it first; the user id and client_id of existing apps are the ones to reuse. On a single-tenant install (Hobby) client_id may be omitted: Studio uses the install's tenant. On a multi-tenant server (Enterprise, or a dev stack) use `$PIES_CLIENT_ID` or a client_id given in the prompt; if create_app answers "client_id is required" and you have none, that is the one case to stop and ask for the tenant (client) id.
2. **create_app** with that user and client_id. Keep the returned app id.
3. **compile_data_spec**: one-word snake_case table names (`customers`, `jobs`). A status field is an enum; give its values.
4. **save_generated_tables** with explicit ids and 5–10 sample rows per table. Check that enum fields only use the listed values.
5. **compile_screen_spec**, one call per screen:
   - list screens: `hero` + `filters_bar` + table
   - dashboards: `kpi_row` + `chart_grid` + `table`
   - use add_crud only for a single table, never for more than one in one call.
6. **save_generated_menu** with the menu items, then the styles in a SEPARATE call.

Post-compile fixes to check before you finish:
- charts need `yAxisColumn` set
- filter operators are `eq`, not `=`
- widget ids are unique across the screen
- no joins inside table widgets (one table per widget)

If calls time out for minutes after save_generated_menu, stop calling tools and tell the user to run `/pies-run`; the saved work is kept.

Finish by naming the app id, the tables and screens, and suggest `/pies-run`.
