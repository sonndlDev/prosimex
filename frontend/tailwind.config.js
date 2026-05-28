import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ── shadcn bridge (CSS var based) ──
        background:  "rgb(var(--background) / <alpha-value>)",
        foreground:  "rgb(var(--foreground) / <alpha-value>)",
        border:      "rgb(var(--border) / <alpha-value>)",
        input:       "rgb(var(--input) / <alpha-value>)",
        ring:        "rgb(var(--ring) / <alpha-value>)",
        primary: {
          DEFAULT:    "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT:    "rgb(var(--secondary) / <alpha-value>)",
          foreground: "rgb(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT:    "rgb(var(--muted) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT:    "rgb(var(--accent) / <alpha-value>)",
          foreground: "rgb(var(--accent-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT:    "rgb(var(--destructive) / <alpha-value>)",
          foreground: "rgb(var(--destructive-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT:    "rgb(var(--card) / <alpha-value>)",
          foreground: "rgb(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT:    "rgb(var(--popover) / <alpha-value>)",
          foreground: "rgb(var(--popover-foreground) / <alpha-value>)",
        },

        // ── MES Operational State Colors ──
        state: {
          running:     '#22c55e',
          delayed:     '#f59e0b',
          blocked:     '#ef4444',
          completed:   '#6366f1',
          warning:     '#f97316',
          critical:    '#dc2626',
          maintenance: '#8b5cf6',
          idle:        '#94a3b8',
          planned:     '#0ea5e9',
        },
      },

      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
        xl: '10px',
        '2xl': '12px',
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },

      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        xs:    ['0.75rem',  { lineHeight: '1rem' }],
        sm:    ['0.8125rem',{ lineHeight: '1.25rem' }],
        base:  ['0.875rem', { lineHeight: '1.5rem' }],
        lg:    ['1rem',     { lineHeight: '1.5rem' }],
        xl:    ['1.125rem', { lineHeight: '1.625rem' }],
        '2xl': ['1.25rem',  { lineHeight: '1.75rem' }],
      },

      spacing: {
        '0.5': '2px',
        '1':   '4px',
        '1.5': '6px',
        '2':   '8px',
        '2.5': '10px',
        '3':   '12px',
        '3.5': '14px',
        '4':   '16px',
        '5':   '20px',
        '6':   '24px',
        '7':   '28px',
        '8':   '32px',
        '9':   '36px',
        '10':  '40px',
        '11':  '44px',
        '12':  '48px',
        '14':  '56px',
        '16':  '64px',
        '18':  '72px',
        '20':  '80px',
        // Layout tokens
        'sidebar':         '220px',
        'sidebar-collapsed': '50px',
        'topbar':          '52px',
      },

      boxShadow: {
        card:    '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.2)',
        panel:   '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
        overlay: '0 20px 40px -8px rgb(0 0 0 / 0.6), 0 8px 16px -4px rgb(0 0 0 / 0.4)',
        glow:    '0 0 20px rgb(59 130 246 / 0.15)',
        'glow-green': '0 0 12px rgb(34 197 94 / 0.3)',
        'glow-red':   '0 0 12px rgb(248 113 113 / 0.3)',
      },

      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up":   { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "page-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(12px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        "live-pulse": {
          "0%":   { boxShadow: "0 0 0 0 rgb(34 197 94 / 0.4)" },
          "70%":  { boxShadow: "0 0 0 6px rgb(34 197 94 / 0)" },
          "100%": { boxShadow: "0 0 0 0 rgb(34 197 94 / 0)" },
        },
        "skel-shimmer": {
          "0%":   { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%":      { opacity: "0.6", transform: "scale(0.8)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
      },

      animation: {
        "accordion-down":  "accordion-down 0.2s ease-out",
        "accordion-up":    "accordion-up 0.2s ease-out",
        "page-in":         "page-in 0.15s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in":         "fade-in 0.2s ease-out",
        "slide-in-right":  "slide-in-right 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "live-pulse":      "live-pulse 2s infinite",
        "skel-shimmer":    "skel-shimmer 1.5s infinite",
        "pulse-dot":       "pulse-dot 2s infinite",
        "pulse-dot-fast":  "pulse-dot 1s infinite",
        "spin-slow":       "spin-slow 3s linear infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
