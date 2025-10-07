self: inputs: {
  config,
  lib,
  pkgs,
  ...
}: let
  cfg = config.programs.matshell;
in {
  imports = [
    inputs.ags.homeManagerModules.default
  ];

  options = {
    programs.matshell = {
      enable = lib.mkEnableOption "matshell desktop shell";

      compositor = lib.mkOption {
        type = lib.types.enum ["hyprland" "river"];
        default = "hyprland";
        description = "Which Wayland compositor to build matshell for.";
      };

      package = lib.mkOption {
        type = lib.types.package;
        default =
          if cfg.compositor == "river"
          then self.packages.${pkgs.stdenv.hostPlatform.system}.matshell-river
          else self.packages.${pkgs.stdenv.hostPlatform.system}.matshell-hyprland;
        description = "The bundled matshell package to install.";
      };
    };

    autostart = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = "Whether to start matshell automatically.";
    };

    matugenConfig = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = "Generate required matugen templates & config.";
    };
  };

  config = lib.mkIf cfg.enable {
    home.packages = [cfg.package];

    systemd.user.services.matshell = lib.mkIf cfg.autostart {
      Unit = {
        Description = "Matshell";
        PartOf = ["graphical-session.target"];
        After = ["graphical-session.target"];
      };

      Service = {
        ExecStart = "${cfg.package}/bin/matshell";
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
      lib.mkIf cfg.matugenConfig ''
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
  };
}
