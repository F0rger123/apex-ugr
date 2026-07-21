export const colors = {
  // Primary Matrix Cyber Theme
  primary: '#00FF66',          // Matrix Neon Green
  primaryGlow: 'rgba(0, 255, 102, 0.25)',
  primaryDark: '#00B345',      // Deep Green Accent
  primaryBg: 'rgba(0, 38, 15, 0.6)',

  // Background Base
  background: '#060709',       // Deepest Obsidian Black
  surface: '#0F1117',          // Carbon Surface
  card: 'rgba(18, 22, 30, 0.82)',// Dark Glass Card
  cardBorder: 'rgba(255, 255, 255, 0.09)',
  activeCardBorder: '#00FF66',

  // Status & Accents
  danger: '#FF3366',           // Racing Red
  warning: '#FFB800',          // Telemetry Gold
  info: '#00E5FF',             // Cyber Cyan
  success: '#00FF66',

  // Text Hierarchy
  text: '#F8FAFC',             // High contrast white
  textSecondary: '#94A3B8',    // Muted silver
  textMuted: '#64748B',        // Subdued slate
  textMatrix: '#00FF66',       // Glowing readout text

  // Glassmorphism overlays
  glassBg: 'rgba(18, 22, 30, 0.85)',
  glassHeader: 'rgba(6, 7, 9, 0.92)',
  overlay: 'rgba(0, 0, 0, 0.85)',
};

export const theme = {
  colors,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 6,
    md: 12,
    lg: 18,
    full: 9999,
  },
};
