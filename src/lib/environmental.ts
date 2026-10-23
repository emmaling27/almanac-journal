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
  stationName: string;
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

// Fallback synthetic harmonic tide curve for SF Bay (station 9414290)
function generateSyntheticTides(dateStr: string): {
  curve: TidePoint[];
  events: TideEvent[];
} {
  const curve: TidePoint[] = [];
  const events: TideEvent[] = [
    { time: "02:45", height: 0.8, type: "Low" },
    { time: "09:30", height: 5.2, type: "High" },
    { time: "15:20", height: 1.6, type: "Low" },
    { time: "21:30", height: 4.9, type: "High" },
  ];

  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const timeHours = h + m / 60;
      // Semi-diurnal tide formula approximation for SF Bay
      const height =
        2.9 +
        2.2 * Math.sin(((timeHours - 5.5) / 12.42) * 2 * Math.PI) +
        0.8 * Math.sin(((timeHours - 8.5) / 24.84) * 2 * Math.PI);
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
  dateStr: string // "YYYY-MM-DD"
): Promise<AlmanacEnvironmentalData> {
  const [year, month, day] = dateStr.split("-");
  const noaaDateStr = `${year}${month}${day}`;
  const dateObj = new Date(`${dateStr}T12:00:00`);

  let tideCurve: TidePoint[] = [];
  let tideEvents: TideEvent[] = [];

  // 1. Fetch NOAA Tide Predictions
  try {
    const [curveRes, hiloRes] = await Promise.all([
      fetch(
        `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date=${noaaDateStr}&end_date=${noaaDateStr}&station=9414290&product=predictions&datum=MLLW&time_zone=lst_ldt&units=english&format=json`
      ),
      fetch(
        `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date=${noaaDateStr}&end_date=${noaaDateStr}&station=9414290&product=predictions&datum=MLLW&time_zone=lst_ldt&units=english&interval=hilo&format=json`
      ),
    ]);

    if (curveRes.ok && hiloRes.ok) {
      const curveData = await curveRes.json();
      const hiloData = await hiloRes.json();

      if (Array.isArray(curveData?.predictions)) {
        // Downsample from 6m to 30m intervals
        tideCurve = curveData.predictions
          .filter((_: unknown, index: number) => index % 5 === 0)
          .map((p: { t: string; v: string }) => {
            const timePart = p.t.split(" ")[1];
            return {
              time: timePart,
              height: parseFloat(p.v),
              timestamp: p.t,
            };
          });
      }

      if (Array.isArray(hiloData?.predictions)) {
        tideEvents = hiloData.predictions.map((p: { t: string; v: string; type: string }) => {
          const timePart = p.t.split(" ")[1];
          return {
            time: timePart,
            height: parseFloat(p.v),
            type: p.type === "H" ? ("High" as const) : ("Low" as const),
          };
        });
      }
    }
  } catch (err) {
    console.warn("Using synthetic tides fallback:", err);
  }

  if (tideCurve.length === 0) {
    const synthetic = generateSyntheticTides(dateStr);
    tideCurve = synthetic.curve;
    tideEvents = synthetic.events;
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

  // 2. Fetch Open-Meteo Sun & Wind
  let sunrise = "07:15";
  let sunset = "18:25";
  let daylightHours = "11h 10m";
  let windSpeedKnots = 11;
  let windDirectionDeg = 280;
  let temperatureF = 62;

  try {
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=37.81&longitude=-122.47&daily=sunrise,sunset,daylight_duration&hourly=wind_speed_10m,wind_direction_10m,temperature_2m&start_date=${dateStr}&end_date=${dateStr}&timezone=America%2FLos_Angeles`
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
    stationName: "San Francisco (Golden Gate Fort Point)",
    coordinates: "37°48.6' N, 122°28.3' W",
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
