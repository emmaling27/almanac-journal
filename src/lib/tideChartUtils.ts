import { format } from "date-fns";

export interface InterpolatedPoint {
  time: string;
  height: number;
}

/**
 * Interpolates discrete tidal points (e.g. 30-minute intervals) into a smooth,
 * continuous 1-minute resolution dataset (1,440 points from 00:00 to 23:59).
 * Uses cosine interpolation to match sinusoidal tidal harmonics.
 */
export function interpolateTideCurve(
  tideCurve: { time: string; height: number }[]
): InterpolatedPoint[] {
  if (!tideCurve || tideCurve.length === 0) return [];

  const parsed = tideCurve
    .map((pt) => {
      const parts = pt.time.split(":");
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (isNaN(h) || isNaN(m)) return null;
      return { minute: h * 60 + m, height: pt.height };
    })
    .filter((pt): pt is { minute: number; height: number } => pt !== null)
    .sort((a, b) => a.minute - b.minute);

  if (parsed.length === 0) return [];

  // Single-point fallback: flat curve across all minutes
  if (parsed.length === 1) {
    const single = parsed[0].height;
    return Array.from({ length: 1440 }, (_, m) => ({
      time: `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`,
      height: single,
    }));
  }

  // Ensure minute 0 is present
  if (parsed[0].minute > 0) {
    parsed.unshift({ minute: 0, height: parsed[0].height });
  }

  // Ensure minute 1440 is present for wrapping to end of day
  const last = parsed[parsed.length - 1];
  if (last.minute < 1440) {
    // Smoothly connect toward the start of the next cycle (00:00 height)
    parsed.push({ minute: 1440, height: parsed[0].height });
  }

  const points: InterpolatedPoint[] = [];
  let segIdx = 0;

  for (let m = 0; m < 1440; m++) {
    while (segIdx < parsed.length - 2 && parsed[segIdx + 1].minute <= m) {
      segIdx++;
    }
    const p0 = parsed[segIdx];
    const p1 = parsed[segIdx + 1];
    let height = p0.height;
    if (p1 && p1.minute > p0.minute) {
      const progress = (m - p0.minute) / (p1.minute - p0.minute);
      // Cosine interpolation for natural tidal harmonic wave
      const factor = (1 - Math.cos(progress * Math.PI)) / 2;
      height = p0.height + (p1.height - p0.height) * factor;
    }
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    points.push({
      time: `${hh}:${mm}`,
      height: Math.round(height * 100) / 100,
    });
  }

  return points;
}

/**
 * Snaps a 24-hour time string ("HH:mm") to the corresponding 30-minute
 * tidal point interval ("HH:00" or "HH:30") present in the continuous chart.
 */
export function snapToTideInterval(timeStr: string): string {
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return "00:00";
  const snappedM = m < 30 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${snappedM}`;
}

/**
 * Formats a Date object to "HH:mm" in 24-hour time.
 */
export function formatCurrentTime(date: Date = new Date()): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Checks whether the selected date represents today, accounting for
 * both the initial todayStr and the current live date.
 */
export function isDateToday(
  selectedDate: string,
  todayStr: string,
  currentDate: Date = new Date()
): boolean {
  if (todayStr && selectedDate === todayStr) return true;
  const nowStr = format(currentDate, "yyyy-MM-dd");
  return selectedDate === nowStr;
}
