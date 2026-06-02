import logoUrl from "@/assets/brand/movie-wizard-logo-generated.png";
import markDarkUrl from "@/assets/brand/movie-wizard-mark-dark-generated.png";
import markUrl from "@/assets/brand/movie-wizard-mark-generated.png";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  variant?: "mark" | "logo";
  className?: string;
};

const logoSources = {
  mark: markUrl,
  logo: logoUrl,
};

const logoLabels = {
  mark: "Movie Wizard",
  logo: "Movie Wizard logo",
};

export function BrandLogo({ variant = "mark", className }: BrandLogoProps) {
  if (variant === "mark") {
    return (
      <span className={cn("brand-logo brand-logo-stack", className)} role="img" aria-label={logoLabels.mark}>
        <img className="brand-logo__asset brand-logo__asset--light" src={markUrl} alt="" aria-hidden="true" />
        <img className="brand-logo__asset brand-logo__asset--dark" src={markDarkUrl} alt="" aria-hidden="true" />
      </span>
    );
  }

  return <img className={cn("brand-logo", className)} src={logoSources[variant]} alt={logoLabels[variant]} />;
}
