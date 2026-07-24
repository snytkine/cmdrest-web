# Custom SSL Certificates

By default the CLI validates HTTPS server certificates against the JVM's built-in trust
anchors, exactly like a browser. Many test environments don't fit that model: a staging
server with a self-signed certificate, an internal service whose certificate is issued by
a private certificate authority (CA), or an endpoint that requires the *client* to present
a certificate (mutual TLS / mTLS).

Each HTTP client can declare an optional `ssl` block to handle these cases. It lives
directly under a `rest-client` (singular) or under any entry of a `rest-clients` (plural)
list, so different clients in the same suite can use different TLS settings.

```yaml
rest-client:
  base-url: "https://api.example.com"
  ssl:
    skip-certificate-validation: false
    truststore:
      certificate: "certs/ca.pem"
    keystore:
      certificate: "certs/client.pem"
      private-key: "certs/client.key"
      password: "[[${env.KEYSTORE_PASSWORD}]]"
```

## Properties

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `skip-certificate-validation` | Boolean | `false` | When `true`, disable certificate **and** hostname verification. `truststore` and `keystore` are ignored. |
| `truststore.certificate` | String | (none) | Path to a PEM certificate to trust (self-signed server cert or private CA), in addition to the JVM defaults. |
| `keystore.certificate` | String | (none) | Path to the PEM client certificate presented during the TLS handshake (mTLS). |
| `keystore.private-key` | String | (none) | Path to the client's **PKCS#8** private key. Required for the client to authenticate. |
| `keystore.password` | String | (none) | Passphrase decrypting an encrypted private key. Only allowed when `private-key` is set. |

### File path resolution

Every file path in the `ssl` block may be **absolute** or **relative to the directory
that contains the test-suite file**. This is the same rule used for file-based request
bodies and schema references, so a suite plus its `certs/` folder can be committed and run
from anywhere.

### Private key format

Private keys must be in **PKCS#8** PEM form:

- `-----BEGIN PRIVATE KEY-----` — unencrypted.
- `-----BEGIN ENCRYPTED PRIVATE KEY-----` — encrypted; supply `keystore.password`.

The legacy PKCS#1 form (`-----BEGIN RSA PRIVATE KEY-----` /
`-----BEGIN EC PRIVATE KEY-----`) is **not** supported. Convert it once with OpenSSL:

```bash
openssl pkcs8 -topk8 -in client-pkcs1.key -out client.key           # keeps encryption
openssl pkcs8 -topk8 -nocrypt -in client-pkcs1.key -out client.key   # removes encryption
```

## Scenario 1: skip certificate validation (self-signed server)

The quickest way to hit a server whose certificate isn't trusted (self-signed, expired, or
wrong hostname). This turns **off** all certificate and hostname checks, so use it only
against trusted, non-production endpoints.

```yaml
rest-client:
  base-url: "https://staging.internal:8443"
  ssl:
    skip-certificate-validation: true
```

## Scenario 2: trust a private CA (custom truststore)

Keep validation on, but add your organization's CA (or the server's self-signed
certificate) to the set of trusted certificates. Safer than skipping validation because
the hostname and certificate chain are still verified.

```yaml
rest-client:
  base-url: "https://api.internal.example.com"
  ssl:
    truststore:
      certificate: "certs/internal-ca.pem"
```

## Scenario 3: mutual TLS (client certificate)

When the server requires the client to prove its identity with a certificate, supply a
`keystore` with the client certificate and its private key. Combine it with a `truststore`
if the server's own certificate also needs a custom trust anchor.

```yaml
rest-client:
  base-url: "https://mtls.example.com"
  ssl:
    truststore:
      certificate: "certs/server-ca.pem"
    keystore:
      certificate: "certs/client.pem"
      private-key: "certs/client.key"
      password: "[[${env.KEYSTORE_PASSWORD}]]"
```

## Scenario 4: two clients — one custom TLS, one mTLS with a secret password

A single suite can use several clients with different TLS setups. Here the `catalog`
client trusts a private CA, while the `payments` client performs mTLS. The keystore
password is **not** written in the file — it is read from an environment variable through a
template placeholder, so the suite is safe to commit to git or share with teammates.

```yaml
name: "Multi-client TLS suite"
rest-clients:
  - id: catalog
    base-url: "https://catalog.internal.example.com"
    ssl:
      truststore:
        certificate: "certs/internal-ca.pem"

  - id: payments
    base-url: "https://payments.example.com"
    ssl:
      truststore:
        certificate: "certs/payments-ca.pem"
      keystore:
        certificate: "certs/payments-client.pem"
        private-key: "certs/payments-client.key"
        password: "[[${env.KEYSTORE_PASSWORD}]]"

tests:
  - name: "List products"
    request:
      rest-client: catalog
      method: "GET"
      url: "/products"
    assertions:
      - type: "status_code"
        expected: 200

  - name: "Create payment"
    request:
      rest-client: payments
      method: "POST"
      url: "/payments"
    assertions:
      - type: "status_code"
        expected: 201
```

Provide the password at run time via a `.env` file next to the suite:

```dotenv
KEYSTORE_PASSWORD=super-secret-passphrase
```

or as a real environment variable:

```bash
export KEYSTORE_PASSWORD='super-secret-passphrase'
```

**Best practice:** never put certificate passwords directly in the suite file. Keep them
in environment variables (or a `.env` file that is git-ignored) and reference them with
`[[${env.KEYSTORE_PASSWORD}]]`. That way the configuration file itself contains no secrets
and can be committed or shared freely.

## Validation

Custom SSL configuration is checked **before any test runs**, so mistakes fail fast with a
clear message rather than a mid-run TLS error. The run is rejected when:

- a `truststore.certificate`, `keystore.certificate`, or `keystore.private-key` file does
  not exist or is not readable;
- `keystore.password` is set but no `keystore.private-key` is configured;
- a certificate or key file cannot be parsed, the private key is in the unsupported PKCS#1
  format, or the `keystore.password` is incorrect.

When `skip-certificate-validation` is `true`, the `truststore` and `keystore` blocks are
ignored and not validated.
