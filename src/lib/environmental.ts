export type TideStationId = "aquatic-park" | "crane-cove";

export interface TideStationConfig {
  id: TideStationId;
  name: string;
  shortName: string;
  noaaStationId: string;
  coordinates: string;
  lat: number;
  lng: number;
  description: string;
  timeOffsetMin: number;
  heightOffsetHigh: number;
}

export const TIDE_STATIONS: Record<TideStationId, TideStationConfig> = {
  "aquatic-park": {
    id: "aquatic-park",
    name: "Aquatic Park (Pier 41 / North Point)",
    shortName: "Aquatic Park",
    noaaStationId: "9414305",
    coordinates: "37°48.5' N, 122°25.4' W",
    lat: 37.8085,
    lng: -122.424,
    description: "North waterfront cove • Fisherman's Wharf / Pier 41 reference",
    timeOffsetMin: 12,
    heightOffsetHigh: 0.2,
  },
  "crane-cove": {
    id: "crane-cove",
    name: "Crane Cove (Potrero Point / Central Basin)",
    shortName: "Crane Cove",
    noaaStationId: "9414334",
    coordinates: "37°45.9' N, 122°23.2' W",
    lat: 37.7645,
    lng: -122.387,
    description: "Central waterfront & Dogpatch • Potrero Point / Pier 70 reference",
    timeOffsetMin: 40,
    heightOffsetHigh: 0.5,
  },
};

export const DEFAULT_TIDE_STATION: TideStationId = "aquatic-park";

export interface TidePoint {
  time: string; // "HH:mm"
  height: number; // in feet
  timestamp: string; // full ISO or "YYYY-MM-DD HH:mm"
}

export interface TideEvent {
  time: string; // "HH:mm"
  height: number; // in feet
  type: "High" | "Low";
}

export interface SolarLunarData {
  sunrise: string; // "07:24"
  sunset: string; // "18:23"
  daylightHours: string; // "11h 00m"
  moonPhaseName: string; // "Waxing Gibbous"
  moonIllumination: number; // 0 - 100
  moonIcon: string;
}

export interface WindData {
  speedKnots: number;
  directionDeg: number;
  directionCompass: string;
  temperatureF: number;
}

export interface AlmanacEnvironmentalData {
  date: string;
  stationId: TideStationId;
  stationName: string;
  stationShortName: string;
  coordinates: string;
  tideCurve: TidePoint[];
  tideEvents: TideEvent[];
  currentTideHeight?: number;
  tideTendency?: "Flooding" | "Ebbing" | "Slack";
  solarLunar: SolarLunarData;
  wind: WindData;
}

const COMPASS_POINTS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
];

export function degreesToCompass(degrees: number): string {
  const index = Math.round(degrees / 22.5) % 16;
  return COMPASS_POINTS[index];
}

// Astronomical Moon calculation
export function calculateMoonPhase(dateObj: Date): {
  name: string;
  illumination: number;
  icon: string;
} {
  // Known new moon: Jan 11, 2024, 11:57 UTC
  const refDate = new Date(Date.UTC(2024, 0, 11, 11, 57, 0)).getTime();
  const synodicMonth = 29.53058867 * 86400 * 1000;
  const diff = dateObj.getTime() - refDate;
  const cycle = ((diff % synodicMonth) + synodicMonth) % synodicMonth;
  const ageDays = cycle / (86400 * 1000);

  const illumination = Math.round(
    ((1 - Math.cos((ageDays / 29.53058867) * 2 * Math.PI)) / 2) * 100
  );

  let name = "New Moon";
  let icon = "🌑";

  if (ageDays < 1.84) {
    name = "New Moon";
    icon = "🌑";
  } else if (ageDays < 7.38) {
    name = "Waxing Crescent";
    icon = "🌒";
  } else if (ageDays < 9.22) {
    name = "First Quarter";
    icon = "🌓";
  } else if (ageDays < 14.77) {
    name = "Waxing Gibbous";
    icon = "🌔";
  } else if (ageDays < 16.61) {
    name = "Full Moon";
    icon = "🌕";
  } else if (ageDays < 22.15) {
    name = "Waning Gibbous";
    icon = "🌖";
  } else if (ageDays < 23.99) {
    name = "Last Quarter";
    icon = "🌗";
  } else if (ageDays < 27.68) {
    name = "Waning Crescent";
    icon = "🌘";
  } else {
    name = "New Moon";
    icon = "🌑";
  }

  return { name, illumination, icon };
}

// Fallback synthetic harmonic tide curve calibrated for SF Bay locations
function generateSyntheticTides(
  dateStr: string,
  station: TideStationConfig
): {
  curve: TidePoint[];
  events: TideEvent[];
} {
  const curve: TidePoint[] = [];
  const timeShiftHours = station.timeOffsetMin / 60;
  const heightBoost = station.heightOffsetHigh;

  const baseEvents = [
    { hour: 3.75, height: 0.9, type: "Low" as const },
    { hour: 10.35, height: 5.6 + heightBoost, type: "High" as const },
    { hour: 16.5, height: 0.9, type: "Low" as const },
    { hour: 22.75, height: 4.9 + heightBoost * 0.7, type: "High" as const },
  ];

  const events: TideEvent[] = baseEvents.map((evt) => {
    const totalMinutes =
      Math.round((evt.hour + (station.id === "crane-cove" ? 0.6 : 0.15)) * 60) %
      (24 * 60);
    const hh = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const mm = String(totalMinutes % 60).padStart(2, "0");
    return {
      time: `${hh}:${mm}`,
      height: Math.round(evt.height * 10) / 10,
      type: evt.type,
    };
  });

  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const timeHours = h + m / 60;
      const adjustedTime = timeHours - timeShiftHours;
      const baseHeight =
        3.0 +
        2.2 * Math.sin(((adjustedTime - 5.5) / 12.42) * 2 * Math.PI) +
        0.8 * Math.sin(((adjustedTime - 8.5) / 24.84) * 2 * Math.PI);
      const height =
        baseHeight > 3.0
          ? baseHeight + ((baseHeight - 3.0) / 2.5) * heightBoost
          : baseHeight;

      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      curve.push({
        time: `${hh}:${mm}`,
        height: Math.round(height * 10) / 10,
        timestamp: `${dateStr} ${hh}:${mm}`,
      });
    }
  }

  return { curve, events };
}

export async function fetchEnvironmentalData(
  dateStr: string, // "YYYY-MM-DD"
  stationId: TideStationId = DEFAULT_TIDE_STATION
): Promise<AlmanacEnvironmentalData> {
  const station = TIDE_STATIONS[stationId] ?? TIDE_STATIONS[DEFAULT_TIDE_STATION];
  const [year, month, day] = dateStr.split("-");
  const noaaDateStr = `${year}${month}${day}`;
  const dateObj = new Date(`${dateStr}T12:00:00`);

  let tideCurve: TidePoint[] = [];
  let tideEvents: TideEvent[] = [];

  // 1. Fetch NOAA Tide Predictions
  // - High/Low predictions come directly from the specific station (9414305 for Aquatic Park, 9414334 for Crane Cove)
  // - Continuous 6-minute curve comes from reference station 9414290 (Golden Gate), shifted and scaled by station offsets
  try {
    const [curveRes, hiloRes] = await Promise.all([
      fetch(
        `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date=${noaaDateStr}&end_date=${noaaDateStr}&station=9414290&product=predictions&datum=MLLW&time_zone=lst_ldt&units=english&format=json`
      ),
      fetch(
        `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date=${noaaDateStr}&end_date=${noaaDateStr}&station=${station.noaaStationId}&product=predictions&datum=MLLW&time_zone=lst_ldt&units=english&interval=hilo&format=json`
      ),
    ]);

    if (hiloRes.ok) {
      const hiloData = await hiloRes.json();
      if (Array.isArray(hiloData?.predictions) && hiloData.predictions.length > 0) {
        tideEvents = hiloData.predictions.map((p: { t: string; v: string; type: string }) => {
          const timePart = p.t.split(" ")[1];
          return {
            time: timePart,
            height: Math.round(parseFloat(p.v) * 10) / 10,
            type: p.type === "H" ? ("High" as const) : ("Low" as const),
          };
        });
      }
    }

    if (curveRes.ok) {
      const curveData = await curveRes.json();
      if (Array.isArray(curveData?.predictions) && curveData.predictions.length > 0) {
        // Shift continuous predictions by station time & height offsets
        const shifted = curveData.predictions.map((p: { t: string; v: string }) => {
          const [, tPart] = p.t.split(" ");
          const [h, m] = tPart.split(":").map(Number);
          const totalMin = h * 60 + m + station.timeOffsetMin;
          const v = parseFloat(p.v);
          const adjustedV =
            v > 2.5
              ? v + Math.min(1, Math.max(0, (v - 2.5) / 3.0)) * station.heightOffsetHigh
              : v;
          return { totalMin, v: adjustedV };
        });

        // Downsample to 30-minute intervals: 00:00, 00:30, ... 23:30
        const sampled: TidePoint[] = [];
        for (let m = 0; m < 24 * 60; m += 30) {
          const closest = shifted.reduce(
            (
              prev: { totalMin: number; v: number },
              curr: { totalMin: number; v: number }
            ) => (Math.abs(curr.totalMin - m) < Math.abs(prev.totalMin - m) ? curr : prev)
          );
          const hh = String(Math.floor(m / 60)).padStart(2, "0");
          const mm = String(m % 60).padStart(2, "0");
          sampled.push({
            time: `${hh}:${mm}`,
            height: Math.round(closest.v * 10) / 10,
            timestamp: `${dateStr} ${hh}:${mm}`,
          });
        }
        tideCurve = sampled;
      }
    }
  } catch (err) {
    console.warn(`Using synthetic tides fallback for ${station.name}:`, err);
  }

  if (tideCurve.length === 0 || tideEvents.length === 0) {
    const synthetic = generateSyntheticTides(dateStr, station);
    if (tideCurve.length === 0) tideCurve = synthetic.curve;
    if (tideEvents.length === 0) tideEvents = synthetic.events;
  }

  // Determine current tide height and tendency based on current hour
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTotalMin = currentHour * 60 + currentMinute;

  let currentTideHeight = tideCurve[0]?.height ?? 3.0;
  let tideTendency: "Flooding" | "Ebbing" | "Slack" = "Flooding";

  for (let i = 0; i < tideCurve.length - 1; i++) {
    const [h, m] = tideCurve[i].time.split(":").map(Number);
    const ptMin = h * 60 + m;
    const [hNext, mNext] = tideCurve[i + 1].time.split(":").map(Number);
    const ptNextMin = hNext * 60 + mNext;

    if (currentTotalMin >= ptMin && currentTotalMin <= ptNextMin) {
      currentTideHeight = tideCurve[i].height;
      const diff = tideCurve[i + 1].height - tideCurve[i].height;
      if (Math.abs(diff) < 0.1) tideTendency = "Slack";
      else if (diff > 0) tideTendency = "Flooding";
      else tideTendency = "Ebbing";
      break;
    }
  }

  // 2. Fetch Open-Meteo Sun & Wind for the specific location
  let sunrise = "07:15";
  let sunset = "18:25";
  let daylightHours = "11h 10m";
  let windSpeedKnots = 11;
  let windDirectionDeg = 280;
  let temperatureF = 62;

  try {
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${station.lat}&longitude=${station.lng}&daily=sunrise,sunset,daylight_duration&hourly=wind_speed_10m,wind_direction_10m,temperature_2m&start_date=${dateStr}&end_date=${dateStr}&timezone=America%2FLos_Angeles`
    );

    if (weatherRes.ok) {
      const weather = await weatherRes.json();
      if (weather?.daily?.sunrise?.[0]) {
        sunrise = weather.daily.sunrise[0].split("T")[1];
      }
      if (weather?.daily?.sunset?.[0]) {
        sunset = weather.daily.sunset[0].split("T")[1];
      }
      if (weather?.daily?.daylight_duration?.[0]) {
        const totalSec = weather.daily.daylight_duration[0];
        const hrs = Math.floor(totalSec / 3600);
        const mins = Math.round((totalSec % 3600) / 60);
        daylightHours = `${hrs}h ${mins}m`;
      }

      const hourlyIndex = Math.min(
        currentHour,
        (weather?.hourly?.wind_speed_10m?.length ?? 1) - 1
      );
      if (weather?.hourly?.wind_speed_10m?.[hourlyIndex] !== undefined) {
        const kmh = weather.hourly.wind_speed_10m[hourlyIndex];
        windSpeedKnots = Math.round(kmh * 0.539957);
      }
      if (weather?.hourly?.wind_direction_10m?.[hourlyIndex] !== undefined) {
        windDirectionDeg = weather.hourly.wind_direction_10m[hourlyIndex];
      }
      if (weather?.hourly?.temperature_2m?.[hourlyIndex] !== undefined) {
        const c = weather.hourly.temperature_2m[hourlyIndex];
        temperatureF = Math.round((c * 9) / 5 + 32);
      }
    }
  } catch (err) {
    console.warn("Using weather fallback:", err);
  }

  const moon = calculateMoonPhase(dateObj);

  return {
    date: dateStr,
    stationId: station.id,
    stationName: station.name,
    stationShortName: station.shortName,
    coordinates: station.coordinates,
    tideCurve,
    tideEvents,
    currentTideHeight,
    tideTendency,
    solarLunar: {
      sunrise,
      sunset,
      daylightHours,
      moonPhaseName: moon.name,
      moonIllumination: moon.illumination,
      moonIcon: moon.icon,
    },
    wind: {
      speedKnots: windSpeedKnots,
      directionDeg: windDirectionDeg,
      directionCompass: degreesToCompass(windDirectionDeg),
      temperatureF,
    },
  };
}
