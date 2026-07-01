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
  "#c1c2c5",
  "#a6a7ab",
  "#909296",
  "#5c5f66",
  "#373a40",
  "#2c2e33",
  "#25262b",
  "#1a1b1e",
  "#141517",
  "#101113",
];

/**
 * Custom Royal/Indigo Blue color palette aligned with the brand design specs (#2563eb).
 */
const brandBlueColors: MantineColorsTuple = [
  "#eff6ff", // index 0 (Highlight / bg tint)
  "#dbeafe",
  "#bfdbfe",
  "#93c5fd",
  "#60a5fa",
  "#3b82f6", // Hover style
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
