export const THEME = {
  colors: {
    // Backgrounds
    bg: {
      primary: '#0a0a0f',      // main background (near black)
      secondary: '#12121a',    // panel backgrounds
      tertiary: '#1a1a28',     // items inside panels
      elevated: '#22222f',     // elevated elements (cards, tooltips)
    },
    // Neon borders per component (from reference images)
    border: {
      callStack: '#f59e0b',     // amber/orange
      webAPIs: '#a855f7',       // purple/magenta
      taskQueue: '#ec4899',     // pink/magenta
      microtaskQueue: '#06b6d4',// cyan/teal
      eventLoop: '#06b6d4',    // cyan
      console: '#6b7280',      // gray
      editor: '#374151',       // dark gray
    },
    // Text
    text: {
      primary: '#e5e7eb',
      secondary: '#9ca3af',
      muted: '#6b7280',
      accent: '#22d3ee',       // cyan for highlights
    },
    // Syntax highlighting accents
    syntax: {
      keyword: '#c084fc',      // purple
      string: '#fbbf24',       // yellow
      number: '#f472b6',       // pink
      function: '#34d399',     // green
      variable: '#60a5fa',     // blue
      comment: '#6b7280',      // gray
    },
    // Status
    status: {
      running: '#22c55e',
      pending: '#f59e0b',
      completed: '#6b7280',
      error: '#ef4444',
    },
  },
  // Glow effects for borders (box-shadow)
  glow: {
    callStack: '0 0 15px rgba(245, 158, 11, 0.3)',
    webAPIs: '0 0 15px rgba(168, 85, 247, 0.3)',
    taskQueue: '0 0 15px rgba(236, 72, 153, 0.3)',
    microtaskQueue: '0 0 15px rgba(6, 182, 212, 0.3)',
    eventLoop: '0 0 15px rgba(6, 182, 212, 0.3)',
  },
  // Fonts
  fonts: {
    code: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    ui: "'Geist', 'Inter', system-ui, sans-serif",
  },
  // Border radius
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
} as const;
