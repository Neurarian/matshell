#!/bin/bash

repo="https://github.com/Neurarian/matshell/"
dest="$HOME/.config/ags/"

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if a package (or its variants) is installed
package_installed() {
    local package_name="$1"
    pacman -Qs "^${package_name}$" >/dev/null 2>&1 || \
    pacman -Qs "^${package_name}-git$" >/dev/null 2>&1 || \
    pacman -Qs "^${package_name}-bin$" >/dev/null 2>&1 || \
    pacman -Qs "^${package_name}-devel$" >/dev/null 2>&1
}

is_arch_based() {
    [ -f /etc/arch-release ] || [ -f /etc/artix-release ] || [ -f /etc/manjaro-release ] || command_exists pacman
}

install_if_missing() {
    local package="$1"
    local installer="$2"
    local base_name="${package%-git}"
    base_name="${base_name%-bin}"
    
    if package_installed "$base_name"; then
        echo "✓ $base_name (or variant) already installed, skipping..."
        return 0
    else
        echo "Installing $package..."
        echo "Running: $installer $package"
        if ! $installer "$package"; then
            echo "Warning: Failed to install $package, continuing..."
            return 1
        fi
        return 0
    fi
}

prompt_yes_no() {
    local prompt="$1"
    local default="$2"
    local response
    
    while true; do
        if [ "$default" = "y" ]; then
            echo -n "$prompt [Y/n]: "
        elif [ "$default" = "n" ]; then
            echo -n "$prompt [y/N]: "
        else
            echo -n "$prompt [y/n]: "
        fi
        
        read response
        
        # Use default if empty response
        if [ -z "$response" ]; then
            response="$default"
        fi
        
        case "$response" in
            [Yy]|[Yy][Ee][Ss])
                return 0
                ;;
            [Nn]|[Nn][Oo])
                return 1
                ;;
            *)
                echo "Please answer yes or no."
                ;;
        esac
    done
}

# Multiple choice prompt
prompt_choice() {
    local prompt="$1"
    shift
    local options=("$@")
    local choice
    
    echo "$prompt"
    for i in "${!options[@]}"; do
        echo "  $((i+1))) ${options[$i]}"
    done
    
    while true; do
        echo -n "Enter choice [1-${#options[@]}]: "
        read choice
        
        if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#options[@]}" ]; then
            return $((choice-1))
        else
            echo "Invalid choice. Please enter a number between 1 and ${#options[@]}."
        fi
    done
}

# Detect running compositor
detect_compositor() {
    if pgrep -x "Hyprland" > /dev/null; then
        echo "hyprland"
    elif pgrep -x "river" > /dev/null; then
        echo "river"
    else
        echo "none"
    fi
}

# Install dependencies on Arch-based systems
install_dependencies() {
    if ! is_arch_based; then
        echo "This dependency installation is only supported on Arch-based distributions."
        echo "Please install the dependencies manually for your distribution."
        return 0
    fi

    echo "Installing dependencies for Arch-based systems..."

    if command_exists yay; then
        local INSTALLER="yay -S --noconfirm"
        echo "Using yay for installation..."
    else
        echo "yay not found. Cannot install dependencies automatically."
        return 1
    fi

    echo ""
    echo "════════════════════════════════════════"
    echo "  Compositor Selection"
    echo "════════════════════════════════════════"
    
    local running_compositor=$(detect_compositor)
    local compositor_choice
    local compositor_lib
    
    if [ "$running_compositor" != "none" ]; then
        echo "Detected running compositor: $running_compositor"
        if prompt_yes_no "Use detected compositor ($running_compositor)?" "y"; then
            compositor_choice="$running_compositor"
        fi
    fi
    
    if [ -z "$compositor_choice" ]; then
        prompt_choice "Which compositor do you want to use?" "Hyprland" "River"
        local choice=$?
        if [ $choice -eq 0 ]; then
            compositor_choice="hyprland"
        else
            compositor_choice="river"
        fi
    fi
    
    echo "Selected compositor: $compositor_choice"
    
    # Set compositor library based on choice
    if [ "$compositor_choice" = "hyprland" ]; then
        compositor_lib="libastal-hyprland-git"
    else
        compositor_lib="libastal-river-git"
    fi

    echo ""
    echo "════════════════════════════════════════"
    echo "  Wallpaper Daemon Selection"
    echo "════════════════════════════════════════"
    echo ""
    echo "Choose wallpaper daemon:"
    echo "  • swww: More feature-rich, animations, GIF support"
    echo "  • hyprpaper: Simpler, lighter, Hyprland-specific"
    echo ""
    
    local wallpaper_choice
    prompt_choice "Which wallpaper daemon?" "swww" "hyprpaper" "Both (install both)"
    local wp_choice=$?
    
    case $wp_choice in
        0) wallpaper_choice="swww" ;;
        1) wallpaper_choice="hyprpaper" ;;
    esac
    
    echo "Selected wallpaper daemon: $wallpaper_choice"

    echo ""
    echo "════════════════════════════════════════"
    echo "  Installing Core Dependencies"
    echo "════════════════════════════════════════"
    
    declare -A CORE_DEPS=(
        ["ags"]="aylurs-gtk-shell-git"
        ["astal-tray"]="libastal-tray-git"
        ["astal-notifd"]="libastal-notifd-git"
        ["astal-apps"]="libastal-apps-git"
        ["astal-wireplumber"]="libastal-wireplumber-git"
        ["astal-mpris"]="libastal-mpris-git"
        ["astal-network"]="libastal-network-git"
        ["astal-bluetooth"]="libastal-bluetooth-git"
        ["astal-cava"]="libastal-cava-git"
        ["astal-battery"]="libastal-battery-git"
        ["astal-powerprofiles"]="libastal-powerprofiles-git"
        ["matugen"]="matugen-bin"
        ["libgtop"]="libgtop"
        ["libadwaita"]="libadwaita"
        ["libsoup"]="libsoup3"
        ["glib-networking"]="glib-networking"
        ["coreutils"]="coreutils"
        ["dart-sass"]="dart-sass"
        ["cliphist"]="cliphist"
        ["wl-clipboard"]="wl-clipboard"
        ["imagemagick"]="imagemagick"
        ["networkmanager"]="networkmanager"
        ["wireplumber"]="wireplumber"
        ["adwaita-icon-theme"]="adwaita-icon-theme"
        ["ttf-material-symbols-outlined"]="ttf-material-symbols-variable-git"
        ["ttf-fira-code-nerd"]="ttf-firacode-nerd"
    )

    # Install compositor-specific library
    CORE_DEPS["astal-compositor"]="$compositor_lib"
    
    # Install compositor if not already installed
    CORE_DEPS["compositor"]="$compositor_choice"
    
    # Install wallpaper daemon(s)
    if [ "$wallpaper_choice" = "swww" ]; then
        CORE_DEPS["wallpaper"]="swww"
    elif [ "$wallpaper_choice" = "hyprpaper" ]; then
        CORE_DEPS["wallpaper"]="hyprpaper"
    fi

    echo "Installing core dependencies..."
    for base_name in "${!CORE_DEPS[@]}"; do
        install_if_missing "${CORE_DEPS[$base_name]}" "$INSTALLER"
    done

    echo ""
    echo "════════════════════════════════════════"
    echo "  Optional Dependencies"
    echo "════════════════════════════════════════"
    
    declare -A OPTIONAL_DEPS=(
        ["bluez"]="bluez"
        ["bluez-utils"]="bluez-utils"
        ["gnome-control-center"]="gnome-control-center"
        ["resources"]="resources"
        ["overskride"]="overskride"
        ["pwvucontrol"]="pwvucontrol"
        ["upower"]="upower"
        ["brightnessctl"]="brightnessctl"
    )

    echo ""
    echo "Optional dependencies provide additional functionality:"
    echo "  • bluez/bluez-utils: Bluetooth support"
    echo "  • gnome-control-center: System settings panel"
    echo "  • resources: System monitor"
    echo "  • overskride: Advanced Bluetooth manager"
    echo "  • pwvucontrol: PipeWire volume control"
    echo "  • upower: Battery management"
    echo "  • brightnessctl: Screen brightness control"
    echo ""
    
    if prompt_yes_no "Install optional dependencies?" "y"; then
        echo "Installing optional dependencies..."
        for base_name in "${!OPTIONAL_DEPS[@]}"; do
            install_if_missing "${OPTIONAL_DEPS[$base_name]}" "$INSTALLER"
        done
    else
        echo "Skipping optional dependencies. You can install them later:"
        echo "  yay -S bluez bluez-utils gnome-control-center resources overskride pwvucontrol upower brightnessctl"
    fi

    echo ""
    echo "════════════════════════════════════════"
    echo "  Installation Summary"
    echo "════════════════════════════════════════"
    echo "Compositor: $compositor_choice"
    echo "Compositor Library: $compositor_lib"
    echo "Wallpaper Daemon: $wallpaper_choice"
    echo "════════════════════════════════════════"
    echo ""
    echo "Dependency installation complete!"
}

install_dependencies

# Clone matshell repository
if [ ! -d "${dest}" ]; then
  echo "Cloning matshell repository..."
  git clone --depth 1 "$repo" "$dest"
else
  echo "Skipping matshell clone ($dest already exists)"
fi

# Setup matugen configuration
matugen_config_dir="$HOME/.config/matugen"
matugen_config_file="$matugen_config_dir/config.toml"

echo "Setting up matugen configuration..."

if [ ! -d "$matugen_config_dir" ]; then
  echo "Creating matugen config directory..."
  mkdir -p "$matugen_config_dir"
fi

# Check if the configuration already exists
if [ -f "$matugen_config_file" ] && grep -q "\[templates\.gtk3\]" "$matugen_config_file"; then
  echo "Matugen configuration already exists, skipping..."
else
  echo "Adding matugen configuration..."
  cat >> "$matugen_config_file" << 'EOF'
[templates.gtk3]
input_path = "~/.config/ags/matugen/templates/gtk.css"
output_path = "~/.config/gtk-3.0/gtk.css"

[templates.gtk4]
input_path = "~/.config/ags/matugen/templates/gtk.css"
output_path = "~/.config/gtk-4.0/gtk.css"

[templates.ags]
input_path = "~/.config/ags/matugen/templates/ags.scss"
output_path = "~/.config/ags/style/abstracts/_variables.scss"

[templates.hypr]
input_path = "~/.config/ags/matugen/templates/hyprland_colors.conf"
output_path = "~/.config/hypr/hyprland_colors.conf"

[templates.hyprlock]
input_path = "~/.config/ags/matugen/templates/hyprlock_colors.conf"
output_path = "~/.config/hypr/hyprlock_colors.conf"
EOF
fi

echo ""
echo "════════════════════════════════════════"
echo "  Installation Complete!"
echo "════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Start matshell: ags run"
echo "  2. Configure your compositor settings"
echo "  3. Set a wallpaper with your chosen daemon"
echo ""
echo "For more information, visit:"
echo "  https://github.com/Neurarian/matshell"
echo "════════════════════════════════════════"

