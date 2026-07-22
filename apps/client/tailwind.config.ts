import type { Config } from "tailwindcss";

// Values here mirror tokens.css (source of truth for the palette).
// Warm minimal charcoal/off-white system — see tokens.css's comment
// for why this replaced the earlier neon glassmorphism palette.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#121211",
        "bg-elevated": "#1B1B19",
        primary: "#ECE9E2",
        secondary: "#A3A399",
        accent: "#C08552",
        success: "#8CA482",
        danger: "#B2604B",
        glass: "rgba(255,255,255,0.04)",
        "glass-border": "rgba(255,255,255,0.12)",
        "text-primary": "#ECE9E2",
        "text-muted": "rgba(236,233,226,0.55)",
      },
      // A single typeface throughout (Inter) rather than a display/body
      // pairing — matches the reference's one consistent grotesque sans
      // used for both hero type and body copy. Heading/Text still apply
      // font-display/font-body respectively (unchanged), so this is a
      // one-line change that cascades everywhere without touching those
      // components.
      fontFamily: {
        display: ["Inter", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      spacing: {
        18: "4.5rem",
      },
      borderRadius: {
        panel: "8px",
        "panel-sm": "6px",
      },
      transitionDuration: {
        micro: "120ms",
        transition: "280ms",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "border-glow": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        "border-glow": "border-glow 8s ease-in-out infinite",
      },
      // Type scale unchanged in size, but Heading now adds tracking-tight
      // at the two largest sizes for a tighter, more editorial hero feel.
      fontSize: {
        "display-xl": ["4.5rem", { lineHeight: "1.05" }],
        "display-lg": ["2.5rem", { lineHeight: "1.15" }],
        "display-md": ["1.75rem", { lineHeight: "1.2" }],
        "body-lg": ["1.125rem", { lineHeight: "1.5" }],
        body: ["1rem", { lineHeight: "1.5" }],
        caption: ["0.8125rem", { lineHeight: "1.4", letterSpacing: "0.02em" }],
      },
      // One quiet ambient elevation shadow — no per-variant colored glow
      // blur anymore. GlassPanel's `glow` prop now differentiates via
      // border color instead (see that component).
      boxShadow: {
        panel: "0 1px 3px 0 rgba(0,0,0,0.4), 0 1px 2px -1px rgba(0,0,0,0.3)",
      },
      zIndex: {
        background: "-10",
        base: "0",
        content: "10",
        overlay: "20",
        modal: "30",
        toast: "40",
      },
    },
  },
  plugins: [],
} satisfies Config;
