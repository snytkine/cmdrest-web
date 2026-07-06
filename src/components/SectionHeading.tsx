/**
 * Centered section heading block: small green "eyebrow" label, a large
 * bold title, and an optional one-paragraph lede underneath.
 */

/** Props of the {@link SectionHeading} component. */
export interface SectionHeadingProps {
  /** Small uppercase label above the title (e.g. "Features"). */
  readonly eyebrow: string;
  /** The section title. */
  readonly title: string;
  /** Optional supporting sentence under the title. */
  readonly lede?: string;
}

/** Renders a consistent heading block used at the top of page sections. */
export function SectionHeading({ eyebrow, title, lede }: SectionHeadingProps): React.JSX.Element {
  return (
    <div className="section-heading">
      <span className="section-heading__eyebrow">{eyebrow}</span>
      <h2 className="section-heading__title">{title}</h2>
      {lede !== undefined && <p className="section-heading__lede">{lede}</p>}
    </div>
  );
}
