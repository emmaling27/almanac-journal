import { describe, it, expect } from "vitest";
import {
  degreesToCompass,
  calculateMoonPhase,
  TIDE_STATIONS,
  DEFAULT_TIDE_STATION,
  fetchEnvironmentalData,
} from "./environmental";

describe("Environmental Calculations & Stations", () => {
  describe("degreesToCompass", () => {
    it("converts cardinal and ordinal angles correctly", () => {
      expect(degreesToCompass(0)).toBe("N");
      expect(degreesToCompass(360)).toBe("N");
      expect(degreesToCompass(90)).toBe("E");
      expect(degreesToCompass(180)).toBe("S");
      expect(degreesToCompass(270)).toBe("W");
      expect(degreesToCompass(280)).toBe("W");
      expect(degreesToCompass(295)).toBe("WNW");
      expect(degreesToCompass(315)).toBe("NW");
      expect(degreesToCompass(45)).toBe("NE");
      expect(degreesToCompass(225)).toBe("SW");
    });
  });

  describe("calculateMoonPhase", () => {
    it("computes lunar phase illumination and icons", () => {
      const knownDate = new Date("2026-10-25T12:00:00Z");
      const moon = calculateMoonPhase(knownDate);

      expect(moon).toHaveProperty("name");
      expect(moon).toHaveProperty("illumination");
      expect(moon).toHaveProperty("icon");
      expect(typeof moon.name).toBe("string");
      expect(moon.illumination).toBeGreaterThanOrEqual(0);
      expect(moon.illumination).toBeLessThanOrEqual(100);
      expect(typeof moon.icon).toBe("string");
    });
  });

  describe("TIDE_STATIONS configuration", () => {
    it("defaults to Aquatic Park", () => {
      expect(DEFAULT_TIDE_STATION).toBe("aquatic-park");
    });

    it("configures official NOAA station 9414305 for Aquatic Park", () => {
      const ap = TIDE_STATIONS["aquatic-park"];
      expect(ap.id).toBe("aquatic-park");
      expect(ap.noaaStationId).toBe("9414305");
      expect(ap.shortName).toBe("Aquatic Park");
      expect(ap.timeOffsetMin).toBe(12);
      expect(ap.heightOffsetHigh).toBe(0.2);
      expect(ap.coordinates).toContain("37°48.5' N");
    });

    it("configures official NOAA station 9414334 for Crane Cove", () => {
      const cc = TIDE_STATIONS["crane-cove"];
      expect(cc.id).toBe("crane-cove");
      expect(cc.noaaStationId).toBe("9414334");
      expect(cc.shortName).toBe("Crane Cove");
      expect(cc.timeOffsetMin).toBe(40);
      expect(cc.heightOffsetHigh).toBe(0.5);
      expect(cc.coordinates).toContain("37°45.9' N");
    });
  });

  describe("fetchEnvironmentalData", () => {
    it("fetches and constructs valid tidal and weather data for Aquatic Park", async () => {
      const data = await fetchEnvironmentalData("2026-10-25", "aquatic-park");
      expect(data.stationId).toBe("aquatic-park");
      expect(data.stationShortName).toBe("Aquatic Park");
      expect(data.tideCurve.length).toBeGreaterThanOrEqual(24);
      expect(data.tideEvents.length).toBeGreaterThan(0);
      expect(typeof data.currentTideHeight).toBe("number");
      expect(["Flooding", "Ebbing", "Slack"]).toContain(data.tideTendency);
      expect(data.solarLunar.daylightHours).toBeDefined();
    });

    it("fetches and constructs valid tidal and weather data for Crane Cove", async () => {
      const data = await fetchEnvironmentalData("2026-10-25", "crane-cove");
      expect(data.stationId).toBe("crane-cove");
      expect(data.stationShortName).toBe("Crane Cove");
      expect(data.tideCurve.length).toBeGreaterThanOrEqual(24);
      expect(data.tideEvents.length).toBeGreaterThan(0);
    });
  });
});
