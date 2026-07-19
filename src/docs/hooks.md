# Lifecycle Hooks

Lifecycle hooks let a test suite run extra work at defined points during execution:
either a local **script** (an executable launched on your machine) or a **web** call (an
outbound HTTP request). Typical uses are seeding a database before a run, notifying a
chat channel when a test fails, or uploading the HTML report when the run finishes.

> ⚠️ **Script hooks execute arbitrary code.** Treat a suite file like code, not data.
> Script hooks never run unless you explicitly opt in — see [Security model](#security-model).

## YAML shape

Hooks are declared under a top-level `hooks` block. Each of the seven lifecycle phases
holds an ordered list of hooks:

```yaml
hooks:
  before-all:
    - type: script
      id: seed-db                       # optional; defaults to "<phase>-<index>"
      path: ./scripts/seed-db.sh        # required; relative paths resolve against the suite dir
      timeout-seconds: 30               # optional; default 10
      async: false                      # optional; default false
      parameters:                       # optional user-defined args (Thymeleaf-resolved)
        auth_token: "[[${env.AUTH_TOKEN}]]"
  after-each:
    - type: web
      id: notify-test-done
      rest-client: hooks-client         # optional; defaults to "default"
      url: /api-tester/test-completed   # required; relative to the client's base-url
      method: POST                      # optional; POST (default) or PUT only
      async: true
      payload:                          # optional extra JSON fields (Thymeleaf-resolved)
        team: "backend"
  after-report:
    - type: web
      rest-client: hooks-client
      url: /api-tester/report
      attach-report: true               # after-report web hooks only; default false
```

## Lifecycle phases

Hooks run in this order relative to the test run:

| Phase (YAML key) | Fires |
|---|---|
| `suite-validation-failed` | Once, when pre-execution validation fails; nothing else runs afterward |
| `before-all` | Once, before the first test case |
| `before-each` | Before each test case's HTTP request |
| `after-each` | After each test case's assertions complete |
| `after-all` | Once, after the last test case completes |
| `before-report` | Once, before the HTML report is written (only with `--report`) |
| `after-report` | Once, after the HTML report has been written (only with `--report`) |

## Common hook fields

| Field | Required | Default | Notes |
|---|---|---|---|
| `type` | **Yes** | — | `script` or `web` |
| `id` | No | `<phase>-<index>` | Must be unique across the whole suite when given; used in logs and messages |
| `async` | No | `false` | Async hooks run on a separate thread; failures never fail the suite; the next hook does not wait for them |
| `timeout-seconds` | No | `10` | Applies to both hook types. A timed-out script is force-killed; a timed-out web call is abandoned. A timeout is treated as a failure |

### `script` hook fields

| Field | Required | Notes |
|---|---|---|
| `path` | **Yes** | Absolute, or relative to the suite YAML's directory. Supports `[[${...}]]` templates |
| `parameters` | No | Map of `key=value` arguments appended **after** the system arguments, in declaration order. Values support templates. Keys may not collide with system argument names |

### `web` hook fields

| Field | Required | Notes |
|---|---|---|
| `rest-client` | No | Id of a client from `rest-clients` (or the singular `rest-client`); defaults to `default` |
| `url` | **Yes** | Absolute, or relative to the client's `base-url`. Supports templates |
| `method` | No | `POST` (default) or `PUT`; anything else is a validation error |
| `payload` | No | Map of extra fields merged into the JSON body. Values support templates. Keys may not collide with system payload fields |
| `attach-report` | No | `after-report` hooks only. When `true`, the request is `multipart/form-data` with a `payload` JSON part and a `report` HTML-file part. Default `false` (plain JSON body) |

## Data passed to hooks

Script hooks receive arguments as individual `key=value` process arguments. Web hooks
receive the same data as a flat JSON object (plus any user `payload` fields).

| Key | When | Value |
|---|---|---|
| `suite_name` | always | The suite's `name` |
| `run_id` | always | The unique run id generated for this execution |
| `hook_id` | always | The hook's id (explicit or defaulted) |
| `phase` | always | The lifecycle phase, e.g. `before-each` |
| `interactive` | always | `true` / `false` |
| `timeout_seconds` | always | The hook's effective timeout |
| `report_dir` | with `--report` | The `--report` directory value |
| `report_path` | `after-all`, `before-report`, `after-report` (with `--report`) | Full path of the report file |
| `test_name` | `before-each`/`after-each`: current test name; other phases: the `--test` value when set | |
| `tag` | with `--tag` | The `--tag` value |
| `env_file` | when a resolved `.env` file exists | The resolved `.env` path |
| `url` | `before-each`/`after-each` | Full URL of the test's request |
| `method` | `before-each`/`after-each` | HTTP method of the test's request |
| `test_status` | `after-each` | `passed` / `failed` / `error` |
| `headers` | web hooks, `before-each`/`after-each` | JSON object of the request headers, **with sensitive values masked** |
| `body` | web hooks, `before-each`/`after-each` (when present) | The request body as sent |

`after-all` hooks additionally receive the run summary: `tests_total`, `tests_passed`,
`tests_failed`, `tests_errors`, and `duration_ms`.

### Secret masking (web hooks)

For web hooks, header values named `Authorization`, `Proxy-Authorization`, `Cookie`, or
matching `*api-key*` / `*token*` (case-insensitive) are replaced with `****` before being
placed in the payload. Script hooks never receive request headers at all.

## Execution and failure policy

- Hooks in a phase run **in list order**. A synchronous hook must finish successfully
  before the next hook starts; if one fails, the **remaining hooks in that phase are
  skipped**. An async hook is fired and the next hook proceeds immediately.
- **Web hook success** requires an HTTP `200` or `201` response. Any other status, a
  network error, or a timeout is a failure.
- **Script hook success** requires exit code `0`. A non-zero exit or a timeout is a
  failure. A blocking script's stderr is captured and, on failure, printed as
  `Error executing hook <hook_id>: <message>`.

What a failure does depends on the phase:

| Phase | Blocking-hook failure |
|---|---|
| `before-all` | **Fatal** — no test cases run; the CLI exits with code **3** in non-interactive mode |
| `before-each` | The test's request is **not sent**; the test is recorded as an **error**; remaining tests still run |
| `after-each`, `after-all`, `before-report`, `after-report`, `suite-validation-failed` | **Warning only** — does not change the result, exit code, or report |

Async hook failures are never fatal in any phase. The CLI waits for outstanding async
hooks to finish (bounded by each hook's timeout) before it exits.

## Templating

The `path` and `parameters` values (scripts) and the `url` and `payload` values (web
hooks) go through the same two-pass template processing as the rest of the suite. The
`cli.*`, `env.*`, and `suite.*` namespaces are available in every hook; `test.*` is also
available in `before-each` / `after-each` hooks. See [Templating](templating.md).

A common pattern is passing a secret from `.env` to a script without ever writing it into
the YAML:

```yaml
hooks:
  before-all:
    - type: script
      path: ./scripts/seed-db.sh
      parameters:
        token: "[[${env.AUTH_TOKEN}]]"
```

## Security model

Script hooks run arbitrary commands as the invoking user, so they are protected by a
mandatory opt-in gate and several hardening rules:

1. **Opt-in gate.** Script hooks run only when you pass `--allow-scripts` to `run-suite`
   **or** set `APITESTER_ALLOW_SCRIPTS=true` (case-insensitive) in the OS environment or
   the suite's `.env`. If a suite declares script hooks and neither is set, the run aborts
   before any hook or test executes. Web hooks are not gated (they cannot execute local
   code).
2. **No shell.** Scripts are launched with an argument list — never through `sh -c` or
   `cmd /c` — so shell metacharacters in template values are inert.
3. **`.bat` / `.cmd` rejected** on all platforms (Windows argument-injection risk).
4. **NUL rejected** in a resolved script path or parameter value.
5. **Output hygiene.** Script stdout/stderr are read via pipes and control characters are
   stripped, so a script cannot rewrite your terminal or corrupt the results grid. The
   child's stdin is closed at launch.
6. **Secrets are never logged.** Resolved parameters and payloads never appear in logs or
   progress events.

### Script author responsibilities

- **Process arguments are visible to other local users** (via `ps` / `/proc`) for the
  lifetime of the script. If a value is sensitive, prefer having your script read it from
  its inherited environment (script hooks inherit the process environment plus the merged
  `.env`) rather than passing it via `parameters`.
- Treat your script's arguments as **untrusted data**: always quote expansions (`"$1"`,
  not `$1`) and never `eval` an argument.

## See also

- [CLI Reference](cli-reference.md) — the `--allow-scripts` flag and exit codes
- [Environment Variables](environment-variables.md) — `APITESTER_ALLOW_SCRIPTS`
- [Test Suite Configuration](test-suite-configuration.md) — the full suite structure
