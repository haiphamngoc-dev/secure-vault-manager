/**
 * @file App.tsx
 * @description Main root application component.
 * Integrates the application providers with the router outlet tree.
 */

import { AppProvider } from "@/app/providers/AppProvider";
import { RouterProvider } from "react-router-dom";
import { router } from "@/app/routes/AppRoutes";

/**
 * Root Application component.
 * Wraps the router in the global `AppProvider` context.
 *
 * @returns {JSX.Element} The rendered React component tree.
 */
export function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );
}

export default App;
