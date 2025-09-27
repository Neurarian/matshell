// ~/.config/ags/utils/weather/service.ts
import { createPoll } from "ags/time";
import { fetch } from "ags/fetch";
import { WeatherData } from "./types";
import options from "../../options";

const API_URL = "https://wttr.in/?format=j1";
const CACHE_KEY = "wttr_weather_data";
const updateInterval = Number(options["weather.update-interval"].value);

let weatherCache: { data: WeatherData; timestamp: number } | null = null;

// Load cache on startup
function loadWeatherCache(): void {
  try {
    const persistentCache = options["weather.cache"].value as Record<
      string,
      { data: WeatherData; timestamp: number }
    >;
    const entry = persistentCache[CACHE_KEY];
    if (entry) {
      weatherCache = entry;
    }
  } catch (error) {
    console.warn("Failed to load weather cache:", error);
  }
}

// Save cache to persistent storage to prevent unnecessary API hits
function saveWeatherCache(): void {
  if (!weatherCache) return;

  setTimeout(() => {
    try {
      const persistentCache: Record<
        string,
        { data: WeatherData; timestamp: number }
      > = {};
      persistentCache[CACHE_KEY] = weatherCache!;

      options["weather.cache"].value = persistentCache;
    } catch (error) {
      console.error("Failed to save weather cache:", error);
    }
  }, 0);
}

// Getter/Setter cache functions
function getCachedWeather(): WeatherData | null {
  if (!weatherCache) return null;

  const age = Date.now() - weatherCache.timestamp;
  const maxAge = updateInterval - 5000;
  return age < maxAge ? weatherCache.data : null;
}

function setCachedWeather(data: WeatherData): void {
  weatherCache = {
    data,
    timestamp: Date.now(),
  };
  saveWeatherCache();
}

// Helpers
async function fetchWeather(): Promise<WeatherData> {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const json = await response.json();

  const weatherData: WeatherData = {
    current: json.current_condition[0]
      ? {
          ...json.current_condition[0],
          tempC: json.current_condition[0].temp_C,
          tempF: json.current_condition[0].temp_F,
        }
      : null,
    forecast: json.weather || [],
  };

  setCachedWeather(weatherData);
  return weatherData;
}

// Load cache on startup
loadWeatherCache();

// Poll
const weather = createPoll<WeatherData>(
  { current: null, forecast: [] },
  updateInterval,
  async (prev) => {
    try {
      const cached = getCachedWeather();
      if (cached) {
        print("using cached weather data");
        return cached;
      }
      print("using API weather data");

      return await fetchWeather();
    } catch (err) {
      print(`[WeatherService] ❌ ${err}`);
      return prev;
    }
  },
);

export default {
  weather,
  clearCache: () => {
    weatherCache = null;
  },
};
