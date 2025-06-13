{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";

    flake-parts = {
      url = "github:hercules-ci/flake-parts";
    };

    systems = {
      url = "systems";
    };

    ags = {
      url = "github:aylur/ags";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.astal = {
        url = "github:aylur/astal";
        inputs.nixpkgs.follows = "nixpkgs";
      };
    };
    matugen = {
      url = "github:InioX/matugen";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    image-hct = {
      url = "github:Neurarian/image-hct";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = inputs @ {
    self,
    nixpkgs,
    ags,
    systems,
    flake-parts,
    ...
  }: let
    mkPkgs = system:
      import nixpkgs {
        inherit system;
      };
    mkMatshellDeps = system: let
      pkgs = mkPkgs system;
      agsPkgs = ags.packages.${system};
    in
      (with pkgs; [
        wrapGAppsHook
        gobject-introspection
        typescript
        dart-sass
        mission-center
        gnome-control-center
        imagemagick
        libgtop
      ])
      ++ (with agsPkgs; [
        io
        notifd
        apps
        hyprland
        wireplumber
        mpris
        network
        tray
        bluetooth
        cava
        battery
        powerprofiles
      ]);

    # Create a static map for all systems.
    # Required for deprecated hm-module options. TODO: Remove after grace period.
  in
    flake-parts.lib.mkFlake {inherit inputs;} {
      systems = import systems;

      perSystem = {system, ...}: let
        pkgs = mkPkgs system;
      in {
        packages.default = let
          matshell-bundle = ags.lib.bundle {
            inherit pkgs;
            name = "matshell";
            src = builtins.path {
              path = ./.;
            };
            entry = "app.ts";
            gtk4 = true;
            extraPackages = (mkMatshellDeps system) ++ [ags.packages.${system}.default];
          };
        in
          pkgs.runCommand "copy-matshell-styles" {
            nativeBuildInputs = [pkgs.makeWrapper];
          } ''
            mkdir -p $out/bin

            # Copy the bundled app
            cp -r ${matshell-bundle}/* $out/

            # Create a wrapper script for matshell to copy files that require mutability out of the store
            mv $out/bin/matshell $out/bin/.matshell-unwrapped

            makeWrapper $out/bin/.matshell-unwrapped $out/bin/matshell \
              --run 'STYLE_DIR="$HOME/.config/ags/style"
                     ICONS_DIR="$HOME/.config/ags/assets/icons"

                     # Check if either directory needs to be set up
                     if [ ! -d "$STYLE_DIR" ] || [ ! -d "$ICONS_DIR" ]; then
                       # Create necessary directories
                       mkdir -p "$STYLE_DIR"
                       mkdir -p "$ICONS_DIR"

                       # Copy style files if source exists and destination is empty
                       if [ -d "'"$out"'/share/style" ]; then
                         cp -r "'"$out"'/share/style/"* "$STYLE_DIR/"
                         echo "Installed Matshell styles to $STYLE_DIR"
                       fi

                       # Copy icon files if source exists and destination is empty
                       if [ -d "'"$out"'/share/assets/icons" ]; then
                         cp -r "'"$out"'/share/assets/icons/"* "$ICONS_DIR/"
                         echo "Installed Matshell icons to $ICONS_DIR"
                       fi

                       # Make copied files writable by the user
                       find "$HOME/.config/ags" -type d -exec chmod 755 {} \;
                       find "$HOME/.config/ags" -type f -exec chmod 644 {} \;
                     fi'
          '';
        apps.default = {
          type = "app";
          program = "${self.packages.${system}.default}/bin/matshell";
        };

        devShells.default = pkgs.mkShell {
          inputsFrom = builtins.attrValues {
            inherit (self.packages.${system}) default;
          };
        };
      };

      flake = {
        homeManagerModules = {
          default = self.homeManagerModules.matshell;
          matshell = import ./nix/hm-module.nix self;
        };
      };
    };
}
