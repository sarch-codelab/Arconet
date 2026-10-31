import { afterEach, describe, expect, it, vi } from "vitest";
import { localCalendarDate, formatCalendarOrInstant } from "../lib/calendar-date";
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
describe("fechas de calendario frente a instantes", () => {
  it.each([
    ["America/Tegucigalpa", "2026-10-30"],
    ["UTC", "2026-10-31"],
    ["Asia/Tokyo", "2026-10-31"],
  ])("el input usa el día local en %s", (zone, day) => {
    vi.stubEnv("TZ", zone); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-31T04:00:00Z"));
    expect(localCalendarDate()).toBe(day);
  });
  it.each(["America/Tegucigalpa", "UTC", "Asia/Tokyo"])("un día guardado no retrocede en %s", zone => {
    vi.stubEnv("TZ", zone);
    expect(formatCalendarOrInstant("2026-10-30")).toMatch(/^30\b/);
  });
  it("una emisión fiscal con hora sí se convierte a la hora local", () => {
    vi.stubEnv("TZ", "America/Tegucigalpa");
    expect(formatCalendarOrInstant("2026-10-31T04:00:00Z")).toMatch(/^30\b/);
  });
  it("datos vacíos/inválidos no muestran Invalid Date", () => {
    expect(formatCalendarOrInstant(null)).toBe("—");
    expect(formatCalendarOrInstant("no-es-fecha")).toBe("—");
  });
});
