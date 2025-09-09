// ~/.config/ags/services/WeatherService.ts
import Soup from "gi://Soup";
import GLib from "gi://GLib";
import { createPoll } from "ags/time";

/** ---------- Types ---------- **/
export interface WeatherCondition {
    FeelsLikeC: string;
    FeelsLikeF: string;
    humidity: string;
    temp_C: string;       // normalized
    temp_F: string;
    weatherDesc: { value: string }[];
    [key: string]: any;
}

export interface WeatherForecast {
    date: string;
    maxtempC: string;
    mintempC: string;
    hourly: WeatherCondition[];
    [key: string]: any;
}

export interface WeatherData {
    current: WeatherCondition | null;
    forecast: WeatherForecast[];
}

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
                }
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
            const json = (await fetchWeather()) as any;

            // normalize temp keys in hourly forecasts
            const normalizedForecast = json.weather.map((day: any) => ({
                ...day,
                hourly: day.hourly.map((hour: any) => ({
                    ...hour,
                    temp_C: hour.tempC, // <--- normalize here
                    temp_F: hour.tempF, // optional
                })),
            }));

            return {
                current: {
                    ...json.current_condition[0],
                    temp_C: json.current_condition[0].temp_C ?? json.current_condition[0].tempC,
                    temp_F: json.current_condition[0].temp_F ?? json.current_condition[0].tempF,
                },
                forecast: normalizedForecast,
            };
        } catch (err) {
            if (err instanceof Error) {
                print(`[WeatherService] ❌ ${err.message}`);
            } else {
                print(`[WeatherService] ❌ Unknown error: ${String(err)}`);
            }
            return prev; // keep previous data if error
        }
    }
);

/** ---------- Export ---------- **/
export default {
    weather,
    reload: async () => {
        const data = await fetchWeather();
        weather.update?.({
            current: {
                ...data.current_condition[0],
                temp_C: data.current_condition[0].tempC,
                temp_F: data.current_condition[0].tempF,
            },
            forecast: data.weather.map((day: any) => ({
                ...day,
                hourly: day.hourly.map((hour: any) => ({
                    ...hour,
                    temp_C: hour.tempC,
                    temp_F: hour.tempF,
                })),
            })),
        });
    },
};
