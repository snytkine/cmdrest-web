# Test Chaining

Tests can capture values out of their own HTTP response and make them available to
later tests, and later tests can declare that they depend on earlier ones so the
right setup always runs first. Three pieces work together:

- **`saved-session`** — on a test, extracts values from that test's response into a
  suite-wide `session` namespace.
- **`depends-on`** — on a test, lists other tests that must run (and succeed) first.
- **`transient`** — on a test, marks it as setup-only: it never runs on its own, only
  as a dependency of another test.

## The `session` namespace

`session` is a fifth template namespace, alongside `cli`, `env`, `suite`, and `test`
(see [Templating](templating.md)). It starts **empty** at the beginning of a suite run
and is populated as tests execute and capture values via `saved-session`.

Like `test`, `session` is resolved **only during test execution** — when building a
test's request URL, headers, and body (including bodies loaded with `type: file`). It
is never available during the two suite-level template passes that resolve the
top-level `variables` block.

```yaml
url: "[[${suite.base_url}]]/records/[[${session.recordId}]]"
```

Because tests run in file order (subject to `depends-on` reordering, below), a test
can reference `[[${session.*}]]` values captured by **any test that already ran** —
you don't strictly need `depends-on` just to read a value that was captured earlier in
the file. `depends-on` is what you reach for when you need to *guarantee* a test runs
first (including reordering it ahead of where it's declared, or running a `transient`
setup test that has no other reason to execute).

## Capturing values with `saved-session`

```yaml
tests:
  - name: "CreateRecord"
    transient: true
    request:
      method: "POST"
      url: "[[${suite.base_url}]]/records"
      body:
        type: "inline"
        content: '{"label":"widget"}'
    saved-session:
      - name: "recordId"          # stored under session.recordId
        path: "response.body.json.$.id"
        type: "integer"           # optional: string | integer | double | boolean
        required: true            # fail the test if nothing is extracted (and no default)
      - name: "etag"
        path: "response.headers.etag"
    assertions:
      - type: "status_code"
        expected: 201
```

Each entry in `saved-session` is an object with:

| Field | Required | Type | Description |
|-------|----------|------|--------------|
| `name` | **Yes** | String | Key under which the value is stored in `session` (used later as `[[${session.<name>}]]`). Uniqueness across tests is the caller's responsibility — a later capture with the same `name` silently overwrites an earlier one (last-write-wins). |
| `path` | **Yes** | String | A `response.*` expression identifying what to extract. Same expression language used by assertion `path` values. |
| `type` | No | `string` \| `integer` \| `double` \| `boolean` | Coerces the extracted value to this type. Omit to store the value's natural string form. |
| `default` | No | String | Fallback value used when nothing is extracted at `path`. When set, the capture always succeeds. |
| `required` | No | Boolean (default `false`) | When `true` and nothing is extracted and no `default` is set, the test fails. |

### `path` syntax

`path` uses the same `response.*` grammar as assertion `path` values (see
[Assertions](assertions.md)):

- `response.statusCode` — HTTP status code
- `response.headers.<name>` — a response header (case-insensitive)
- `response.body.text` — the raw response body as a string
- `response.body.json.$.<jsonpath>` — a JSONPath query into the parsed JSON body

**Important:** unlike assertion paths into the JSON body (which accept a bare
`response.body.json.status`), a `saved-session` path into the JSON body must include
the JSONPath root, i.e. `response.body.json.$.status`. The portion after
`response.body.json.` is passed to the underlying JSONPath engine unmodified, and
JSONPath expressions require the leading `$`. Omitting it will fail to extract the
value.

### Primitive values only

A captured value must be a primitive — `string`, `integer`, `double`, or `boolean`.
Extracting a JSON object or array is an error and fails the test:

```
Extracted session parameter '<name>' in test '<test>' at path '<path>' is not a primitive type
```

You cannot store a JSON object or array in `session`; extract the specific scalar
field(s) you need instead.

### Type coercion

When `type` is set, the extracted value is converted before being stored. A value that
cannot be converted fails the test:

```
Session parameter '<name>' in test '<test>' at path '<path>' cannot be converted to <type>: value '<value>'
```

`integer` rejects fractional or non-numeric values; `double` parses any numeric string;
`boolean` accepts a boolean value or the strings `true`/`false`.

### `default` and `required`

- If the path extracts nothing and `default` is set, the `default` value is stored and
  the test is unaffected.
- If the path extracts nothing, no `default` is set, and `required` is `true`, the test
  fails with:

  ```
  Failed to extract session parameter '<name>' from response at path '<path>'
  ```

- If the path extracts nothing, no `default` is set, and `required` is `false`
  (the default), the capture is silently skipped — `session.<name>` is simply not set.

### Timing

Captures happen **only after all of a test's assertions pass.** If any assertion
fails, the test is recorded as failed and none of its `saved-session` values are
stored — a dependent test never runs against values captured from a failed parent (it
is instead marked failed via `depends-on` propagation, below).

Each successful capture is logged at `DEBUG` level.

## `depends-on`

```yaml
tests:
  - name: "GetRecord"
    depends-on: ["CreateRecord"]
    request:
      method: "GET"
      url: "[[${suite.base_url}]]/records/[[${session.recordId}]]"
    assertions:
      - type: "status_code"
        expected: 200
```

`depends-on` lists the names of other tests in the suite that must run before this
test. Dependencies run in the listed order and are resolved **transitively** — a chain
`A depends-on B`, `B depends-on C` runs `C`, then `B`, then `A`, regardless of where
each test is declared in the file.

### Validation

Before any test runs, the suite is checked for:

- **Unknown references** — `depends-on` naming a test that doesn't exist:

  ```
  Test '<name>' depends-on unknown test: '<ref>'
  ```

- **Circular dependencies** — a `depends-on` cycle:

  ```
  Circular depends-on dependency detected: a -> b -> a
  ```

A suite with either error fails validation and no tests run.

### Run-once-per-suite-run semantics

**A depended-on test runs at most once per suite run.** If several tests depend on the
same test, it executes a single time — its request is sent once — and its result,
including any `session` values it captured, is reused by every dependent:

```yaml
tests:
  - name: "CreateRecord"
    transient: true
    request:
      method: "POST"
      url: "[[${suite.base_url}]]/records"
    saved-session:
      - name: "recordId"
        path: "response.body.json.$.id"
        required: true
    assertions:
      - type: "status_code"
        expected: 201

  - name: "GetRecordAsAdmin"
    depends-on: ["CreateRecord"]
    request:
      method: "GET"
      url: "[[${suite.base_url}]]/records/[[${session.recordId}]]"
      auth: { type: "basic", username: "[[${env.ADMIN_USER}]]", password: "[[${env.ADMIN_PASSWORD}]]" }
    assertions:
      - type: "status_code"
        expected: 200

  - name: "GetRecordAsUser"
    depends-on: ["CreateRecord"]
    request:
      method: "GET"
      url: "[[${suite.base_url}]]/records/[[${session.recordId}]]"
    assertions:
      - type: "status_code"
        expected: 200
```

Here `CreateRecord` runs exactly once even though two tests depend on it; both
`GetRecordAsAdmin` and `GetRecordAsUser` reuse the same `session.recordId`. This is
deliberate: `depends-on` exists to guarantee ordering and share captured state, not to
repeat a setup action per dependent. If you need a fresh record created for each
dependent, call the creation logic from each test individually rather than sharing one
`depends-on` target.

Each execution that ran only to satisfy a `depends-on` reference is reported as its own
result row, labeled `"<name> (dependency of <first dependent that reached it>)"` — the
label is fixed the first time the test is reached, even if other tests also depend on
it later.

### Failure propagation

If a dependency ends up failed or errored, every test that depends on it (directly or
transitively) is automatically marked failed **without sending its own request or
evaluating its own assertions**:

- The terminal UI shows a single `Error` row: `This test depends on a failed parent
  test "<name>".`
- The HTML report shows a **Failed parent test** block with the same message, instead
  of Request/Response/Failed Assertions sections.

## `transient`

```yaml
tests:
  - name: "CreateRecord"
    transient: true
    # ...
```

A `transient: true` test runs **only** when another test names it in `depends-on` —
never as a standalone test. This is the usual way to write a pure setup step (like
`CreateRecord` above) that exists solely to feed values into other tests.

Transient tests also **do not fire `before-each` / `after-each`
[hooks](lifecycle-hooks.md)** — those hooks fire for the dependent (non-transient) test
that triggered the transient test's execution.

## Summary

| Field | On | Type | Purpose |
|-------|----|------|---------|
| `saved-session` | Test case | List of capture objects | Extract values from this test's response into `session.*` |
| `depends-on` | Test case | List of test names | Run named tests first (transitively); reuse their result & captures |
| `transient` | Test case | Boolean (default `false`) | Test only runs as a dependency, never standalone; skips before/after-each hooks |

See also: [Templating](templating.md) for the full set of variable namespaces, and
[Test Suite Configuration](test-suite-configuration.md) for the full test case field
reference.
