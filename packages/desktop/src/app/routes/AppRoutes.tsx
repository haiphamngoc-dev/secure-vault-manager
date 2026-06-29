/**
 * @file AppRoutes.tsx
 * @description Application routing definition.
 * Configures the HashRouter to define component routes and layouts.
 */

import { AppLayout } from "@/shared/layouts/AppLayout";
import { MainLayout } from "@/shared/layouts/MainLayout";
import { createHashRouter } from "react-router-dom";
import { DashboardPage, SettingsPage } from "@/features/dashboard";

/**
 * Global application router instance.
 * Uses hash routing to ensure compatibility in Tauri environment.
 */
export const router = createHashRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            path: "settings",
            element: <SettingsPage />,
          },
        ],
      },
    ],
  },
]);
