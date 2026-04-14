import { cn } from "@/lib/utils";

// ─── TOQE Icon ────────────────────────────────────────────────────────────────
// Cinco barras arredondadas em perfil de arco — lê como pente (beleza) e
// como gráfico (gestão). A forma central mais alta forma um "T" implícito.

export function ToqeIcon({
  className,
  size = 20,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 22 20"
      fill="currentColor"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      {/* 5 barras com perfil em arco — externas curtas, central mais alta */}
      <rect x="0"    y="12" width="3" height="8"  rx="1.5" />
      <rect x="4.75" y="7"  width="3" height="13" rx="1.5" />
      <rect x="9.5"  y="2"  width="3" height="18" rx="1.5" />
      <rect x="14.25" y="7"  width="3" height="13" rx="1.5" />
      <rect x="19"   y="12" width="3" height="8"  rx="1.5" />
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
        <ToqeIcon size={iconSizes[size]} className="text-white" />
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
          TOQE
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
