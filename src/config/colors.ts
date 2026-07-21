export const colors = {
  // Primary Matrix Cyber Theme (Preserved)
  primary: '#00FF66',          // Matrix Neon Green
  primaryGlow: 'rgba(0, 255, 102, 0.25)',
  primaryDark: '#00B345',      // Deep Green Accent
  primaryBg: 'rgba(0, 38, 15, 0.6)',

  // The Digital Astral Background Base (Depth)
  deepSpace: '#060E20',        // Deep space base color for nebula
  background: 'transparent',   // Transparent to allow nebula to show through
  surface: '#0A0C11',          
  surfaceContainerLow: '#091328',
  surfaceContainerHigh: '#141F38',
  surfaceVariant: 'rgba(25, 37, 64, 0.4)', // 40% Opacity Glass Card
  
  card: 'rgba(25, 37, 64, 0.4)',
  cardBorder: 'rgba(64, 72, 93, 0.15)', // Ghost Border
  activeCardBorder: '#00FF66',

  // Status & Accents
  danger: '#FF3366',           // Racing Red
  warning: '#FFB800',          // Telemetry Gold
  info: '#00E5FF',             // Cyber Cyan
  success: '#00FF66',
  astralPurple: '#be83fa',
  astralIndigo: '#6366f1',

  // Text Hierarchy
  text: '#DEE5FF',             // High contrast white/indigo
  textSecondary: '#A3AAC4',    // on_surface_variant
  textMuted: '#64748B',        
  textMatrix: '#00FF66',       

  // Glassmorphism overlays
  glassBg: 'rgba(25, 37, 64, 0.4)',
  glassHeader: 'rgba(6, 14, 32, 0.85)',
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
