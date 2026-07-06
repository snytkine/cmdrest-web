/**
 * Terminal-styled code block with the classic three window dots and an
 * optional filename/title in the title bar. Used to display YAML suite
 * examples and CLI commands.
 */

/** Props of the {@link CodeBlock} component. */
export interface CodeBlockProps {
  /** The code to display, preserving whitespace. */
  readonly code: string;
  /** Optional filename or label shown in the window title bar. */
  readonly title?: string;
}

/** Renders code inside a dark terminal-window chrome. */
export function CodeBlock({ code, title }: CodeBlockProps): React.JSX.Element {
  return (
    <div className="code-block">
      <div className="code-block__bar" aria-hidden="true">
        <span className="code-block__dot code-block__dot--red" />
        <span className="code-block__dot code-block__dot--yellow" />
        <span className="code-block__dot code-block__dot--green" />
        {/* The title is decorative context (e.g. a filename). */}
        {title !== undefined && <span className="code-block__title">{title}</span>}
      </div>
      <pre className="code-block__body">
        <code>{code}</code>
      </pre>
    </div>
  );
}
