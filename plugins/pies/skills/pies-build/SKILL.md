---
name: pies-build
description: Build a working PIES Studio app (tables, sample rows, screens, dashboard, menu) from a one-line description using the pies MCP tools.
---

Build the app the user described in PIES Studio, using only the `pies` MCP tools. Follow this order; it is the recipe that built a working Job Tracker on Hobby.

1. **Find the local user and client_id.** On Hobby the tenant is `pies-hobby-desktop`. Call `list_apps` first; the user id and client_id of existing apps are the ones to reuse. Until PV-4365 adds a tool for it, if there are no apps, use client_id `pies-hobby-desktop`.
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

If calls time out for minutes after save_generated_menu (PV-4365), stop calling tools and tell the user to run `/pies-run`; the saved work is kept.

Finish by naming the app id, the tables and screens, and suggest `/pies-run`.
