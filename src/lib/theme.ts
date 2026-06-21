import { theme } from "antd";

export const BRAND = {
  dark: "#000000",
  accent: "#000000",
  accentLight: "#fafafa",
  surface: "#ffffff",
  pageBg: "#ffffff",
  border: "#e4e4e7",
  text: {
    primary: "#18181b",
    secondary: "#71717a",
    muted: "#a1a1aa",
  },
  sidebar: {
    text: "#a1a1aa",
    textHover: "#ffffff",
    textActive: "#ffffff",
    hover: "rgba(255, 255, 255, 0.05)",
    active: "rgba(255, 255, 255, 0.1)",
    border: "rgba(255, 255, 255, 0.06)",
  },
} as const;

export const antTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: BRAND.accent,
    colorInfo: BRAND.accent,
    colorBgLayout: BRAND.pageBg,
    colorBgContainer: BRAND.surface,
    colorBorderSecondary: BRAND.border,
    colorBorder: "#d1d5db",
    colorText: BRAND.text.primary,
    colorTextSecondary: BRAND.text.secondary,
    colorTextTertiary: BRAND.text.muted,
    borderRadius: 8,
    borderRadiusLG: 12,
    fontSize: 14,
    fontSizeHeading1: 24,
    fontSizeHeading2: 20,
    fontSizeHeading3: 16,
    fontFamily:
      "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    controlHeight: 36,
    controlHeightLG: 44,
    controlHeightSM: 28,
    boxShadow:
      "0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)",
    boxShadowSecondary:
      "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.03)",
  },
  components: {
    Card: {
      paddingLG: 20,
      borderRadiusLG: 12,
      colorBorderSecondary: BRAND.border,
    },
    Button: {
      borderRadius: 8,
      borderRadiusLG: 10,
      controlHeight: 36,
      controlHeightLG: 44,
      controlHeightSM: 28,
      paddingContentHorizontal: 16,
    },
    Tag: {
      borderRadius: 9999,
    },
    Table: {
      borderRadius: 12,
      headerBg: BRAND.pageBg,
      headerColor: BRAND.text.secondary,
      headerSortActiveBg: BRAND.pageBg,
      headerSortHoverBg: BRAND.border,
      rowHoverBg: BRAND.accentLight,
      borderColor: BRAND.border,
    },
    Drawer: {
      borderRadiusLG: 12,
    },
    Modal: {
      borderRadiusLG: 12,
    },
    Select: {
      borderRadius: 8,
      borderRadiusLG: 10,
      controlHeight: 36,
      optionSelectedColor: "#ffffff",
    },
    Input: {
      borderRadius: 8,
      borderRadiusLG: 10,
      controlHeight: 36,
    },
    DatePicker: {
      borderRadius: 8,
      borderRadiusLG: 10,
      controlHeight: 36,
    },
    Tabs: {
      inkBarColor: BRAND.accent,
      itemActiveColor: BRAND.accent,
      itemSelectedColor: BRAND.accent,
      itemHoverColor: BRAND.accent,
    },
    Dropdown: {
      borderRadius: 8,
    },
    Menu: {
      borderRadius: 8,
      itemBorderRadius: 8,
    },
    List: {
      borderRadius: 12,
    },
    Tooltip: {
      borderRadius: 6,
    },
  },
};
