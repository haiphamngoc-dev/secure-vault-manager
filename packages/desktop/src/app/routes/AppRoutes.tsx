/**
 * @file AppRoutes.tsx
 * @description Application routing definition.
 * Configures the HashRouter to define component routes and layouts.
 */

import { AppLayout } from "@/shared/layouts/AppLayout";
import { createHashRouter } from "react-router-dom";

/**
 * Global application router instance.
 * Uses hash routing to ensure compatibility in Tauri environment.
 */
export const router = createHashRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [],
  },
]);
