export const colors = {
  // Primary Matrix Cyber Theme
  primary: '#00FF66',          // Matrix Neon Green
  primaryGlow: '#00FF6640',      // Neon Green Transparent Glow
  primaryDark: '#00B345',      // Deep Green Accent
  primaryBg: '#00260F',        // Matrix Dark Tint

  // Background Base
  background: '#08090C',       // Jet Obsidian Black
  surface: '#111319',          // Carbon Surface
  card: '#161922',             // Dark Glass Card
  cardBorder: 'rgba(255, 255, 255, 0.08)',
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
  glassBg: 'rgba(22, 25, 34, 0.85)',
  glassHeader: 'rgba(8, 9, 12, 0.90)',
  overlay: 'rgba(0, 0, 0, 0.75)',
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
  typography: {
    fontFamilyBold: 'System',
    fontFamilyNumeric: 'System',
  }
};
