import { describe, it, expect } from "vitest";
import {
  interpolateTideCurve,
  formatCurrentTime,
  isDateToday,
  snapToTideInterval,
} from "./tideChartUtils";

describe("tideChartUtils", () => {
  describe("snapToTideInterval", () => {
    it("snaps minutes 00-29 to 00 and 30-59 to 30", () => {
      expect(snapToTideInterval("00:00")).toBe("00:00");
      expect(snapToTideInterval("00:15")).toBe("00:00");
      expect(snapToTideInterval("00:29")).toBe("00:00");
      expect(snapToTideInterval("00:30")).toBe("00:30");
      expect(snapToTideInterval("00:45")).toBe("00:30");
      expect(snapToTideInterval("14:23")).toBe("14:00");
      expect(snapToTideInterval("14:47")).toBe("14:30");
      expect(snapToTideInterval("23:59")).toBe("23:30");
    });
  });

  describe("formatCurrentTime", () => {
    it("formats dates into HH:mm format with zero padding", () => {
      const morning = new Date(2026, 9, 25, 9, 5);
      expect(formatCurrentTime(morning)).toBe("09:05");

      const afternoon = new Date(2026, 9, 25, 14, 23);
      expect(formatCurrentTime(afternoon)).toBe("14:23");

      const midnight = new Date(2026, 9, 25, 0, 0);
      expect(formatCurrentTime(midnight)).toBe("00:00");

      const nightfall = new Date(2026, 9, 25, 23, 59);
      expect(formatCurrentTime(nightfall)).toBe("23:59");
    });
  });

  describe("isDateToday", () => {
    it("returns true when selectedDate matches todayStr", () => {
      expect(isDateToday("2026-10-25", "2026-10-25")).toBe(true);
    });

    it("returns false when selectedDate differs from todayStr and live date", () => {
      const liveDate = new Date(2026, 9, 25);
      expect(isDateToday("2026-10-24", "2026-10-25", liveDate)).toBe(false);
      expect(isDateToday("2026-10-26", "2026-10-25", liveDate)).toBe(false);
    });

    it("returns true when selectedDate matches current live date across midnight rollover", () => {
      const nextDay = new Date(2026, 9, 26);
      expect(isDateToday("2026-10-26", "2026-10-25", nextDay)).toBe(true);
    });
  });

  describe("interpolateTideCurve", () => {
    it("returns empty array when input curve is empty", () => {
      expect(interpolateTideCurve([])).toEqual([]);
    });

    it("handles single-point curve by populating flat 1,440 points", () => {
      const res = interpolateTideCurve([{ time: "12:00", height: 4.2 }]);
      expect(res.length).toBe(1440);
      expect(res[0]).toEqual({ time: "00:00", height: 4.2 });
      expect(res[1439]).toEqual({ time: "23:59", height: 4.2 });
    });

    it("interpolates 30-minute sampled tide data into continuous 1-minute resolution", () => {
      const mockCurve = [
        { time: "00:00", height: 3.0 },
        { time: "00:30", height: 3.5 },
        { time: "06:00", height: 6.0 },
        { time: "12:00", height: 1.0 },
        { time: "18:00", height: 5.5 },
        { time: "23:30", height: 2.8 },
      ];

      const res = interpolateTideCurve(mockCurve);

      // Must produce exactly 1,440 points (00:00 through 23:59)
      expect(res.length).toBe(1440);
      expect(res[0].time).toBe("00:00");
      expect(res[1439].time).toBe("23:59");

      // Exact sampled points must match their original values
      expect(res[0].height).toBe(3.0);
      expect(res[30].height).toBe(3.5);
      expect(res[6 * 60].height).toBe(6.0);
      expect(res[12 * 60].height).toBe(1.0);
      expect(res[18 * 60].height).toBe(5.5);
      expect(res[23 * 60 + 30].height).toBe(2.8);

      // In-between points must be smoothly interpolated between surrounding values
      const halfWay = res[15]; // 00:15
      expect(halfWay.time).toBe("00:15");
      expect(halfWay.height).toBeGreaterThan(3.0);
      expect(halfWay.height).toBeLessThan(3.5);

      // Verify desktop reference ticks exist
      const desktopTicks = [
        "00:00",
        "03:00",
        "06:00",
        "09:00",
        "12:00",
        "15:00",
        "18:00",
        "21:00",
      ];
      const timeSet = new Set(res.map((p) => p.time));
      desktopTicks.forEach((tick) => {
        expect(timeSet.has(tick)).toBe(true);
      });

      // Verify every minute of the day is present and continuous
      for (let m = 0; m < 1440; m++) {
        const hh = String(Math.floor(m / 60)).padStart(2, "0");
        const mm = String(m % 60).padStart(2, "0");
        expect(res[m].time).toBe(`${hh}:${mm}`);
      }
    });

    it("gracefully filters out malformed time strings", () => {
      const corrupted = [
        { time: "invalid", height: 0 },
        { time: "00:00", height: 2.5 },
        { time: "12:00", height: 5.0 },
      ];
      const res = interpolateTideCurve(corrupted);
      expect(res.length).toBe(1440);
      expect(res[0].height).toBe(2.5);
      expect(res[12 * 60].height).toBe(5.0);
    });
  });
});
