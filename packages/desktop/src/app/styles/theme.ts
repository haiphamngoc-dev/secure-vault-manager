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
  "#ffffff", // text
  "rgba(255, 255, 255, 0.9)",
  "rgba(255, 255, 255, 0.65)", // subtext
  "#555555",
  "#444444", // borders
  "#333333", // card bg (index 5)
  "#2d2d2d",
  "#262626", // body bg (index 7)
  "#1c1c1c",
  "#121212",
];

/**
 * Custom Sky Blue color palette aligned with brand specs (#0c7df0).
 */
const brandBlueColors: MantineColorsTuple = [
  "#ebf5ff", // index 0 (Highlight / bg tint)
  "#d1e9ff",
  "#a3d3ff",
  "#75bdff",
  "#47a7ff",
  "#2490ff", // Hover style
  "#0c7df0", // Main primary brand color (index 6)
  "#0067cc", // Active/pressed style (index 7)
  "#00509e",
  "#003870",
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
