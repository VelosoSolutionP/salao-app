import { cn } from "@/lib/utils";

// ─── Bellefy Icon ─────────────────────────────────────────────────────────────
// Letra "B" estilizada com acento de estrela — moderna, elegante, funciona
// de 12 px até 512 px. Export mantido como HeraIcon para compatibilidade.

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
      {/* Letter B — bold geometric */}
      <path d="M4 3v18h9.5c2.5 0 4.5-2 4.5-4.5 0-1.5-.7-2.8-1.9-3.6 1-.8 1.6-2 1.6-3.2C17.2 7.4 15.4 5.8 13.2 5.8L4 3zm3 2.5 5.5.3c1 0 1.7.8 1.7 1.7 0 1-.8 1.7-1.7 1.7H7V5.5zm0 5.5h6c1.2 0 2.1.9 2.1 2.1 0 1.1-.9 2-2.1 2H7V11z" />
      {/* Sparkle accent top-right */}
      <path d="M21 2l.65 1.6L23.3 4.25l-1.65.65L21 6.5l-.65-1.6L18.7 4.25l1.65-.65Z" />
    </svg>
  );
}

// Alias for files that import BellefyIcon directly
export { HeraIcon as BellefyIcon };

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
          Bellefy
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
