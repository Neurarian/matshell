// ~/.config/ags/weather/service.ts
import Soup from "gi://Soup";
import GLib from "gi://GLib";
import { createPoll } from "ags/time";
import { WeatherData } from "./types";

/** ---------- Constants ---------- **/
const UPDATE_INTERVAL = 900_000; // 15 minutes in ms
const API_URL = "https://wttr.in/?format=j1";

/** ---------- Helpers ---------- **/
async function fetchWeather(): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const session = new Soup.Session();
      const msg = Soup.Message.new("GET", API_URL);

      session.send_and_read_async(
        msg,
        GLib.PRIORITY_DEFAULT,
        null,
        (callbackSession, res) => {
          try {
            const bytes = callbackSession?.send_and_read_finish(res);
            const rawData = bytes?.get_data();

            if (!(callbackSession && bytes && rawData)) {
              reject(new Error("Failed to retrieve valid response data"));
              return;
            }

            const data = new TextDecoder().decode(rawData);
            const json = JSON.parse(data);
            resolve(json);
          } catch (err) {
            reject(new Error(`Failed to parse response: ${err}`));
          }
        },
      );
    } catch (err) {
      reject(new Error(`Request failed: ${err}`));
    }
  });
}

/** ---------- Weather Poll ---------- **/
const weather = createPoll<WeatherData>(
  { current: null, forecast: [] },
  UPDATE_INTERVAL,
  async (prev) => {
    try {
      const json = await fetchWeather();

      return {
        // normalize temp keys in current condition
        current: {
          ...json.current_condition[0],
          tempC: json.current_condition[0].temp_C,
          tempF: json.current_condition[0].temp_F,
        },
        forecast: json.weather,
      };
    } catch (err) {
      if (err instanceof Error) {
        print(`[WeatherService] ❌ ${err.message}`);
      } else {
        print(`[WeatherService] ❌ Unknown error: ${String(err)}`);
      }
      return prev; // keep previous data if error
    }
  },
);

/** ---------- Export ---------- **/
export default {
  weather,
};
