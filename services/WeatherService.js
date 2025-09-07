// ~/.config/ags/services/WeatherService.js
import Soup from "gi://Soup";
import GLib from "gi://GLib";
import { createState } from "ags";

/** ---------- State ---------- **/
const [weather, setWeather] = createState(null);
const UPDATE_INTERVAL = 900; // 15 minutes
const API_URL = "https://wttr.in/?format=j1";

/** ---------- Helpers ---------- **/
function fetchWeather() {
    return new Promise((resolve, reject) => {
        try {
            const session = new Soup.Session();
            const msg = Soup.Message.new("GET", API_URL);

            session.send_and_read_async(
                msg,
                GLib.PRIORITY_DEFAULT,
                null,
                (session, res) => {
                    try {
                        const bytes = session.send_and_read_finish(res);
                        const data = new TextDecoder().decode(bytes.get_data());
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

/** ---------- Reload Function ---------- **/
async function reload() {
    try {
        const json = await fetchWeather();
        setWeather({
            current: json.current_condition[0],
            forecast: json.weather,
        });
        print("[WeatherService] ✅ Updated successfully");
    } catch (err) {
        print(`[WeatherService] ❌ ${err.message}`);
    }
}

/** ---------- Auto Refresh ---------- **/
// First load
reload();

// Refresh on interval
GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, UPDATE_INTERVAL, () => {
    reload();
    return true; // keep repeating
});

/** ---------- Export ---------- **/
export default {
    weather,
    reload,
};
