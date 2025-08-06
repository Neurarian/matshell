#!/bin/bash
set -euo pipefail

if [ ! -d ~/Pictures/wallpapers/ ]; then
  wallpaper_path="$HOME/.config/ags/assets/default_wallpaper"}
  echo "Required directory: $HOME/Pictures/wallpapers not found. Fallback to default wallpaper"
else
  wallpaper_path="$(fd . "$HOME/Pictures/wallpapers" -t f | shuf -n 1)"
fi

apply_hyprpaper() {
  # Preload the wallpaper
  hyprctl hyprpaper preload "$wallpaper_path"

  # Set wallpaper for each monitor
  hyprctl monitors | rg 'Monitor' | awk '{print $2}' | while read -r monitor; do
  hyprctl hyprpaper wallpaper "$monitor, $wallpaper_path"
  done
}

if [ "$(image-hct "$wallpaper_path" tone)" -gt 60 ]; then
  mode="light"
else
  mode="dark"
fi

if [ "$(image-hct "$wallpaper_path" chroma)" -lt 20 ]; then
  scheme="scheme-neutral"
else
  scheme="scheme-vibrant"
fi

# Set Material colortheme
matugen -t "$scheme" -m "$mode" image "$wallpaper_path"

# Write mode and scheme to the matugen variables SCSS file
matugen_scss_file="$HOME/.config/ags/style/abstracts/_theme_variables_matugen.scss"

{
  echo ""
  echo "/* Theme mode and scheme variables */"
  if [ "$mode" = "dark" ]; then
    echo "\$darkmode: true;"
  else
    echo "\$darkmode: false;"
  fi
  echo "\$material-color-scheme: \"$scheme\";"
} > "$matugen_scss_file"

# unload previous wallpaper
hyprctl hyprpaper unload all

# Set the new wallpaper
apply_hyprpaper

# Send wallpaper image notification
newwall=$(basename "$wallpaper_path")
notify-send "Colors and Wallpaper updated" "with image: $newwall"

echo "DONE!"
