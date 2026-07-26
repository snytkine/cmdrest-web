# Requests Through a Proxy

CmdRest can route the requests it makes through an HTTP proxy. This is entirely **optional** and
only needed if the machine running your tests sits behind one — typically a corporate egress proxy
that all outbound traffic must pass through. With nothing configured, requests connect directly and
nothing about this page applies to you.

There are two ways to set it up: declare a `proxy` block on a rest-client, or set the standard
`HTTP_PROXY` / `HTTPS_PROXY` environment variables. You can mix both, and individual rest-clients
can opt out entirely.

## Configuring a proxy on a rest-client

```yaml
rest-client:
  base-url: "https://api.example.com"
  proxy:
    url: "http://proxy.mycompany.com:8080"
    username: "[[${env.PROXY_USER}]]"
    password: "[[${env.PROXY_PASSWORD}]]"
```

| Property | Required | Description |
|---|---|---|
| `url` | yes | Proxy URL as `http://host[:port]`. The port defaults to `80`. |
| `username` | no | Username for proxies that require authentication. |
| `password` | no | Password. Only allowed when `username` is also set. |

## Never put credentials in your test suite

Proxy credentials are real credentials. A test-suite file is usually committed to source control,
shared with teammates, and attached to CI logs — none of which are places a password belongs.

**Always** keep the username and password in environment variables (or a
[`.env` file](/docs/environment-variables)) and reference them with template placeholders:

```yaml
proxy:
  url: "http://proxy.mycompany.com:8080"
  username: "[[${env.PROXY_USER}]]"
  password: "[[${env.PROXY_PASSWORD}]]"
```

```bash
# .env — keep this file out of git
PROXY_USER=jsmith
PROXY_PASSWORD=s3cr3t
```

The same applies to the `url` if your proxy host differs per environment — templating it with
`[[${env.PROXY_URL}]]` works exactly the same way. See
[Templating](/docs/templating) for the full placeholder syntax.

CmdRest never writes proxy credentials to its logs. Log lines about proxying name the host and port
and whether authentication is enabled, and nothing more.

## Using HTTP_PROXY and HTTPS_PROXY

The conventional `HTTP_PROXY` and `HTTPS_PROXY` environment variables are honoured **automatically**
for any rest-client that does not declare a `proxy` key. No opt-in flag is needed.

```bash
export HTTP_PROXY=http://proxy.mycompany.com:8080
export HTTPS_PROXY=http://proxy.mycompany.com:8080
```

- `HTTP_PROXY` applies to `http://` targets, `HTTPS_PROXY` to `https://` targets. They may name
  different proxies, and either may be set without the other.
- Credentials may be embedded in the URL: `http://user:pass@proxy.mycompany.com:8080`.
- The lowercase spellings `http_proxy` / `https_proxy` also work. If both cases are set, the
  uppercase one wins.
- These may come from the process environment or from a [`.env` file](/docs/environment-variables).

Note that `HTTPS_PROXY` selects the proxy used for *https targets* — the proxy URL itself is still
`http://`. See [Why there is no proxy TLS setting](#why-there-is-no-proxy-tls-setting).

## Precedence

`PROXY_USE_ENV` decides who wins when a rest-client declares a `proxy` **object** and the
environment also supplies one. It is not needed to make the environment variables work in the first
place.

| YAML `proxy` | `PROXY_USE_ENV` | `HTTP_PROXY` / `HTTPS_PROXY` | Result |
|---|---|---|---|
| absent | any | set | **Environment proxy is used** |
| absent | any | unset | No proxy |
| `false` | any | any | **No proxy — absolute opt-out** |
| object | not `true` | set | The YAML object (environment ignored) |
| object | not `true` | unset | The YAML object |
| object | `true` | set | **Environment proxy; YAML block discarded entirely** |
| object | `true` | unset | The YAML object (nothing to override with) |

When `PROXY_USE_ENV=true` hands precedence to the environment, the YAML `proxy` block is discarded
**in its entirety, including its username and password**. Credentials then come solely from the
environment URL's userinfo. The two sources are never mixed, so one proxy's password can never be
sent to another.

## Turning the proxy off for one client: `proxy: false`

A suite often needs both: external APIs reachable only through the corporate proxy, and internal
services that must be reached directly. Set `proxy: false` on the clients that should bypass it.

```yaml
rest-clients:
  - id: "external"
    base-url: "https://api.partner.com"     # inherits HTTP_PROXY / HTTPS_PROXY
  - id: "internal"
    base-url: "https://svc.internal.local"
    proxy: false                            # always connects directly

tests:
  - name: "partner API responds"
    request:
      method: "GET"
      url: "/v1/status"
      rest-client: "external"
    assertions:
      - type: "status_code"
        expected: 200

  - name: "internal service responds"
    request:
      method: "GET"
      url: "/health"
      rest-client: "internal"
    assertions:
      - type: "status_code"
        expected: 200
```

`proxy: false` is **absolute**. Neither `HTTP_PROXY`, `HTTPS_PROXY` nor `PROXY_USE_ENV` can override
it. A malformed environment proxy will not fail such a client either, since it never consults the
environment — which makes `proxy: false` a reliable escape hatch even when the environment is
misconfigured.

`proxy: true` is **not** valid. It would do nothing whenever no environment proxy happened to be
set, which is the opposite of what it looks like it does, so it is rejected with an explanatory
error. To route a client through a proxy, give it a `url` — or set the environment variables.

## Why there is no proxy TLS setting

There is deliberately no `skip-certificate-validation` (or any other TLS option) on the `proxy`
block, because there is no proxy TLS to configure.

CmdRest's HTTP client connects to a proxy **in plaintext** and then asks it to open a tunnel with
the HTTP `CONNECT` method. Your endpoint's TLS runs end-to-end *inside* that tunnel, between CmdRest
and the API — the proxy only relays encrypted bytes and cannot read them. There is no certificate
presented by the proxy and therefore nothing to validate or skip.

Two consequences worth being clear about:

- **A `https://` proxy URL is rejected** at validation, with a message explaining this. Use
  `http://your-proxy:port` — this does not weaken security for your API traffic.
- **Endpoint certificate validation is completely unaffected by proxying.** If your API uses a
  self-signed or private-CA certificate, configure that in the rest-client's separate `ssl` block
  exactly as you would without a proxy. See
  [Custom SSL Certificates](/docs/custom-ssl-certificates).

## Supported authentication

Only **Basic** proxy authentication is supported. This covers proxies that require no authentication
at all (IP allowlisting or transparent interception — just give a `url`) and those that ask for a
username and password.

**NTLM and Negotiate/Kerberos proxies are not supported.** The underlying JDK HTTP client implements
no scheme other than Basic. If your proxy demands one of those, CmdRest fails the test with a message
naming the scheme rather than leaving you guessing why correct credentials were never accepted.

## Diagnosing proxy problems

When something goes wrong with a proxy, the naive symptom is a connection error against the API —
even though the API is healthy and was never contacted. CmdRest detects the common proxy failures
and reports them as such, naming the proxy's host and port, in both the terminal UI and the
[HTML report](/docs/html-report):

| Situation | What you'll see |
|---|---|
| Proxy host unreachable or wrong port | `could not connect to the proxy at host:port … The endpoint itself was never contacted` |
| Proxy requires auth, none configured | `the proxy at host:port requires authentication but no proxy credentials are configured` |
| Wrong proxy credentials | `the proxy at host:port rejected the configured proxy credentials` |
| Proxy wants NTLM/Negotiate | `requires 'NTLM' authentication, which is not supported` |
| Proxy refuses the destination | `the proxy at host:port refused to open a tunnel to the requested host` |

Proxy activity is also written to the log when [debug logging](/docs/cli-reference) is enabled,
including which proxy each rest-client resolved to and where that setting came from. Credentials are
always masked.

## Proxy and endpoint credentials together

A proxy password and an API password are entirely separate and never cross. The proxy is
authenticated with `Proxy-Authorization` on the tunnel; the API is authenticated with the
rest-client's own `auth` block on the request inside it.

```yaml
rest-client:
  base-url: "https://api.example.com"
  auth:
    type: "basic"
    username: "[[${env.API_USER}]]"
    password: "[[${env.API_PASSWORD}]]"
  proxy:
    url: "http://proxy.mycompany.com:8080"
    username: "[[${env.PROXY_USER}]]"
    password: "[[${env.PROXY_PASSWORD}]]"
```

The proxy sees only the proxy credentials, and the API sees only the API credentials.
