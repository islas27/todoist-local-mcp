# Notes on alternative model usage

## Context

Tested local 7B models against Haiku (manual chat) on tasks 2.1–2.5 from the build plan. Each model was given the same task card and asked to produce a single TypeScript file. Output was validated with `validate-task.sh` and manual tsc inspection.

Models tested:
- `haiku` — Claude Haiku 3.5, manual chat call
- `qwen2.5:7b` — running locally via Ollama on Mac mini
- `deepseek-coder:7b` — running locally via Ollama on Mac mini

---

## Results

| Task | Complexity | Haiku | qwen2.5:7b | deepseek-coder:7b |
|---|---|---|---|---|
| 2.5 delete-task | Low (baseline) | PASS | FAIL | FAIL |
| 2.4 complete-task | Low | PASS | PASS | FAIL |
| 2.1 get-tasks | Low+ (formatting logic) | PASS | FAIL | FAIL |

---

## Failure notes

**deepseek-coder:7b — 0/3**
Consistent BOS token artifact inside template literals on variables containing underscores:
```
`Task ${input.task<｜begin▁of▁sentence｜>id} deleted.`
`Task ${input.task<｜begin▁of▁sentence｜>task_id} marked as complete.`
```
The tokenizer splits `task_id` at the underscore and bleeds the `<｜begin▁of▁sentence｜>` special token into the output. Not a reasoning failure — a systematic tokenizer issue that will surface on any variable with an underscore inside a template literal. Rules it out for unattended use without post-processing.

**qwen2.5:7b — 1/3**
Inconsistent. Passed the simplest task (2.4) but failed the others:
- 2.5: missing all imports, broken template literal (no backticks)
- 2.1: side-effect-only import (`import "../todoist-client.js"` with no bindings), priority map produced bare numbers instead of `[P1]`-style strings

---

## Conclusion

Neither 7B local model is reliable enough for unattended task execution on this codebase today. Haiku is the floor for first-pass correct output. Revisit when more capable local models are available (likely 13B+ or next-gen 7B).

**Date tested:** 2026-04-14