/**
 * @file ResizeHandles.tsx
 * @description Provides mouse-interactable border handles that trigger native Tauri window resizing.
 */

import { Box } from "@mantine/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import classes from "./ResizeHandles.module.css";

/**
 * Valid directions for resizing the Tauri window interface.
 */
type ResizeDirection =
  | "East"
  | "North"
  | "NorthEast"
  | "NorthWest"
  | "South"
  | "SouthEast"
  | "SouthWest"
  | "West";

// Access the Tauri window instance
const appWindow = getCurrentWindow();

/**
 * ResizeHandles component renders absolute positioned hoverable zones at window edges.
 * Triggers native window resize dragging when user clicks and drags these handles.
 */
export function ResizeHandles() {
  /**
   * Delegates resize drag-and-drop operations directly to the Tauri window manager.
   * @param direction The border direction being dragged.
   */
  const handleResize = (direction: ResizeDirection) => {
    appWindow.startResizeDragging(direction);
  };

  return (
    <>
      {/* Top and Bottom Resizing Handles */}
      <Box
        className={`${classes.handle} ${classes.north}`}
        onMouseDown={() => handleResize("North")}
      />
      <Box
        className={`${classes.handle} ${classes.south}`}
        onMouseDown={() => handleResize("South")}
      />

      {/* Right and Left Resizing Handles */}
      <Box
        className={`${classes.handle} ${classes.east}`}
        onMouseDown={() => handleResize("East")}
      />
      <Box
        className={`${classes.handle} ${classes.west}`}
        onMouseDown={() => handleResize("West")}
      />

      {/* Corner Resizing Handles */}
      <Box
        className={`${classes.handle} ${classes.northWest}`}
        onMouseDown={() => handleResize("NorthWest")}
      />
      <Box
        className={`${classes.handle} ${classes.northEast}`}
        onMouseDown={() => handleResize("NorthEast")}
      />
      <Box
        className={`${classes.handle} ${classes.southWest}`}
        onMouseDown={() => handleResize("SouthWest")}
      />
      <Box
        className={`${classes.handle} ${classes.southEast}`}
        onMouseDown={() => handleResize("SouthEast")}
      />
    </>
  );
}

export default ResizeHandles;
