// Classy Color Palette for Needs Protocol
// A sophisticated, professional color scheme for the hackathon demo

export const COLORS = {
  // Primary Brand Colors (Deep Navy/Indigo for Authority)
  primary: {
    50: '#f0f4f8',
    100: '#d9e2ec',
    200: '#bcccdc',
    300: '#9fb3c8',
    400: '#829ab1',
    500: '#627d98',
    600: '#486581',
    700: '#334e68',
    800: '#243b53',
    900: '#102a43', // Deep Navy
  },
  
  // Secondary Accents (Teal/Emerald for Collaboration/Flow)
  teal: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
  },
  
  indigo: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },
  
  // Category Colors
  categories: {
    Medical: '#3b82f6',      // Blue-500
    Education: '#8b5cf6',    // Purple-500
    Logistics: '#f97316',    // Orange-500
    FoodWater: '#059669',     // Emerald-600
    Shelter: '#4338ca',       // Indigo-700
    Other: '#486581',         // Navy-600
  },
  
  // Urgency Colors (Amber/Red Highlights)
  urgency: {
    High: {
      bg: '#fff1f2',
      border: '#fecdd3',
      text: '#e11d48', // Rose-600
    },
    Medium: {
      bg: '#fffbeb',
      border: '#fde68a',
      text: '#d97706', // Amber-600
    },
    Low: {
      bg: '#f0fdf4',
      border: '#dcfce7',
      text: '#16a34a', // Green-600
    },
  },
  
  // Match Score Colors
  matchScore: {
    high: '#059669',   // Emerald-600
    medium: '#d97706', // Amber-600
    low: '#627d98',    // Navy-500
  },
  
  // Status Colors
  status: {
    Open: '#d97706',        // Amber-600
    Matched: '#0d9488',     // Teal-600
    Completed: '#059669',   // Emerald-600
    "In Progress": '#2563eb', // Blue-600
    Fulfilled: '#059669',   // Emerald-600
  },
  
  // Backgrounds (Clean Neutrals)
  backgrounds: {
    primary: '#f8fafc',    // Slate-50
    secondary: '#ffffff',   // White
    tertiary: '#f1f5f9',    // Slate-100
  },
  
  // Borders
  borders: {
    default: '#dae1e7',    // Light gray
    active: '#486581',     // Navy-600
    success: '#059669',    // Emerald-600
    warning: '#d97706',    // Amber-600
    error: '#e11d48',      // Rose-600
  },
  
  // Text Colors
  text: {
    primary: '#102a43',     // Deep Navy
    secondary: '#334e68',   // Navy-700
    tertiary: '#627d98',    // Navy-500
    disabled: '#9fb3c8',    // Navy-300
  },
};

export const SHADOWS = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.08)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.2)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
};

export const BUTTON_STYLES = {
  primary: {
    bg: 'bg-[#102a43]',
    hover: 'hover:bg-[#243b53]',
    active: 'active:bg-[#0f172a]',
    text: 'text-white font-bold tracking-tight',
  },
  secondary: {
    bg: 'bg-white',
    hover: 'hover:bg-slate-50',
    active: 'active:bg-slate-100',
    text: 'text-[#102a43] font-bold tracking-tight',
    border: 'border border-[#dae1e7]',
  },
  success: {
    bg: 'bg-teal-600',
    hover: 'hover:bg-teal-700',
    active: 'active:bg-teal-800',
    text: 'text-white font-semibold',
  },
  danger: {
    bg: 'bg-rose-600',
    hover: 'hover:bg-rose-700',
    active: 'active:bg-rose-800',
    text: 'text-white font-semibold',
  },
};

export const CARD_STYLES = {
  default: {
    bg: 'bg-white',
    border: 'border border-slate-200',
    shadow: 'shadow-sm',
    rounded: 'rounded-xl',
  },
  highlighted: {
    bg: 'bg-slate-50',
    border: 'border border-slate-300',
    shadow: 'shadow-md',
    rounded: 'rounded-xl',
  },
};

export const BADGE_STYLES = {
  success: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border border-emerald-200',
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border border-amber-200',
  },
  error: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border border-rose-200',
  },
  info: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border border-blue-200',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border border-purple-200',
  },
};

export const getCategoryColor = (category: string): string => {
  return COLORS.categories[category as keyof typeof COLORS.categories] || COLORS.categories.Other;
};

export const getUrgencyStyles = (urgency: string) => {
  const styles = COLORS.urgency[urgency as keyof typeof COLORS.urgency] || COLORS.urgency.Low;
  return {
    background: styles.bg,
    border: styles.border,
    text: styles.text,
  };
};

export const getMatchScoreColor = (score: number): string => {
  if (score >= 80) return COLORS.matchScore.high;
  if (score >= 50) return COLORS.matchScore.medium;
  return COLORS.matchScore.low;
};

export const getStatusColor = (status: string): string => {
  return COLORS.status[status as keyof typeof COLORS.status] || COLORS.text.secondary;
};
