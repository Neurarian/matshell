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

    echo "Checking existing packages and installing missing dependencies..."

    declare -A CORE_DEPS=(
        ["ags"]="aylurs-gtk-shell-git"
        ["astal-hyprland"]="libastal-hyprland-git"
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
        ["libsoup"]="libsoup3"
        ["glib-networking"]="glib-networking"
        ["hyprland"]="hyprland"
        ["coreutils"]="coreutils"
        ["dart-sass"]="dart-sass"
        ["imagemagick"]="imagemagick"
        ["networkmanager"]="networkmanager"
        ["wireplumber"]="wireplumber"
        ["adwaita-icon-theme"]="adwaita-icon-theme"
        ["ttf-material-symbols-outlined"]="ttf-material-symbols-variable-git"
        ["ttf-fira-code-nerd"]="ttf-firacode-nerd"
    )

    declare -A OPTIONAL_DEPS=(
        ["bluez"]="bluez"
        ["bluez-utils"]="bluez-utils"
        ["gnome-control-center"]="gnome-control-center"
        ["mission-center"]="mission-center"
        ["overskride"]="overskride"
        ["pwvucontrol"]="pwvucontrol"
        ["upower"]="upower"
        ["brightnessctl"]="brightnessctl"
    )

    echo "Installing core dependencies..."
    for base_name in "${!CORE_DEPS[@]}"; do
        install_if_missing "${CORE_DEPS[$base_name]}" "$INSTALLER"
    done

    echo ""
    echo "Optional dependencies provide additional functionality:"
    echo "  • bluez/bluez-utils: Bluetooth support"
    echo "  • gnome-control-center: System settings panel"
    echo "  • mission-center: System monitor"
    echo "  • overskride: More advanced Bluetooth manager"
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
        echo "Skipping optional dependencies. You can install the ones you need later:"
        echo "  yay -S bluez bluez-utils gnome-control-center mission-center overskride pwvucontrol upower brightnessctl"
    fi

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

echo "Matshell installation and configuration complete!"
echo "Start with: ags run"

