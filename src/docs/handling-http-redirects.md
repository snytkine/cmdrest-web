# Handling HTTP Redirects

By default every HTTP client follows redirect (3xx) responses automatically. A request to a
URL that responds with `301 Moved Permanently` transparently continues to the URL in the
`Location` header, and the test sees only the final response from the redirect target.

That is usually what you want. Sometimes it is exactly what you do not want: when the
redirect *is* the behaviour under test. To assert that an endpoint returns the right 3xx
status code and the right `Location` header, the client must stop at the redirect instead of
following it.

Set `follow-redirects: false` on the rest-client to do that.

```yaml
rest-client:
  base-url: "https://api.example.com"
  follow-redirects: false

tests:
  - name: "legacy path redirects permanently"
    request:
      method: "GET"
      url: "/old-path"
    assertions:
      - type: "status_code"
        expected: 301
      - type: "has_header"
        name: "location"
      - type: "string_contains"
        path: "response.headers.location"
        expected: "/new-path"
```

With `follow-redirects: false` the 301 becomes the final response for the test: its status
code, headers and body are all available to assertions exactly like any other response.

## Properties

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `follow-redirects` | Boolean | `true` | When `false`, 3xx responses are returned to the test instead of being followed. |

The field is optional. Omitting it is identical to setting `follow-redirects: true`, so
existing test suites are unaffected.

## This option is only available on the rest-client

`follow-redirects` is a property of the **rest-client**, not of an individual test. It
configures the underlying HTTP client, and that client is constructed once for the whole
suite — there is no way to change its redirect policy for a single request.

You cannot write this:

```yaml
# ✗ Not supported — follow-redirects is not a test-level or request-level option
tests:
  - name: "some test"
    request:
      method: "GET"
      url: "/old-path"
      follow-redirects: false
```

## Mixing both behaviours in one suite

If some tests need redirects followed while others need to inspect the redirect itself,
declare **two rest-clients**. Give the second one the same configuration as the first, with
`follow-redirects: false` added, then point the tests that need it at the second client
using the request's `rest-client` property.

```yaml
rest-clients:
  - id: "default"
    base-url: "https://api.example.com"
    headers:
      Accept: "application/json"

  - id: "no-redirect"
    base-url: "https://api.example.com"
    headers:
      Accept: "application/json"
    follow-redirects: false

tests:
  - name: "follows the redirect to the new endpoint"
    request:
      method: "GET"
      url: "/old-path"
    assertions:
      - type: "status_code"
        expected: 200

  - name: "verifies the redirect status and target"
    request:
      method: "GET"
      url: "/old-path"
      rest-client: "no-redirect"
    assertions:
      - type: "status_code"
        expected: 301
      - type: "string_contains"
        path: "response.headers.location"
        expected: "/new-path"
```

Tests that do not name a `rest-client` use the client with id `default`, so only the tests
that explicitly select `no-redirect` stop at redirects.

Note that when you use the plural `rest-clients` form, every entry needs an `id` once more
than one client is configured. The two clients are independent: any shared settings such as
`base-url`, `headers`, `auth` or `ssl` must be repeated in both.

## Which status codes count as redirects

`follow-redirects: false` applies to every 3xx response the server returns — `301`, `302`,
`303`, `307` and `308` alike. Each is delivered to the test as-is.

When redirects *are* followed (the default), the client follows them for both HTTP and
HTTPS targets, but it will not downgrade a redirect from HTTPS to plain HTTP. A redirect
from an `https://` URL to an `http://` URL is not followed, and the 3xx response is returned
to the test instead.

## See also

- [Test Suite Configuration](/docs/test-suite-configuration) — the full rest-client reference
- [Assertions](/docs/assertions) — `status_code`, `has_header` and `string_contains`
