self: {
  config,
  pkgs,
  inputs,
  system,
  lib,
  ...
}: let
  # New bundled configuration
  cfgNew = config.programs.matshell;

  # Old configuration for temporary backward compatibility
  cfgOld = config.programs.ags.matshell;

  agsPkgs = inputs.ags.packages.${system};
  dependencies = self.matshellDeps.${system};

  # Wallpaper setter script
  wal_set = pkgs.writeShellApplication {
    name = "wal_set";
    runtimeInputs = with pkgs; [
      hyprpaper
      fd
      ripgrep
      libnotify
      gawk
      coreutils
      inputs.matugen.packages.${system}.default
      inputs.image-hct.packages.${system}.default
    ];
    text = ''
      #!/bin/bash
      set -euo pipefail

      if [ ! -d ~/Pictures/wallpapers/ ]; then
        wallpaper_path=${builtins.toString ../assets/default_wallpaper}
        echo "Required directory: $HOME/Pictures/wallpapers not found. Fallback to default wallpaper"
      else
        wallpaper_path="$(fd . "$HOME/Pictures/wallpapers" -t f | shuf -n 1)"
      fi

      apply_hyprpaper() {
        # Preload the wallpaper once, since it doesn't change per monitor
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

      # Get wallpaper image name & send notification
      newwall=$(basename "$wallpaper_path")
      notify-send "Colors and Wallpaper updated" "with image: $newwall"

      echo "DONE!"
    '';
  };
in {
  imports = [
    inputs.ags.homeManagerModules.default
  ];

  options = {
    # Use own namespace for bundled app now
    programs.matshell = {
      enable = lib.mkEnableOption "MatShell desktop shell (bundled version)";

      package = lib.mkOption {
        type = lib.types.package;
        default = self.packages.${system}.default;
        description = "The bundled MatShell package to use.";
      };

      autostart = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = "Whether to start MatShell automatically.";
      };

      # Keep these options in the new namespace
      matugenThemeSetter = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = "Enable custom wallpaper setter using matugen theming.";
      };

      matugenConfig = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = "Generate required matugen templates & config.";
      };
    };

    # Old config options with deprecation warnings TODO: Delete these after grace period
    programs.ags.matshell = {
      enable = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = lib.mdDoc ''
          DEPRECATED: Use programs.matshell.enable instead.
          Enable MatShell (old unbundled version).
        '';
      };

      service = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = lib.mdDoc ''
          DEPRECATED: Use programs.matshell.autostart instead.
          Enable MatShell service (old unbundled version).
        '';
      };

      matugenThemeSetter = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = lib.mdDoc ''
          DEPRECATED: Use programs.matshell.matugenThemeSetter instead.
          Enable custom wallpaper setter using matugen theming.
        '';
      };

      matugenConfig = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = lib.mdDoc ''
          DEPRECATED: Use programs.matshell.matugenConfig instead.
          Generate required matugen templates & config.
        '';
      };
    };
  };

  config = lib.mkMerge [
    # New implementation
    (lib.mkIf cfgNew.enable {
      home.packages =
        [cfgNew.package]
        # Add theme setter if enabled
        ++ lib.optionals cfgNew.matugenThemeSetter [wal_set];

      # Systemd service for matshell autostart
      systemd.user.services.matshell = lib.mkIf cfgNew.autostart {
        Unit = {
          Description = "Matshell";
          PartOf = ["graphical-session.target"];
          After = ["graphical-session.target"];
        };

        Service = {
          ExecStart = "${cfgNew.package}/bin/matshell";
          Restart = "on-failure";
        };

        Install = {
          WantedBy = ["graphical-session.target"];
        };
      };

      # Add matugen config if enabled
      home.file.".config/matugen/config.toml".text = let
        gtkTemplate = builtins.path {path = ../matugen/templates/gtk.css;};
        agsTemplate = builtins.path {path = ../matugen/templates/ags.scss;};
        hyprTemplate = builtins.path {path = ../matugen/templates/hyprland_colors.conf;};
        hyprlockTemplate = builtins.path {path = ../matugen/templates/hyprlock_colors.conf;};
      in
        lib.mkIf cfgNew.matugenConfig ''
          [templates.gtk3]
          input_path = "${gtkTemplate}"
          output_path = "~/.config/gtk-3.0/gtk.css"

          [templates.gtk4]
          input_path = "${gtkTemplate}"
          output_path = "~/.config/gtk-4.0/gtk.css"

          [templates.ags]
          input_path = "${agsTemplate}"
          output_path = "~/.config/ags/style/abstracts/_variables.scss"

          [templates.hypr]
          input_path = "${hyprTemplate}"
          output_path = "~/.config/hypr/hyprland_colors.conf"

          [templates.hyprlock]
          input_path = "${hyprlockTemplate}"
          output_path = "~/.config/hypr/hyprlock_colors.conf"

          [config.custom_colors]
        '';
    })

    # Old implementation TODO: Delete these after grace period
    (lib.mkIf cfgOld.enable {
      # Deprecation warnings
      warnings = [
        "programs.ags.matshell is deprecated. Please use programs.matshell instead for the bundled version."
      ];

      programs.ags = {
        enable = true;
        package = agsPkgs.ags.override {
          extraPackages = dependencies;
        };
      };

      home.activation.cloneMatshell = let
        dest = "${config.xdg.configHome}/ags";
        repo = "https://github.com/Neurarian/matshell/";
      in
        lib.hm.dag.entryAfter ["writeBoundary"]
        ''
          if [ ! -d "${dest}" ]; then
            echo "Cloning matshell repository..."
            ${pkgs.git}/bin/git clone --depth 1 ${repo} "${dest}"
          else
            echo "Skipping matshell clone (${dest} already exists)"
          fi
        '';

      systemd.user.services.ags = lib.mkIf cfgOld.service {
        Unit = {
          Description = "Aylur's Gtk Shell: Matshell";
          PartOf = [
            "tray.target"
            "graphical-session.target"
          ];
        };
        Service = let
          ags = "${config.programs.ags.package}/bin/ags";
        in {
          ExecStart = "${ags} run --gtk4";
          ExecReload = "${ags} quit && ${ags} run --gtk4";
          Restart = "on-failure";
          KillMode = "mixed";
        };
        Install.WantedBy = ["graphical-session.target"];
      };

      home.packages = lib.mkIf cfgOld.matugenThemeSetter [wal_set];

      home.file.".config/matugen/config.toml".text = let
        gtkTemplate = builtins.path {path = ../matugen/templates/gtk.css;};
        agsTemplate = builtins.path {path = ../matugen/templates/ags.scss;};
        hyprTemplate = builtins.path {path = ../matugen/templates/hyprland_colors.conf;};
        hyprlockTemplate = builtins.path {path = ../matugen/templates/hyprlock_colors.conf;};
      in
        lib.mkIf cfgOld.matugenConfig ''
          [templates.gtk3]
          input_path = "${gtkTemplate}"
          output_path = "~/.config/gtk-3.0/gtk.css"

          [templates.gtk4]
          input_path = "${gtkTemplate}"
          output_path = "~/.config/gtk-4.0/gtk.css"

          [templates.ags]
          input_path = "${agsTemplate}"
          output_path = "~/.config/ags/style/abstracts/_variables.scss"

          [templates.hypr]
          input_path = "${hyprTemplate}"
          output_path = "~/.config/hypr/hyprland_colors.conf"

          [templates.hyprlock]
          input_path = "${hyprlockTemplate}"
          output_path = "~/.config/hypr/hyprlock_colors.conf"

          [config.custom_colors]
        '';
    })
  ];
}
