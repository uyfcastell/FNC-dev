export type DeviceProfile = {
  mode: "mobile" | "desktop";
  isTablet: boolean;
};

const MOBILE_MAX_WIDTH = 1024;

function detectProfile(): DeviceProfile {
  const width = typeof window !== "undefined" ? window.innerWidth : MOBILE_MAX_WIDTH + 1;
  const isTouch = typeof window !== "undefined" ? window.matchMedia("(pointer:coarse)").matches : false;
  const isMobileWidth = width <= MOBILE_MAX_WIDTH;
  const isTablet = isMobileWidth && width >= 600;
  const ua = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
  const isMobileUA = /mobile|android|ipad|tablet/.test(ua);

  const isMobile = isTouch || isMobileWidth || isMobileUA;

  return {
    mode: isMobile ? "mobile" : "desktop",
    isTablet,
  };
}

export function getDeviceProfile() {
  return detectProfile();
}

export function listenDeviceProfile(callback: (profile: DeviceProfile) => void) {
  const handler = () => callback(detectProfile());
  window.addEventListener("resize", handler);
  window.addEventListener("orientationchange", handler);
  return () => {
    window.removeEventListener("resize", handler);
    window.removeEventListener("orientationchange", handler);
  };
}
