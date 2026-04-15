import { cn } from "@/lib/utils";

// ─── Hera Icon ────────────────────────────────────────────────────────────────
// Coroa de três pontas — lê como poder (Hera, rainha do Olimpo) e
// como beleza (salão de luxo). Legível de 14 px até 512 px.

export function HeraIcon({
  className,
  size = 20,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      {/* Corpo da coroa */}
      <path d="M2,23 H22 V17 L18,9 L14,15 L12,4 L10,15 L6,9 L2,17 Z" />
      {/* Gemas nas pontas */}
      <circle cx="12" cy="4"  r="1.5" />
      <circle cx="6"  cy="9"  r="1.2" />
      <circle cx="18" cy="9"  r="1.2" />
    </svg>
  );
}

// ─── Logo container (icon + wordmark) ────────────────────────────────────────

export function BrandLogo({
  size = "md",
  theme = "dark",
  className,
}: {
  size?: "sm" | "md" | "lg";
  theme?: "dark" | "light";
  className?: string;
}) {
  const iconSizes = { sm: 16, md: 20, lg: 26 };
  const boxSizes  = { sm: "w-8 h-8 rounded-xl",   md: "w-11 h-11 rounded-2xl", lg: "w-14 h-14 rounded-3xl" };
  const textSizes = { sm: "text-sm",               md: "text-base",              lg: "text-xl" };
  const subSizes  = { sm: "text-[9px]",             md: "text-[10px]",            lg: "text-xs" };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Icon box */}
      <div
        className={cn(
          "flex items-center justify-center flex-shrink-0",
          boxSizes[size],
        )}
        style={{
          background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
          boxShadow: "0 0 0 1px rgba(124,58,237,.3), 0 4px 24px rgba(124,58,237,.5)",
        }}
      >
        <HeraIcon size={iconSizes[size]} className="text-white" />
      </div>

      {/* Wordmark */}
      <div>
        <p
          className={cn(
            "font-black leading-tight tracking-tight",
            textSizes[size],
            theme === "dark" ? "text-white" : "text-gray-900",
          )}
        >
          Hera
        </p>
        <p
          className={cn(
            "font-semibold tracking-widest uppercase mt-0.5",
            subSizes[size],
            theme === "dark" ? "text-violet-400/70" : "text-violet-500",
          )}
        >
          Gestão de Salões
        </p>
      </div>
    </div>
  );
}
