export function formatBlockTime(t: string) {
  // wttr.in returns "0", "300", "600", etc.
  const hour = Math.floor(parseInt(t, 10) / 100);
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric" });
}

export function getIcon(desc: string) {
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
