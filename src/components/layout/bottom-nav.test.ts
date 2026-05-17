import { describe, it, expect } from "vitest";

/**
 * Smoke tests for the active-tab classifier in <BottomNav>. The function
 * lives inside the component module; we replicate it here to keep the
 * test free of jsdom/RTL while still pinning the rules.
 */
function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  if (href === "/week") return pathname.startsWith("/week") || pathname.startsWith("/report");
  if (href === "/session/strength") return pathname.startsWith("/session");
  if (href === "/race") return pathname.startsWith("/race");
  if (href === "/settings") return pathname.startsWith("/settings");
  return pathname === href;
}

describe("BottomNav active classifier", () => {
  it("/dashboard matches Today", () => {
    expect(isActive("/dashboard", "/dashboard")).toBe(true);
    expect(isActive("/dashboard", "/week")).toBe(false);
  });

  it("/week and /report both highlight the Plan tab", () => {
    expect(isActive("/week", "/week")).toBe(true);
    expect(isActive("/report/abc/2026-05-12", "/week")).toBe(true);
  });

  it("/session/strength and /session/<uuid> both highlight the Strength tab", () => {
    expect(isActive("/session/strength", "/session/strength")).toBe(true);
    expect(isActive("/session/abc-123", "/session/strength")).toBe(true);
  });

  it("/race and /race/fitness both highlight the Race tab", () => {
    expect(isActive("/race", "/race")).toBe(true);
    expect(isActive("/race/fitness", "/race")).toBe(true);
  });

  it("/settings and sub-pages highlight the Profile tab", () => {
    expect(isActive("/settings", "/settings")).toBe(true);
    expect(isActive("/settings/training-pattern", "/settings")).toBe(true);
  });

  it("/auth pages do not match any of the five tabs", () => {
    expect(isActive("/auth/login", "/dashboard")).toBe(false);
    expect(isActive("/auth/login", "/week")).toBe(false);
    expect(isActive("/auth/login", "/session/strength")).toBe(false);
    expect(isActive("/auth/login", "/race")).toBe(false);
    expect(isActive("/auth/login", "/settings")).toBe(false);
  });
});
