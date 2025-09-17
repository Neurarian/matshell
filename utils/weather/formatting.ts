import { WeatherData } from "./types";

/** ---------- Time Parsing Utilities ---------- **/
export function parseBlockHour(timeString: string): number {
  // wttr.in returns "0", "300", "600", etc.
  return Math.floor(parseInt(timeString, 10) / 100);
}

export function formatBlockTime(t: string): string {
  const hour = parseBlockHour(t);
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric" });
}

/** ---------- Icon Mapping ---------- **/
export function getIcon(desc: string): string {
  if (!desc) return "Partly_Cloudy_Day";
  desc = desc.toLowerCase();
  if (desc.includes("sun")) return "Sunny";
  if (desc.includes("cloud")) return "Cloud";
  if (desc.includes("rain")) return "Rainy";
  if (desc.includes("storm") || desc.includes("thunder")) return "Thunderstorm";
  if (desc.includes("snow")) return "Weather_Snowy";
  if (desc.includes("fog") || desc.includes("mist")) return "Foggy";
  if (desc.includes("wind")) return "Air";
  if (desc.includes("hot")) return "Mode_Heat";
  if (desc.includes("cold")) return "Mode_Cool";
  return "Partly_Cloudy_Day";
}

/** ---------- Forecast Operations ---------- **/
export function getRelativeForecasts(
  weatherData: WeatherData,
  count: number = 5,
) {
  if (!weatherData.forecast || weatherData.forecast.length === 0) {
    return [];
  }

  const allHourlyForecasts = weatherData.forecast.flatMap((day) =>
    day.hourly.map((block) => ({ ...block, date: day.date })),
  );

  const currentHour = new Date().getHours();
  const currentDate = new Date().toISOString().split("T")[0];

  // Find first forecast at or after current hour, or first forecast from next day
  const startIndex = allHourlyForecasts.findIndex((block) => {
    const blockHour = parseBlockHour(String(block.time));
    return blockHour >= currentHour || block.date > currentDate;
  });

  return allHourlyForecasts.slice(startIndex, startIndex + count);
}
