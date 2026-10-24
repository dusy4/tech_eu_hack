---
name: spelunk-handoff
description: Pick up and carry out decisions a team accepted in Spelunk. Use when the user asks to check, pull, implement or act on Spelunk handoffs, "what did the team decide", or "work the handoff", and the repo-analysis MCP server is connected.
---

# Acting on a Spelunk handoff

In a Spelunk session a team talks through code; every proposal is accepted or dismissed by a person, and the accepted
batch is published as a **handoff** on the `repo-analysis` MCP server. Each decision carries what was said, why, and
(for code decisions) the symbol with its file and lines.

## Steps

1. **Find it.** `list_handoffs` (open ones, newest first). If several are open, show them (id, title, decisions) and
   ask which to take, unless the user named one.
2. **Read it.** `get_handoff(handoff_id)`. Its `instructions` field is the handoff as a numbered task list.
3. **Claim it.** `update_handoff_status(handoff_id, "in_progress", "<who/what is starting>")` so the room sees it
   was picked up.
4. **Ground each decision in the code** before changing anything:
   - focus decisions: open the `code_ref` (path and lines); if it's missing or stale, use `find_symbol` and
     `get_symbol_body`;
   - check impact with `symbol_relations` (`callers`, `implements`) so a change doesn't break call sites;
   - ask decisions are questions the team left open: answer them from the code (use the `repo-analysis` skill), and
     put the answer in your summary rather than guessing a change.
5. **Plan, then change.** Present a short plan mapping each decision to concrete edits and ask the user to confirm
   before editing. Keep to what was decided; flag anything the decisions don't cover instead of inventing it.
6. **Verify.** Build and run the relevant tests.
7. **Close it.** `update_handoff_status(handoff_id, "done", "<one-line summary of what changed, files touched>")`, or
   `"dismissed"` with the reason if it can't or shouldn't be done.

## Notes

- Each decision was confirmed by a person, but what was said is a transcript of speech: if a decision is ambiguous
  or conflicts with the code, ask rather than interpret.
- Code references were resolved when the handoff was published, from the last index build; line numbers can drift.
- Don't publish handoffs yourself (`publish_handoff` is for the Spelunk app).
