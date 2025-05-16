// localization-bridge.ts
import localization from './localization';

// Expose to window for the accessibility panel
declare global {
  interface Window {
    localization: typeof localization;
  }
}

window.localization = localization;

export default localization;