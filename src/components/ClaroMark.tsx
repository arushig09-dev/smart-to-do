// Claro "C·" logo mark — shared across login, sidebar, and any future surface.
// Always uses the brand indigo-violet gradient regardless of the active theme.

import { CLARO_BRAND } from "@/lib/themes";

export default function ClaroMark({ size = 36 }: { size?: number }) {
  // Unique gradient ID per size so multiple instances on the same page don't clash.
  const gradId = `claroGrad-${size}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Claro"
    >
      <rect width="36" height="36" rx="9" fill={`url(#${gradId})`} />
      {/* C letterform */}
      <path
        d="M24 12.5C22.3 11 20.3 10 18 10C13.6 10 10 13.6 10 18C10 22.4 13.6 26 18 26C20.3 26 22.3 25 24 23.5"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* dot */}
      <circle cx="25.5" cy="18" r="2" fill="white" />
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor={CLARO_BRAND.gradientFrom} />
          <stop offset="1" stopColor={CLARO_BRAND.gradientTo} />
        </linearGradient>
      </defs>
    </svg>
  );
}
