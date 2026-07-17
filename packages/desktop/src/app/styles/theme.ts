/**
 * @file theme.ts
 * @description Mantine CSS-in-JS style theme configuration.
 * Configures the theme typography (Inter & Outfit), radius, and global dark color overrides.
 */

import { createTheme, MantineColorsTuple } from "@mantine/core";

/**
 * Dark color palette overrides for consistent dark mode aesthetics.
 */
const darkColors: MantineColorsTuple = [
  "#f8fafc", // index 0 (Chữ chính - Tuyết nhạt)
  "rgba(248, 250, 252, 0.8)",
  "#94a3b8", // index 2 (Chữ phụ/Muted)
  "#475569",
  "#1e293b", // index 4 (Borders mặc định)
  "#171e35", // index 5 (Card bg - Steel Shield)
  "#0e1324", // index 6 (Sidebar bg - Midnight Navy)
  "#070a13", // index 7 (Body bg - Deep Abyss)
  "#030712",
  "#02040a",
];

/**
 * Custom Cobalt Blue color palette aligned with brand specs (#2563eb).
 */
const brandBlueColors: MantineColorsTuple = [
  "#eff6ff", // index 0
  "#dbeafe",
  "#bfdbfe",
  "#93c5fd",
  "#60a5fa",
  "#3b82f6", // Hover style (index 5)
  "#2563eb", // Main primary brand color (index 6)
  "#1d4ed8", // Active/pressed style (index 7)
  "#1e40af",
  "#1e3a8a",
];

/**
 * The application's customized Mantine theme instance.
 */
export const theme = createTheme({
  primaryColor: "blue",
  colors: {
    dark: darkColors,
    blue: brandBlueColors,
  },
  fontFamily:
    "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  headings: {
    fontFamily: "Outfit, Inter, sans-serif",
  },
  defaultRadius: "md", // Bo góc mềm mại hiện đại (8px)
  components: {
    Button: {
      defaultProps: {
        radius: "md",
        size: "sm",
        loaderProps: { type: "dots" },
      },
    },
    Card: {
      defaultProps: {
        radius: "lg", // Cards bo góc lớn hơn tạo chiều sâu khối (12px)
        withBorder: true,
        shadow: "sm",
      },
    },
    TextInput: {
      defaultProps: {
        radius: "md",
        size: "sm",
      },
    },
    PasswordInput: {
      defaultProps: {
        radius: "md",
        size: "sm",
      },
    },
  },
});
