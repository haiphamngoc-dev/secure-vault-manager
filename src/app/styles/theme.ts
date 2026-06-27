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
 * The application's customized Mantine theme instance.
 */
export const theme = createTheme({
  primaryColor: "indigo",
  colors: {
    dark: darkColors,
  },
  fontFamily:
    "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  headings: {
    fontFamily: "Outfit, Inter, sans-serif",
  },
  defaultRadius: "lg",
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
        radius: "md",
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
