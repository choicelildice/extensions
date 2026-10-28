import { Action, ActionPanel, closeMainWindow, Icon, open, popToRoot, showToast, Toast } from "@raycast/api";
import { HistoryEntry, WorkspaceEntry } from "../interfaces";
import { openWorkspace, openNewTab, newTabPowerShellScript, newTabTarget, openUrlPowerShellScript } from "../actions";
import { platform } from "os";
import { runPowerShellScript } from "@raycast/utils";

export class ZenActions {
  public static NewTab = NewTabAction;
  public static HistoryItem = HistoryItemAction;
  public static WorkspaceItem = WorkspaceItemAction;
}

function NewTabAction({ query }: { query?: string }) {
  return (
    <ActionPanel title="New Tab">
      <Action
        title="Open with Zen"
        onAction={async () => {
          const target = newTabTarget(query);
          const usesExplicitEngine = target !== (query ?? "");
          if (!usesExplicitEngine) {
            if (platform() === "win32") {
              await runPowerShellScript(newTabPowerShellScript(query));
            } else {
              // Raycast's open() rejects bare search terms, so hand the query to Zen itself.
              await openNewTab(query ?? "");
            }
            await popToRoot();
            await closeMainWindow();
            return;
          }
          if (platform() === "win32") {
            await runPowerShellScript(openUrlPowerShellScript(target));
          } else {
            open(target, "zen");
          }
        }}
      />
    </ActionPanel>
  );
}

function HistoryItemAction({ entry: { title, url } }: { entry: HistoryEntry }) {
  return (
    <ActionPanel title={title}>
      <Action
        title="Open with Zen"
        onAction={async () => {
          if (platform() === "win32") {
            await runPowerShellScript(openUrlPowerShellScript(url));
          } else {
            open(url, "zen");
          }
        }}
      />
      <Action.OpenInBrowser title="Open in Default Browser" url={url} shortcut={{ modifiers: ["opt"], key: "enter" }} />
      <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
    </ActionPanel>
  );
}

function WorkspaceItemAction(props: { workspace: WorkspaceEntry }) {
  return (
    <ActionPanel title={props.workspace.name}>
      <ZenGoToWorkspace workspace={props.workspace} />
      <Action.Open title="Change Shortcut in Keyboard Shortcuts" target={"about:preferences"} application={"Zen"} />
    </ActionPanel>
  );
}

function ZenGoToWorkspace(props: { workspace: WorkspaceEntry }) {
  return (
    <Action
      title="Open Workspace"
      icon={Icon.AppWindowSidebarLeft}
      onAction={async () => {
        try {
          await openWorkspace(props.workspace);
        } catch (e) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not open workspace",
            message: e instanceof Error ? e.message : String(e),
          });
          return;
        }
        popToRoot();
        closeMainWindow();
      }}
    />
  );
}
