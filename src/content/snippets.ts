/**
 * Code snippets displayed on the site.
 *
 * Kept as plain exported strings so the examples can be updated without
 * touching any component markup.
 */

/** Example YAML test suite shown on the home page hero/demo section. */
export const yamlExample = `# users-api.test.yaml — a complete CmdRest test suite
name: Users API smoke tests
baseUrl: \${API_BASE_URL}   # resolved from an external .env file

tests:
  - name: Create a user
    tags: [smoke, users]
    request:
      method: POST
      path: /users
      body: '@payloads/new-user.json'   # external payload file
    assertions:
      - status: 201
      - header: { name: content-type, contains: application/json }
      - jsonPath: { path: $.id, isNumber: true }

  - name: Fetch the user back
    request:
      method: GET
      path: /users/\${lastResponse.id}
    assertions:
      - status: 200
      - jsonSchema: '@schemas/user.schema.json'
      - responseTime: { lessThanMs: 500 }`;

/** Shell commands demonstrating how CmdRest is executed. */
export const cliExample = `# Run the whole suite with the interactive terminal UI
$ cmdrest run users-api.test.yaml

# Run only tests tagged "smoke" — perfect for CI/CD
$ cmdrest run users-api.test.yaml --tag smoke --no-interactive

# Generate a self-contained HTML report
$ cmdrest run users-api.test.yaml --report html --out report.html`;
