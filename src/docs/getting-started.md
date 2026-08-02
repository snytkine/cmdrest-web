# Getting Started

There are two ways to start using cmd-rest: download a pre-built binary and run it right away, or build it yourself from source. Both produce the same CLI — pick whichever fits your workflow.

## Option 1: Download the binary

Grab the latest release for your operating system from the [Download page](/download) (or directly from the [GitHub releases page](https://github.com/snytkine/cmd-rest/releases)).

If you're downloading for macOS, make sure to pick the build that matches your Mac's chip:

- **Apple Silicon** (M1/M2/M3/M4 — the default on newer Macs): `cmd-rest-macos-aarch64`
- **Intel** (older Macs): `cmd-rest-macos-intelx86`

<div class="notice">

Important — macOS users

The macOS binaries are not signed with an Apple developer certificate, so macOS will refuse to run them right after download ("cannot be opened because the developer cannot be verified"). Clear the quarantine flag first:

```bash
# Intel Mac
xattr -d com.apple.quarantine ~/Downloads/cmd-rest-macos-intelx86

# Apple Silicon Mac (default on newer Macs)
xattr -d com.apple.quarantine ~/Downloads/cmd-rest-macos-aarch64
```

Then move the binary into `/usr/local/bin`, rename it to `cmd-rest`, and make it executable. This step needs `sudo` because `/usr/local/bin` is owned by root:

```bash
# Replace the filename below with the one you downloaded
sudo mv ~/Downloads/cmd-rest-macos-aarch64 /usr/local/bin/cmd-rest
sudo chmod +x /usr/local/bin/cmd-rest
```

Once moved, the `cmd-rest` command is available from any directory in the macOS terminal.

</div>

## Option 2: Build from source

The instructions below are for building cmd-rest from source.

## Prerequisites

- **GraalVM Java 25** — the project requires Java 25. Install it using [sdkman](https://sdkman.io/):
  ```bash
  sdk install java 25-graalce
  sdk use java 25-graalce
  ```
- **Maven Wrapper** — included in the repository; no separate Maven installation required

## Installation

Clone the repository and build:

```bash
git clone https://github.com/snytkine/cmd-rest.git
cd cmd-rest

# JVM build (recommended for development — fast, instant startup after build)
./mvnw clean package

# GraalVM native binary (optional — start instantly, no JVM overhead)
./mvnw -Pnative native:compile
```

The JVM build produces a JAR in `target/` that runs with `java -jar`. The native build produces a standalone executable in `target/`.

Verify the build by printing the version:

```bash
# JVM jar
java -jar target/api-tester-cli-0.0.1-SNAPSHOT.jar version

# Native binary
./target/api-tester-cli version
```

```
CmdRest version 0.2.1
```

See the [CLI Reference](cli-reference.md) for the full list of commands.

## Running your first test suite

The simplest workflow is to name your file `test-suite.yml` and run the CLI from the same directory — no arguments needed:

```yaml
# test-suite.yml
name: "My First Test Suite"
rest-client:
  # Every suite must declare a client; base-url is optional when URLs are absolute
  connect-timeout: 30000
tests:
- name: "Verify API is responding"
  request:
    method: "GET"
    url: "https://httpbin.org/status/200"
  assertions:
  - type: "status_code"
    expected: 200
```

```bash
# Run from the directory that contains test-suite.yml — no --suite flag needed
java -jar target/api-tester-cli-0.0.1-SNAPSHOT.jar run-suite

# Or use the alias
rs
```

To point to a suite file in another location use `--suite`:

```bash
rs --suite=/path/to/example.yml
```

If `--suite` is omitted and no `test-suite.yml` exists in the current directory, the CLI shows an error and exits cleanly.

You'll see the interactive terminal UI with real-time progress. Tests are shown with pass/fail indicators.

## Output modes

The tool automatically detects your environment and chooses an output mode:

### Interactive UI (default on TTY)

When running in a terminal, the tool displays an interactive grid showing test progress in real time, with color-coded results (✓ for passed, ✗ for failed).

Disable with `--no-ui` to force JSON output:

```bash
rs --suite=example.yml --no-ui
```

### JSON output (CI-friendly)

The JSON output is suitable for parsing in CI/CD pipelines and includes detailed assertion failure information. Force it with `--no-ui` or run on a non-TTY:

```bash
rs --suite=example.yml --no-ui > results.json
```

### Force UI on non-TTY

To enable the interactive UI even when stdout doesn't look like a terminal:

```bash
rs --suite=example.yml --ui
```

---

**Next steps:**

- Explore [CLI Reference](cli-reference.md) to learn all available options
- Check [Test Suite Configuration](test-suite-configuration.md) to understand YAML structure
- Learn [Templating](templating.md) to inject dynamic values into your tests
- Explore [Assertions](assertions.md) to see all 25+ assertion types available
- Set up [Schema Support](schema-support.md) for IDE validation and autocompletion while writing test suites
