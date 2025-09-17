export interface WeatherCondition {
  FeelsLikeC: string;
  FeelsLikeF: string;
  humidity: string;
  tempC: string; // normalized
  tempF: string;
  time?: string;
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
