/**
 * @file AppProvider.tsx
 * @description Provides the global styling, UI frameworks, and translation contexts to the application.
 */

import { MantineProvider } from "@mantine/core";
import { theme } from "@/app/styles/theme";
import "@/app/styles/global.css";
import "@/app/i18n/config";
import { VaultProvider } from "./VaultProvider";

/**
 * Properties for the AppProvider component.
 */
interface AppProviderProps {
  /** The children elements that will be wrapped by the providers. */
  children: React.ReactNode;
}

/**
 * AppProvider wrapper component.
 * Initializes MantineProvider with custom themes and options.
 *
 * @param {AppProviderProps} props - The component props.
 * @returns {JSX.Element} The wrapped provider component tree.
 */
export function AppProvider({ children }: Readonly<AppProviderProps>) {
  return (
    <MantineProvider
      theme={theme}
      defaultColorScheme="auto"
      deduplicateInlineStyles
    >
      <VaultProvider>{children}</VaultProvider>
    </MantineProvider>
  );
}
