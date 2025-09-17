// widgets/sidebar/modules/WeatherWidget.tsx
import { Gtk } from "ags/gtk4";
import { With } from "ags";
import {
  formatBlockTime,
  getIcon,
  getRelativeForecasts,
  WeatherService,
  WeatherCondition,
} from "utils/weather";

/** ---------- Components ---------- **/
interface ExtraWeatherInfoProps {
  icon: string;
  value: string;
}

interface ForecastItemProps {
  block: WeatherCondition;
}

function ExtraWeatherInfoBox({ icon, value }: ExtraWeatherInfoProps) {
  return (
    <box
      orientation={Gtk.Orientation.HORIZONTAL}
      spacing={10}
      halign={Gtk.Align.FILL}
      valign={Gtk.Align.CENTER}
    >
      <label label={icon} class={"weather-extra-icon"} />
      <label label={value} hexpand halign={Gtk.Align.END} />
    </box>
  );
}
function ForecastItem({ block }: ForecastItemProps) {
  const icon = getIcon(block.weatherDesc?.[0]?.value ?? "");
  const temp = block.tempC ?? "?"; // Use tempC from API
  const time = formatBlockTime(block.time ?? "0");

  return (
    <box
      class="forecast-item"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={2}
    >
      <label label={time} class="forecast-hour" />
      <label label={icon} class="forecast-icon" />
      <label label={`${temp}°`} class="forecast-temp" />
    </box>
  );
}

/** ---------- Weather Widget ---------- **/
export default function WeatherWidget() {
  return (
    <box
      class="weather-widget"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={6}
    >
      <With value={WeatherService.weather}>
        {(data) => {
          if (!data || !data.current) {
            return (
              <label label="Loading weather..." halign={Gtk.Align.CENTER} />
            );
          }

          const current = data.current;
          const relativeForecasts = getRelativeForecasts(data);
          const forecastItems = relativeForecasts.map((block) => (
            <ForecastItem block={block} />
          ));

          const currentIcon = getIcon(current.weatherDesc?.[0]?.value ?? "");
          const currentTemp = current.tempC ?? "?";
          const wind = current.windspeedKmph ?? "?";
          const rainPct = current.precipitation ?? current.humidity ?? "?";

          const extraWeatherData = [
            { icon: "Thermometer", value: `${currentTemp}°C` },
            { icon: "Air", value: `${wind} km/h` },
            { icon: "Rainy", value: `${rainPct}%` },
          ];

          return (
            <box orientation={Gtk.Orientation.VERTICAL} spacing={6}>
              {/* Current weather */}
              <box
                class="current-weather"
                orientation={Gtk.Orientation.HORIZONTAL}
                spacing={16}
                valign={Gtk.Align.CENTER}
              >
                <box
                  orientation={Gtk.Orientation.VERTICAL}
                  halign={Gtk.Align.START}
                  spacing={2}
                >
                  <label label={currentIcon} class="current-icon" />
                  <label
                    label={current.weatherDesc?.[0]?.value ?? "Unknown"}
                    halign={Gtk.Align.CENTER}
                  />
                </box>
                <box
                  orientation={Gtk.Orientation.VERTICAL}
                  hexpand
                  valign={Gtk.Align.CENTER}
                  halign={Gtk.Align.END}
                  spacing={2}
                >
                  {extraWeatherData.map((item) => (
                    <ExtraWeatherInfoBox icon={item.icon} value={item.value} />
                  ))}
                </box>
              </box>

              <Gtk.Separator
                orientation={Gtk.Orientation.HORIZONTAL}
                halign={Gtk.Align.FILL}
                valign={Gtk.Align.CENTER}
              />

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
