type CatalogLoadingStateProps = {
  title?: string;
  subtitle?: string;
};

export function CatalogLoadingState({
  title = "Loading catalog",
  subtitle = "Preparing your local movie shelf.",
}: CatalogLoadingStateProps) {
  return (
    <section className="catalog-loading">
      <div>
        <p>{title}</p>
        <h1>{subtitle}</h1>
      </div>
      <div className="catalog-loading__grid" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
    </section>
  );
}
