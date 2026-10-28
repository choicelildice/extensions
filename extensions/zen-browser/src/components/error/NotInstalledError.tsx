import { useState } from "react";
import { ActionPanel, Action, Detail, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import { existsSync } from "fs";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const BREW_CANDIDATES = ["/opt/homebrew/bin/brew", "/usr/local/bin/brew"];
const INSTALL_TIMEOUT_MS = 10 * 60 * 1000;
import { DEFAULT_ERROR_TITLE, DownloadText } from "../../constants";

export function NotInstalledError() {
  const [isLoading, setIsLoading] = useState(false);
  return (
    <Detail
      actions={
        <ActionPanel>
          {!isLoading && (
            <Action
              title="Install with Homebrew"
              onAction={async () => {
                if (isLoading) return;

                setIsLoading(true);

                const toast = new Toast({ style: Toast.Style.Animated, title: "Installing..." });
                await toast.show();

                try {
                  const brew = BREW_CANDIDATES.find((candidate) => existsSync(candidate));
                  if (!brew) throw new Error("Homebrew not found");
                  await execFileAsync(brew, ["install", "--cask", "zen-browser"], { timeout: INSTALL_TIMEOUT_MS });
                  await toast.hide();
                } catch {
                  await toast.hide();
                  await showToast(
                    Toast.Style.Failure,
                    DEFAULT_ERROR_TITLE,
                    "An unknown error occurred while trying to install",
                  );
                }
                setIsLoading(false);
              }}
            />
          )}
        </ActionPanel>
      }
      markdown={DownloadText}
    />
  );
}
