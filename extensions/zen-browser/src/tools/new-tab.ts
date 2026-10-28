import { Tool } from "@raycast/api";
import { newTabTarget, openNewTab } from "../actions";

type Input = {
  /** Text to search for in the new tab. Omit to open an empty tab. */
  searchText?: string;
};

/**
 * Opening a tab navigates the user's browser, so the user confirms the exact query or URL
 * before anything happens. An empty new tab has no side-effects and needs no confirmation.
 */
export const confirmation: Tool.Confirmation<Input> = async ({ searchText }) => {
  const query = searchText?.trim();
  if (!query) return undefined;
  const target = newTabTarget(query);
  return {
    message: "Open a new Zen Browser tab with this search?",
    info: [
      { name: "Search", value: query },
      { name: "URL", value: target !== query ? target : undefined },
    ],
  };
};

const tool = async ({ searchText }: Input) => {
  await openNewTab(searchText ? searchText : "");
};

export default tool;
