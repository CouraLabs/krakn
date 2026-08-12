# krakn — Engineering Guidelines

Working conventions for this repository. Follow these when adding or modifying code, unless a local change explicitly supersedes them.

## Runtime & layout

- **Runtime is Bun**, ESM throughout (`"type": "module"`). No CommonJS, no `require`.
- Source lives under `src/`. Entrypoints are thin: `src/cli.ts` (main), `src/z.ts` (scratch/experimental).
- Core agent plumbing lives in `src/harness/`, tool implementations under `src/harness/tools/`, TUI under `src/tui/`.
- Each tool is a folder with a `<name>/` module exporting a `create<Name>Tool(env)` factory returning an `AgentTool`.
- Shared tool plumbing that is not itself a user-facing tool (file-path errors, mutation queue, prompt loading, runtime guards, snapshots, file-kind sniffing) lives directly in `src/harness/tools/` as flat modules.
- The `hashline/` module is a self-contained engine imported through a barrel (`src/harness/tools/hashline.ts`) that re-exports the submodule surface. Consumers import from the barrel, not the submodules directly.

## Tooling

- Typecheck with `bunx tsc --noEmit`. `tsconfig.json` excludes `*.test.ts` and the vendored `pi-hashline-edit-master/`; keep those exclusions.
- Run tests with `bun test` (Bun's test runner, `describe`/`test`/`expect` from `bun:test`).
- No linter or formatter is configured. Match the file's existing style and keep changes minimal.

## Formatting — current split

The codebase is *not yet* uniform, and you must match the surrounding file:

- `src/harness/tools/` (implementation) and all `*.test.ts`: **tabs for indentation, semicolons, single quotes where used**.
- `src/z.ts`, `src/harness/agent.ts`, `src/harness/provider.ts`, `src/harness/file-credential-store.ts`: **2-space indentation, no semicolons, double quotes**.
- Import path style is mixed: most files use extensionless specifiers (`../path-utils`); a few use explicit `.ts` (`../path-utils.ts`). Follow the file you are editing.

Do not reformat an entire file to a new dialect while making a change — keep the diff surgical.

## Type organization — the folder-types rule

- **Every folder that directly contains files gets one `<folder-name>-types.ts`** holding all of that folder's local `type`/`interface` declarations (both exported and module-local), e.g. `harness-types.ts`, `tools-types.ts`, `bash-types.ts`, `edit-types.ts`, `hashline-types.ts`.
- Files in the folder **import from it rather than re-declaring shared types**. No folder has a second, competing types file.
- A `Static<typeof xSchema>` input type lives in the types file **together with its `xSchema` const** — the schema is exported from the types file and re-imported by the impl, so the input type and its schema cannot drift apart and there are no circular value imports.
- Keep exported names identical when moving a declaration, so barrels and cross-folder consumers keep working.
- Leave function-local (nested) types where they are.
- Modules that declare no types/nothing shared get no types file.

## Schemas

- Input schemas are **TypeBox** (`Type.Object({...})`), not hand-written types, so they double as runtime validation. Derive the input type with `Static<typeof xSchema>`.
- OpenAPI-style descriptions live on every schema field; `description` strings are user/model-facing.

## Names & conventions

- Error strings follow a **`[E_CODE]` prefix** convention for machine-classifiable failures (e.g. `[E_STALE_ANCHOR]`, `[E_BAD_REF]`, `[E_BAD_OP]`, `[E_DUPLICATE_EDIT]`, `[E_NOOP_LOOP]`). Tests and guidelines reference these codes.
- Tool output is plain text with **`LINE#HASH` anchors** for edit chaining (see `hashline/`); tools never emit anchors that are not from the latest read/grep/edit result.
- Vendored/adapted upstream code carries a header crediting the source (e.g. oh-my-pi, MIT) and the adaptation notes. Preserve these headers.

## Prompt handling

- Tool prose and guidelines are Markdown files in `src/harness/prompts/` — one `<tool>.md` (description) and one `<tool>-guidelines.md` (behavior rules per tool), plus `system.md`.
- Load them at module top-level via `loadPrompt(new URL("../../prompts/<tool>.md", import.meta.url))`, substituting `{{PLACEHOLDER}}` tokens at load time; don't read files on every tool call.

## File-system correctness

- Normalize to **LF** and handle the BOM explicitly (`normalizeToLF`, `stripBom`) before hashing/editing/writing.
- Writes go through `writeFileAtomically` and mutations through `withFileMutationQueue` so concurrent edits to the same path serialize without corruption.
- Text files may be read in chunks and classified via `loadFileKindAndText` (directory / image / text / binary).

## Tests

- Unit tests are colocated as `*.test.ts` next to the module, using `bun:test`.
- Guard against regressions in the file-mutation and edit engines with focused tests; the hashline engine in particular is heavily covered.