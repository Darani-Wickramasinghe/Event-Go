// Defines the colors, typography, spacing, and other style values shared by screens.
const palette = {
  primary: '#4F46E5',
  background: '#F8F9FD',
  surface: '#FFFFFF',
  text: '#151936',
  textSecondary: '#667085',
  border: '#E8EAF2',
};

export const colors = {
  ...palette,
  purpleDark: '#4438D2',
  lavender: '#EFEDFF',
  controlBorder: '#8490A7',
  mint: '#DDF9F1',
  purple: palette.primary,
  action: palette.primary,
  ink: palette.text,
  muted: palette.textSecondary,
  line: palette.border,
  white: palette.surface,
};

export const semanticColors = {
  success: { text: '#146249', surface: '#E7F7EE', border: '#BCE5D2' },
  warning: { text: '#854D0E', surface: '#FFF4DB', border: '#F3D99F' },
  error: { text: '#9F2444', surface: '#FDECF0', border: '#F3C5D1' },
};

export const headingFont = 'InterExtraBold';

export const typography = {
  title: { fontFamily: headingFont, fontSize: 24, lineHeight: 30 },
  section: { fontFamily: headingFont, fontSize: 18, lineHeight: 24 },
  body: { fontSize: 15, lineHeight: 22 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  button: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  input: { fontSize: 16, lineHeight: 22 },
};

export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32 };
export const radii = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };
export const iconSizes = { sm: 16, md: 20, lg: 24, xl: 32 };
export const touchTargets = { minimum: 44, standard: 48 };
export const shadows = {
  card: { boxShadow: '0px 2px 8px rgba(21, 25, 54, 0.06)' },
  raised: { boxShadow: '0px 8px 24px rgba(21, 25, 54, 0.10)' },
};
