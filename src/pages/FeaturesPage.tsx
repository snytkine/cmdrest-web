/**
 * Features page: the complete feature catalogue grouped by category.
 * All content comes from `src/content/features.ts`; adding a feature
 * there automatically adds it to this page.
 */
import { groupFeaturesByCategory } from '../content/features';
import { FeatureCard } from '../components/FeatureCard';

/** The full features listing page. */
export function FeaturesPage(): React.JSX.Element {
  // Map of category name -> features, in declaration order.
  const grouped = groupFeaturesByCategory();

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1 className="page-hero__title">Every feature, built for speed</h1>
          <p className="page-hero__lede">
            From zero-code YAML suites to CI/CD-ready execution and vibrant HTML reports — here is
            everything CmdRest can do.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {/* One section per category, preserving content declaration order. */}
          {[...grouped.entries()].map(([category, categoryFeatures]) => (
            <div className="feature-category" key={category}>
              <h2 className="feature-category__title">
                {category}
                {/* Badge with the number of features in this category. */}
                <span className="feature-category__count">{categoryFeatures.length}</span>
              </h2>
              <div className="feature-grid">
                {categoryFeatures.map((feature) => (
                  <FeatureCard key={feature.id} feature={feature} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
