import { createBinding, createComputed, For, With } from "ags";
import { Gtk } from "ags/gtk4";
import { PickerCoordinator } from "utils/picker/PickerCoordinator";
import { WallpaperItem } from "utils/picker/types";
import { ItemButton } from "./ItemButton";
import { WallpaperGrid } from "./WallpaperGrid";

interface ResultsRendererProps {
  picker: PickerCoordinator;
}

export function ResultsRenderer({ picker }: ResultsRendererProps) {
  const hasQuery = createBinding(picker, "hasQuery");
  const isLoading = createBinding(picker, "isLoading");
  const hasResults = createBinding(picker, "hasResults");

  const viewState = createComputed([hasQuery, isLoading, hasResults], () => {
    if (!hasQuery.get()) return "empty";
    if (isLoading.get()) return "loading";
    if (hasResults.get()) return "results";
    return "not-found";
  });

  return (
    <box orientation={Gtk.Orientation.VERTICAL}>
      <box
        cssClasses={["results-container"]}
        orientation={Gtk.Orientation.VERTICAL}
      >
        <With value={hasResults}>
          {(results) => results && <ActionBar picker={picker} />}
        </With>
        <With value={viewState}>
          {(state) => {
            switch (state) {
              case "loading":
                return <LoadingState />;
              case "results":
                return <ResultsContainer picker={picker} />;
              case "not-found":
                return <NotFoundState query={picker.searchText} />;
              default:
                return <box />;
            }
          }}
        </With>
      </box>
    </box>
  );
}

function LoadingState() {
  return (
    <box
      halign={Gtk.Align.CENTER}
      cssClasses={["loading-state"]}
      orientation={Gtk.Orientation.VERTICAL}
    >
      <label label="Loading..." />
    </box>
  );
}

function ResultsContainer({ picker }: { picker: PickerCoordinator }) {
  const currentResults = createBinding(picker, "currentResults");
  const config = picker.currentConfig;

  if (config?.component === "grid") {
    return (
      <box cssClasses={["results-grid"]}>
        <With value={currentResults}>
          {(items) => (
            <WallpaperGrid items={items as WallpaperItem[]} picker={picker} />
          )}
        </With>
      </box>
    );
  }

  // Default to list
  return (
    <box
      cssClasses={["results-list"]}
      orientation={Gtk.Orientation.VERTICAL}
      spacing={4}
    >
      <For each={currentResults}>
        {(item) => <ItemButton item={item} picker={picker} />}
      </For>
    </box>
  );
}

function NotFoundState({ query }: { query: string }) {
  return (
    <box
      halign={Gtk.Align.CENTER}
      cssClasses={["not-found"]}
      orientation={Gtk.Orientation.VERTICAL}
    >
      <image iconName="system-search-symbolic" />
      <label label={`No results found for "${query}"`} />
    </box>
  );
}

function ActionBar({ picker }: { picker: PickerCoordinator }) {
  const config = picker.currentConfig;
  const hasActions = config?.features?.refresh || config?.features?.random;

  if (!hasActions) {
    return <box />;
  }

  return (
    <box cssClasses={["action-bar"]} spacing={8}>
      {config?.features?.refresh && (
        <button
          cssClasses={["action-button"]}
          onClicked={() => picker.refreshCurrentProvider()}
        >
          <label label="Refresh" cssClasses={["action-icon"]} />
        </button>
      )}

      <box hexpand />

      {config?.features?.random && (
        <button
          cssClasses={["action-button"]}
          onClicked={() => picker.randomFromCurrentProvider()}
        >
          <label label="Shuffle" cssClasses={["action-icon"]} />
        </button>
      )}
    </box>
  );
}
