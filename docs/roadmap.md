# Punaise: Roadmap

Scope, phases, gates, metrics and risks. Work that is ready to build is broken down in [backlog.md](backlog.md).

## MVP scope

The MVP (end of Phase 2) tests one hypothesis:

> Developers gain enough value from keeping several live code concepts visible together, and from handing those same concepts to their agents, that they use Punaise repeatedly during normal work.

### Included

1. VS Code side-panel extension, also published to Open VSX
2. Pin current symbol in one command
3. Pin selected source text
4. Live signature, code and documentation views, with highlighting that matches the editor theme
5. Navigate from a pin to its source
6. Create, rename, delete and reorder personal themes
7. Persist personal themes in workspace state, with JSON export and import
8. Publish and load repository themes using schema v1
9. Follow-cursor with exact symbol and file matching, plus a defined fallback when nothing matches
10. Unresolved-pin detection using the [resolution states](design.md#detect-rather-than-prevent-staleness)
11. Copy Theme as Context, and a read-only local MCP server
12. `punaise validate` for themes, usable in CI
13. TypeScript and Python support through installed language services
14. Local usage stats (pins viewed, follow-cursor hit rate) visible only to the user

### Explicitly excluded

- Built-in AI features and bundled inference
- Relationships in the schema
- Cloud sync, user accounts, a hosted backend
- Telemetry and team analytics
- Complex graph visualization
- Editing code inside the side panel
- Guaranteed refactor-safe symbol identity
- Languages beyond TypeScript and Python
- JetBrains and other non-VS Code editors
- Paid feature enforcement

## Roadmap overview

The MVP is complete at the end of Phase 2. Every phase ends at a go/no-go gate, and later phases are built only when the previous gate passes.

| Phase | Focus | Effort | Gate to continue |
| --- | --- | --- | --- |
| 0 | Validation prototype: in-memory pinboard with live, theme-matched code | 3–6 evenings | The pinboard is repeatedly useful without themes or AI |
| 1 | Personal MVP: themes, follow-cursor modes and fallback, export, external testers | 1–2 weeks | Daily personal use, and two external testers still using it after two weeks |
| 2 | Shareable themes and agent context: schema v1, validate, Copy Theme as Context, MCP server, CLI | 2–3 weeks | A theme reviewed in a PR, reused with no setup, and useful to an agent |
| 3 | Deterministic suggestions: relevance ranking and explained suggestions | 2–4 weeks | Most surfaced themes are relevant and the panel stays calm |
| 4 | Public beta: Marketplace and Open VSX, positioning README, sample repo, sponsorship | 2–4 weeks | 10 retained external users and 3 external repos with themes |
| 5 | AI-assisted authoring: bring-your-own-provider drafting, explanations, repairs | 3–6 weeks | Sustained team use of repository themes |
| 6 | Team knowledge: CI health checks, PR impact analysis, catalogs, possible paid tier | Months | — |

## Roadmap phase details

Each phase lists its objective, deliverables and exit criteria; work does not continue past a failed gate.

### Phase 0: Validation prototype

**Effort:** 3–6 evenings

**Objective:** Reach the first useful interaction with minimal architecture.

Deliverables:

- Scaffold the extension and sidebar view
- Resolve the current symbol and pin it in memory
- Render live signature and source with theme-matched highlighting
- Navigate from pin to source
- Test on one substantial TypeScript or Python repository

Exit criteria:

- Five to ten pins stay useful through a real investigation
- The panel measurably reduces repeated navigation
- Code is readable in a narrow sidebar
- It feels better than bookmarks plus open tabs

**Gate:** continue only if the basic pinboard is repeatedly useful without themes or AI.

### Phase 1: Personal MVP

**Effort:** 1–2 weeks of focused spare time

**Objective:** A tool fit for daily personal use, tried by people other than its author.

Deliverables:

- Personal themes, theme selector, add/remove/rename/reorder pins
- Symbol and selection pins with signature, code and documentation views
- Workspace persistence plus JSON export and import
- Fixed, manual, follow-cursor and freeze modes
- Fallback panel state when follow-cursor finds no match
- Local usage stats including follow-cursor hit rate
- Error handling, empty states, serialization tests
- Recruit two or three external testers on their own repositories

Exit criteria:

- Themes survive editor restarts and folder moves (via export)
- Follow-cursor is helpful rather than distracting
- Used during several real development tasks
- At least two external testers keep using it for two weeks
- No source content is persisted unintentionally

### Phase 2: Shareable themes and agent context

**Effort:** 2–3 weeks

**Objective:** Turn personal context into team-reviewable knowledge that agents can also use.

Deliverables:

- `.punaise/` discovery, schema v1, `README.md` for people and agents
- Publish a personal theme to the repository; load and validate shared themes
- File watcher for theme changes; unresolved-pin diagnostics
- Copy Theme as Context
- Read-only local MCP server and `punaise export`
- `punaise validate`, runnable in CI
- Example themes, including one drafted by an agent and then reviewed

Exit criteria:

- A theme is added and reviewed in a pull request
- A second developer uses it with no manual setup
- Broken references are visible and actionable
- An agent produces a valid theme from the README alone
- Testers report that theme context improves an agent's answer on a real task

### Phase 3: Deterministic context and suggestions

**Effort:** 2–4 weeks

**Objective:** Make themes useful based on where the developer is.

Deliverables:

- Theme and pin relevance ranking
- Suggestions from references, callers, callees, types and implementations, each with a reason
- Add, dismiss and suppress actions for suggestions
- "Relevant from multiple themes" view
- Lazy usage view
- Configurable follow-cursor sensitivity

Ranking signals, strongest first: exact symbol in theme; current file in theme; direct caller or callee in theme; referenced or referencing symbol; parameter or return type; shared module or directory; recently used theme.

Exit criteria:

- Most surfaced themes are relevant during normal navigation
- Hit rate rises clearly above Phase 1's exact-match baseline
- Suggestions stay within the 500 ms budget
- Users understand why each pin was suggested
- The panel stays calm

### Phase 4: Public beta and sustainability

**Effort:** 2–4 weeks, overlapping with feedback

**Objective:** Validate demand beyond the author's own repositories.

Deliverables:

- VS Code Marketplace and Open VSX releases
- README with positioning against CodeTour, Swimm and agent-only workflows
- Short demo GIF or video, including the agent-context flow
- Sample repository with themes
- Issue templates, contribution guide, privacy statement
- Sponsor links and a support page; free and open-source core; tiers such as €3, €7 and €15 per month; no feature restrictions

Success indicators: see [Success metrics](#success-metrics).

### Phase 5: AI-assisted authoring

**Effort:** 3–6 weeks

**Objective:** Reduce theme creation and maintenance effort beyond what users' own agents already give them.

Deliverables:

- Suggest pins for the active theme
- Draft a theme from a natural-language question
- Explain a pin in a theme's context
- Propose repairs for unresolved pins, with evidence and a diff
- Exact context preview and explicit approval before any change
- Bring-your-own-provider or bring-your-own-key design

Exit criteria:

- AI suggestions save more time than reviewing them costs
- Proposals consistently include evidence
- The core product stays fully usable without AI

**Gate:** build only if Phase 4 users ask for convenience their existing agents do not already give them.

### Phase 6: Team knowledge and maintenance

**Effort:** several months, product-dependent

**Objective:** Support maintained engineering knowledge across teams.

Possible deliverables: ownership metadata; pull-request impact analysis for affected themes; theme health reports; onboarding sequences; relationships and a theme graph view (schema v2); export to Markdown docs; GitHub and GitLab integrations; organization theme catalogs; team agent-context policies.

Commercial boundary: the local extension, CLI, MCP server and repository format stay free. Paid functionality, if any, covers team coordination, hosted management and organizational policy.

**Gate:** pursue only with evidence of sustained team use of repository themes.

## Success metrics

Retention and use by non-authors are the primary signals; installs and donations are secondary.

### Primary product metrics

1. Weekly retained users outside the author's network (target: 10 at Phase 4)
2. External repositories containing shared themes (target: 3 at Phase 4)
3. Themes used by someone other than their author
4. Follow-cursor hit rate: share of cursor positions that surface a relevant pin
5. Agent-context uses per active user per week (copy, MCP or CLI export)
6. Share of surveyed active users using it weekly (target: 25–30%)

### Supporting metrics

- Installers who create a first pin; first-pin users who create a theme
- Pins viewed and pin-to-source navigations per session
- Follow-cursor enabled versus disabled

Because there is no telemetry, these come from local usage stats that users choose to share, short surveys and public repository counts.

### Qualitative questions

- Does Punaise reduce repeated navigation?
- Does it help users resume an investigation after interruption?
- Are themes useful to someone who did not create them?
- Does follow-cursor surface knowledge at the right time?
- Does theme context improve agent results on real tasks?
- Does the JSON feel maintainable in code review?

### Sustainability metrics

1. Repeated feature requests converging on a small set of gaps
2. Recurring support covering basic development-tool costs
3. At least one unsolicited donation or subscription
4. Evidence of team use before any investment in paid team features

Raw Marketplace installs are not a measure of product value.

## Risks and mitigations

The two largest risks are agents making manual exploration less common and existing tools covering enough of the idea; both are addressed by the agent-context strategy and sharper positioning.

| Risk | Mitigation |
| --- | --- |
| Agents erode the value of manual code exploration | Make themes the context agents consume (Tier 1 in Phase 2), so more agent use means more theme value |
| CodeTour or Swimm already cover enough for most users | Position on non-linear, symbol-anchored, cursor-aware sets and agent context; state it plainly in the README |
| It becomes only a nicer bookmark extension | Prioritize live multi-view pins, themes, relevance and agent export over navigation features |
| Follow-cursor shows nothing in repos with few themes | Defined fallback state, hit-rate tracking from Phase 1, broader signals in Phase 3 |
| Schema v1 locks in a weak identity model | Structured identity (name, kind, container, optional fingerprint) defined before the first shared theme |
| Themes need too much manual curation | Themes emerge from investigation; agent-drafted themes; deterministic suggestions before built-in AI |
| Symbol identity breaks during refactors | Explicit resolution states, path hints, fingerprints, and repair proposals from language services and Git |
| Cursor-following is distracting | Debounce, stable canonical order, freeze and fixed modes, no changes to expanded content |
| Code rendering looks foreign in the sidebar | Budget theme-matched highlighting in Phase 0; compact signatures by default |
| Validation is biased by the author's own use | Two or three external testers by the end of Phase 1 |
| Language services are inconsistent | Start with TypeScript and Python, feature-detect, degrade gracefully |
| AI costs exceed financial support | No bundled inference; agent context uses the user's own agent; Phase 5 is bring-your-own-provider |
| Shared themes become stale documentation | Semantic references only, `validate` in CI, repair in normal PRs |
| Privacy concerns block adoption | Local by default, no telemetry, local-only MCP server, payload previews |
