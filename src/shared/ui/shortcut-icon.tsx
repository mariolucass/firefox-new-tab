import { brandIcons, type BrandIconKey } from "./brand-icons";

type Props = {
  icon?: string;
  label: string;
};

export function ShortcutIcon({ icon, label }: Props) {
  const brand =
    icon && Object.hasOwn(brandIcons, icon)
      ? brandIcons[icon as BrandIconKey]
      : null;
  if (!brand) return <>{icon || label.slice(0, 2).toUpperCase()}</>;
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="currentColor"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <path d={brand.path} />
    </svg>
  );
}
