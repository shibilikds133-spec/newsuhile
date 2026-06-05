/**
 * Platform detection utility
 */

export const isElectron = () => {
  if (typeof window === 'undefined') return false;
  
  // Check for Electron using multiple reliable methods
  return !!(
    window.electronAPI || 
    (window.process && window.process.versions && window.process.versions.electron) ||
    (window.navigator && window.navigator.userAgent && window.navigator.userAgent.toLowerCase().indexOf(' electron/') > -1)
  );
};

export const isMobile = () => {
  if (typeof window === 'undefined') return false;
  
  // Mobile detection based on screen width (standard threshold)
  // or user agent if needed
  const isSmallScreen = window.innerWidth < 768;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent);
  
  return isSmallScreen || isMobileUA;
};

export const getPlatform = () => {
  if (isElectron()) return 'desktop-app';
  if (isMobile()) return 'mobile-web';
  return 'desktop-web';
};
