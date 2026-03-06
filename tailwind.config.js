/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary brand color - vibrant purple/blue gradient feel
        nebula: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e1065",
        },
        // Dark theme surfaces (OpenAI-inspired)
        panel: {
          bg: "#0d0d0d",
          card: "#141414",
          elevated: "#1a1a1a",
          hover: "#252525",
          border: "#2a2a2a",
          "border-light": "#3a3a3a",
        },
        // Text colors for dark theme
        text: {
          primary: "#ffffff",
          secondary: "#a1a1aa",
          muted: "#71717a",
          disabled: "#52525b",
        },
        // Accent colors for nodes and status
        accent: {
          green: "#22c55e",
          "green-soft": "#166534",
          blue: "#3b82f6",
          "blue-soft": "#1e3a5f",
          purple: "#a855f7",
          "purple-soft": "#581c87",
          orange: "#f97316",
          "orange-soft": "#7c2d12",
          red: "#ef4444",
          "red-soft": "#7f1d1d",
          yellow: "#eab308",
          "yellow-soft": "#713f12",
          teal: "#14b8a6",
          "teal-soft": "#134e4a",
          pink: "#ec4899",
          "pink-soft": "#831843",
          sky: "#0ea5e9",
          "sky-soft": "#0c4a6e",
          amber: "#f59e0b",
          "amber-soft": "#78350f",
          indigo: "#6366f1",
          "indigo-soft": "#312e81",
        },
        // Keep legacy colors for backward compat
        surface: {
          0: "#ffffff",
          1: "#f8f9fa",
          2: "#f1f3f5",
          3: "#e9ecef",
          4: "#dee2e6",
        },
        "surface-dark": {
          0: "#0d0d0d",
          1: "#141414",
          2: "#1a1a1a",
          3: "#252525",
          4: "#71717a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      boxShadow: {
        "glow-sm": "0 0 10px rgba(139, 92, 246, 0.15)",
        "glow-md": "0 0 20px rgba(139, 92, 246, 0.2)",
        "glow-lg": "0 0 30px rgba(139, 92, 246, 0.25)",
        "node": "0 4px 12px rgba(0, 0, 0, 0.4)",
        "node-hover": "0 8px 24px rgba(0, 0, 0, 0.5)",
        "panel": "0 0 1px rgba(0, 0, 0, 0.5), 0 8px 40px rgba(0, 0, 0, 0.4)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "grid-pattern": "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
      },
      animation: {
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "fade-in": "fade-in 0.2s ease-out",
        "slide-in": "slide-in 0.2s ease-out",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in": {
          "0%": { transform: "translateX(10px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
