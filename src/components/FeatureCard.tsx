/**
 * A single feature card: icon, bold title and short description.
 * Used by both the home page highlights grid and the Features page.
 */
import type { Feature } from '../content/features';
import { FeatureIcon } from './FeatureIcon';

/** Props of the {@link FeatureCard} component. */
export interface FeatureCardProps {
  /** The feature (from `src/content/features.ts`) to display. */
  readonly feature: Feature;
}

/** Renders one feature as a white elevated card. */
export function FeatureCard({ feature }: FeatureCardProps): React.JSX.Element {
  return (
    <article className="feature-card" data-testid={`feature-${feature.id}`}>
      <span className="feature-card__icon">
        <FeatureIcon name={feature.icon} />
      </span>
      <h3 className="feature-card__title">{feature.title}</h3>
      <p className="feature-card__description">{feature.description}</p>
    </article>
  );
}
