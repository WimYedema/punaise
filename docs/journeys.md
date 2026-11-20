# Punaise: User journeys

Punaise is about getting the complete picture of what you are looking at, and having a place to collect your detective work while you figure out how things work. These eight journeys describe that in practice. Journeys 1–3 decide whether Phases 0–1 succeed, so they are written in the most depth.

| # | Journey | Who | First supported in |
| --- | --- | --- | --- |
| 1 | First five minutes | Any developer who just installed it | Phase 0 |
| 2 | The full picture of one thing | Developer landing on unfamiliar code | Phase 0 (manual), Phase 3 (suggested) |
| 3 | The investigation | Developer chasing a bug or a "how does this work?" question | Phase 1 |
| 4 | Asking for help | Stuck developer and a more senior colleague | Phase 1 (clipboard), Phase 2 (draft PR) |
| 5 | Investigation to shared theme | The same developer, once the answer is found | Phase 2 |
| 6 | The newcomer | Developer new to the codebase or the area | Phase 2 (exact match), Phase 3 (ranked) |
| 7 | Handing context to an agent | Developer working with a coding agent | Phase 2 |
| 8 | The refactor | Developer whose change breaks a shared pin | Phase 2 (detect), Phase 5 (AI repair) |

Each journey covers the trigger, the steps, the moment it pays off, how it can fail, the signals it feeds, and what it implies for the product. Items marked **new scope** are not yet in the roadmap and need a decision.

## Journey 1: First five minutes

**Who and trigger:** An experienced developer installs Punaise after seeing the demo GIF. They are in the middle of real work in a TypeScript or Python repository.

**Steps:**

1. They open the Punaise panel. The empty state says one thing: put the cursor in a function and press the pin shortcut.
2. They pin the function they are working on. Its signature and code appear, highlighted like the editor.
3. They go to a function it calls and pin that too.
4. Both functions are now visible side by side, while the editor shows a third file.
5. They click a pin's header and jump back to the source.

**Payoff:** The second pin. Seeing two related functions together without switching tabs is the moment the idea clicks.

**How it fails:**

- The language server is not ready (for example, no Python interpreter selected), and pinning fails with no explanation
- Code in the panel looks unlike the editor, so it feels like a toy
- There is no shortcut, so pinning feels slower than opening a tab

**Signals:** share of installers who create a first pin; share who create three or more pins in their first session.

**Implications:**

- An empty state with a single action and a default keybinding
- A scratch theme that exists automatically, so no setup is needed
- A clear message when a language server is missing or still loading

## Journey 2: The full picture of one thing

**Who and trigger:** A developer arrives at `SimulationService.run` from a stack trace or a pull request. They have never seen this module.

**Steps:**

1. They pin `run`.
2. They want to know what calls it, what it takes, and how it is tested.
3. In Phases 0–2 they find these with go-to-definition and find-references, pinning the API endpoint, the `Scenario` model and a test.
4. From Phase 3, the pin's usage view lists callers, parameter types and tests as suggestions, each with a reason. One click pins each.
5. They read the `Scenario` documentation view and the test's code in the panel, without opening those files.

**Payoff:** The answer to "what calls this, what does it need, and how is it used?" sits in one panel, all live code, next to the function being read.

**How it fails:**

- Reference lists are too long, or full of library types, so the picture is noise
- Call hierarchy in large Python repos is slow
- Manual pinning in Phases 0–2 feels like too much work for one question

**Signals:** pins added from suggestions; time to answer a set question in tester sessions.

**Implications:**

- **New scope:** a simple "Pin with neighbours" action in Phase 1 or 2. It would use only references, type definitions and test files, with no ranking. This tests the journey before Phase 3's full suggestion engine.

## Journey 3: The investigation

**Who and trigger:** A backend developer gets a bug report: the results page is slow, and the logs show the results query running twice per request. They do not know this part of the code.

**Session 1 steps:**

1. They create a theme named after the question: "Why does the results query run twice?"
2. They pin the results endpoint, then follow it to the repository function that runs the query and pin that.
3. Find-references shows two callers: a serializer and a view helper. They pin both.
4. On the serializer pin they add a note: "Calls fetch() again for pagination count?"
5. They check the view helper, find it only runs on cache misses, and mark that pin as **ruled out**.
6. The day ends before they find the cause. They close VS Code.

**Session 2 steps:**

1. The next morning the theme reopens as they left it: same pins, same notes, same expanded pins.
2. They read the open lead on the serializer and continue from there.
3. They discover a middleware that also calls the serializer. They realize they passed through it yesterday without pinning it, and pin it from the trail of recently visited symbols.
4. They mark the middleware pin **confirmed** and add a conclusion note explaining the cause.
5. They fix the bug with the theme open beside the editor.

**Payoff:** Resuming in seconds instead of rebuilding yesterday's reasoning. The theme records not just where the code is, but what was suspected, ruled out and confirmed.

**How it fails:**

- They only realize something mattered after navigating away, and cannot find it again
- Notes feel like extra work, so they skip them and the reasoning is lost
- Fifteen pins make the panel cluttered and hard to scan
- Editing code during the fix shifts or breaks pins mid-investigation

**Signals:** themes reopened in a later session; notes per theme; time to resume in tester sessions.

**Implications (all new scope, personal themes only at first):**

- **Theme as a question:** the theme description can hold the question being investigated
- **Pin notes:** a short note on any pin, not only standalone note pins
- **Lead status:** mark a pin as open, ruled out or confirmed, shown as a subtle badge and filter
- **Recent trail:** the last 20 or so symbols visited, pinnable after the fact
- **Restored state:** each theme remembers which pins were expanded and its scroll position

These implications make "a place to collect your detective work" concrete. Recent trail and pin notes are probably cheap enough for Phase 1; lead status can follow if testers use notes heavily.

## Journey 4: Asking for help

**Who and trigger:** A junior developer is adding a new model type. It validates, but never appears in the results list. After most of a day on a question theme like Journey 3's, they are stuck and want help from a senior colleague.

**Steps:**

1. The question theme holds six pins, notes on most of them, two leads marked ruled out and one still open.
2. They choose **Share theme**. Punaise writes it to `.punaise/themes/` marked as a draft, keeping the notes and lead status, and they commit it to their branch.
3. They open a draft pull request, or reuse the one they already have, and post a link to the theme file in team chat: "Stuck on this; here is what I have tried."
4. The senior opens the link. The JSON is readable in the browser, which may be enough for a quick look.
5. For a closer look, the senior checks out the branch. The theme appears in their panel with a draft badge, showing live code beside the junior's reasoning.
6. The senior sees what is missing: new models must be registered in a plugin registry. They pin the registry function, add a note, and push to the branch or suggest the change in PR review.
7. The junior pulls, sees the new pin and note, and fixes the bug.
8. Before merging, they decide: keep the theme as documentation (Journey 5: rename it, strip the dead ends, remove the draft mark) or delete the file.

For quick questions without a branch, **Copy Theme as JSON** pastes the theme into chat, and the senior imports it with one action.

**Payoff:** The senior understands the problem in minutes, including what has already been ruled out. The junior asks for help without a wall of text, and the senior's answer is recorded in the theme instead of lost in chat.

**How it fails:**

- A draft theme full of half-formed notes is merged by accident
- The senior's checkout differs from the junior's, so some pins do not resolve
- The junior hesitates to share messy notes
- Both edit the theme at once and get a merge conflict
- The senior does not have the extension and cannot make sense of the file

**Signals:** themes shared through a branch or clipboard; themes edited by more than one person; recipients who install the extension after receiving a theme.

**Implications:**

- **New scope:** an optional `"status": "draft"` field on themes. `validate` warns in CI when a draft theme is about to merge.
- **New scope:** pin notes and lead status become optional pin fields in schema v1, so they survive sharing. Until now they were planned for personal themes only.
- **New scope:** highlight pins and notes added since the theme was last opened, so a returned theme shows what the senior contributed.
- Copy Theme as JSON and import each take one action.
- This journey is a strong argument for moving lead status into Phase 1: ruled-out leads are what make a shared question useful.
- It is also the most natural way for Punaise to spread within a team: every share reaches a colleague who may not have it yet.

## Journey 5: Investigation to shared theme

**Who and trigger:** The developer from Journey 3 has fixed the bug. They expect teammates to hit this area again, or a reviewer asks how the results query works.

**Steps:**

1. They choose **Publish to Repository** on the theme.
2. A preview shows the JSON that will be written. Ruled-out pins and private notes are left out by default, and can be added back.
3. They rename the theme from the question to the concept: "Results query lifecycle".
4. The file is written to `.punaise/themes/` and added to the bug-fix pull request.
5. The reviewer checks out the branch, sees the theme in their panel, and reads the short JSON diff.
6. The theme merges with the fix.

**Payoff:** The investigation becomes team knowledge with almost no writing, reviewed in the same PR as the code it describes.

**How it fails:**

- Personal or half-formed notes leak into the repository
- The JSON diff is noisy, so reviewers skim past it
- A reviewer without the extension cannot make sense of the file

**Signals:** themes published; themes included in merged PRs.

**Implications:**

- **New scope:** notes are private by default and become shared only when chosen at publish time
- The publish preview is the main safeguard against leaking investigation noise
- `.punaise/README.md` must make a theme file readable without the extension

## Journey 6: The newcomer

**Who and trigger:** A developer in their first weeks on the team is assigned a ticket that touches results loading.

**Steps:**

1. They open the repository function that runs the results query.
2. With follow-cursor on, the panel shows "Results query lifecycle" with a reason: "contains this function".
3. They expand it and see the endpoint, the serializer, the middleware and the note explaining the double-query pitfall.
4. They make their change without reintroducing the bug.
5. They pin one of the theme's functions into their own scratch theme for the rest of the task.

**Payoff:** Team knowledge appears at the point of use, without the newcomer knowing it exists or what to search for.

**How it fails:**

- In a repo with few themes, nothing matches most of the time, so follow-cursor seems useless
- An irrelevant theme surfaces and erodes trust
- The panel changes while they are reading it

**Signals:** themes viewed by non-authors; follow-cursor hit rate; how often follow-cursor is turned off.

**Implications:**

- Every surfaced theme shows why it appeared
- The no-match fallback state matters as much as the match
- Pinning from a shared theme into a personal one should take one action

## Journey 7: Handing context to an agent

**Who and trigger:** A developer works with a coding agent such as Claude Code or Cursor. The task: add caching to the results query.

**Steps (theme to agent):**

1. They tell the agent to use the "Results query lifecycle" theme. The agent fetches it through the local MCP server, or the developer pastes it with Copy Theme as Context.
2. Before sending, the developer sees the size estimate and chooses signatures only or full code.
3. The agent reads the endpoint, repository function, middleware and pitfall note.
4. It proposes caching in the right layer and keeps the double-query fix intact.

**Steps (agent to theme):**

1. The developer asks the agent to draft a theme explaining how authentication works.
2. The agent reads `.punaise/README.md` and writes `authentication.json`.
3. `punaise validate` reports that all pins resolve.
4. The developer opens the theme in the panel, removes two weak pins and keeps the rest.

**Payoff:** The agent starts from curated context instead of wandering, and the developer knows exactly what it was given.

**How it fails:**

- Exported context is too large and crowds out the task
- Stale pins feed the agent the wrong code
- The agent ignores the MCP tools unless told to use them

**Signals:** agent-context exports per active user per week; tester reports of better agent results.

**Implications:**

- Exports include each pin's resolution state, so stale pins are visible to the agent too
- A view choice (signatures, code, docs) and size estimate on every export
- Short README guidance on prompting agents to use themes

## Journey 8: The refactor

**Who and trigger:** A developer renames `ResultsRepository.fetch` to `ResultsStore.load` and moves it to a new file. A shared theme pins the old symbol.

**Steps:**

1. After the rename, the panel marks the pin as a **renamed candidate**. It proposes `ResultsStore.load`, citing the matching signature fingerprint and the Git rename.
2. They accept. The theme JSON updates and appears in the same PR.
3. CI runs `punaise validate` and passes.
4. The reviewer sees the one-line theme change next to the code change.

If the developer does not use the extension, CI reports the theme, the broken pin and the likely candidates instead.

**Payoff:** Shared themes stay correct as part of normal refactoring, with no separate documentation review.

**How it fails:**

- Strict CI failures on themes annoy people, and they delete themes rather than fix them
- A confident but wrong repair proposal is accepted without thought

**Signals:** unresolved pins over time; time from break to repair.

**Implications:**

- **New scope:** `validate` warns by default and fails only for themes explicitly marked as maintained
- Repair proposals always show their evidence, and are never applied automatically
