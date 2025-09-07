// ~/.config/ags/widgets/sidebar/WeatherWidget.js
import Gtk from "gi://Gtk?version=4.0";
import { With } from "gnim";
import WeatherService from "../../../services/WeatherService.js";

/** ---------- Helpers ---------- **/
function getIcon(desc) {
    desc = desc.toLowerCase();
    if (desc.includes("sun")) return "sun-symbolic";
    if (desc.includes("cloud")) return "cloud-symbolic";
    if (desc.includes("rain")) return "rain-symbolic";
    if (desc.includes("storm") || desc.includes("thunder")) return "storm-symbolic";
    if (desc.includes("snow")) return "snow-symbolic";
    if (desc.includes("fog") || desc.includes("mist")) return "fog-symbolic";
    if (desc.includes("wind")) return "windy-symbolic";
    if (desc.includes("hot")) return "hot-symbolic";
    if (desc.includes("cold")) return "cold-symbolic";
    return "partly-cloudy-symbolic";
}

function formatBlockTime(t) {
    const hour = parseInt(t, 10) / 100;
    const d = new Date();
    d.setHours(hour, 0, 0, 0);
    return d.toLocaleTimeString([], { hour: "numeric" });
}

/** ---------- Forecast Item ---------- **/
function ForecastItem(block) {
    const icon = getIcon(block.weatherDesc[0].value);
    return (
        <box class="forecast-item" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
            <label label={formatBlockTime(block.time)} class="forecast-hour" />
            <image iconName={icon} pixelSize={35} class="forecast-icon" />
            <label label={`${block.tempC}°`} class="forecast-temp" />
        </box>
    );
}

/** ---------- Weather Widget ---------- **/
export default function WeatherWidget() {
    return (
        <box class="weather-widget" orientation={Gtk.Orientation.VERTICAL} spacing={6}>
            <With value={WeatherService.weather}>
                {(data) => {
                    if (!data) {
                        return (
                            <label
                                label="Loading weather..."
                                halign={Gtk.Align.CENTER}
                            />
                        );
                    }

                    const current = data.current;
                    const today = data.forecast[0];
                    const forecastItems = today.hourly.slice(0, 5).map(ForecastItem);
                    const currentIcon = getIcon(current.weatherDesc[0].value);

                    const rainPct =
                        current.precipitation !== undefined
                            ? current.precipitation
                            : current.humidity;

                    return (
                        <box orientation={Gtk.Orientation.VERTICAL} spacing={6}>
                            {/* Current weather row */}
                            <box
                                class="current-weather"
                                orientation={Gtk.Orientation.HORIZONTAL}
                                spacing={16}
                                valign={Gtk.Align.CENTER}
                            >
                                {/* Left column: Icon + Description */}
                                <box
                                    orientation={Gtk.Orientation.VERTICAL}
                                    halign={Gtk.Align.START}
                                    spacing={2}
                                >
                                    <image
                                        iconName={currentIcon}
                                        pixelSize={100}
                                        class="current-icon"
                                    />
                                    <label
                                        class="weather-desc"
                                        label={current.weatherDesc[0].value}
                                        halign={Gtk.Align.CENTER}
                                    />
                                </box>

                                {/* Right column: Temp + Extras */}
                                <box
                                    orientation={Gtk.Orientation.VERTICAL}
                                    hexpand={true}
                                    valign={Gtk.Align.CENTER}
                                    halign={Gtk.Align.END}
                                    spacing={2}
                                >
                                    <label
                                        class="weather-temp"
                                        label={`${current.temp_C}°C`}
                                        halign={Gtk.Align.END}
                                    />

                                    <box
                                        orientation={Gtk.Orientation.HORIZONTAL}
                                        spacing={10}
                                        halign={Gtk.Align.END}
                                        valign={Gtk.Align.CENTER}
                                    >
                                        <image iconName="windy-symbolic" pixelSize={25} />
                                        <label
                                            class="weather-extra"
                                            label={`${current.windspeedKmph} km/h`}
                                        />

                                        <image iconName="rain-symbolic" pixelSize={25} />
                                        <label
                                            class="weather-extra"
                                            label={`${rainPct}%`}
                                        />
                                    </box>
                                </box>
                            </box>

                            {/* Divider */}
                            {new Gtk.Separator({
                                orientation: Gtk.Orientation.HORIZONTAL,
                                halign: Gtk.Align.FILL,
                                valign: Gtk.Align.CENTER,
                            })}

                            {/* Forecast Row */}
                            <box class="forecast-row" spacing={16} halign={Gtk.Align.CENTER}>
                                {forecastItems}
                            </box>
                        </box>
                    );
                }}
            </With>
        </box>
    );
}
