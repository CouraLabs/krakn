import { createEffect, createMemo, createSignal, Show, type Component } from "solid-js"
import { useAgentStore } from "../../../hooks/agent-provider";
import { useAppStore } from "../../../hooks/app-provider";
import { useKeyboard } from "@opentui/solid";
import { BusyLine } from "./BusyLine";
import { sessionStats } from "../../../libs/usageMapper";
import type { TextareaRenderable } from "@opentui/core";
import { icons } from "../../icons";
import {
  actionContent,
  findCommand,
  openActionBox,
  closeActionBox,
  shortcutKeyToCommand,
  type CommandContext,
} from "../../../libs/commands";

type PromptRole = "prompt" | "command" | "bash";

const roleOf = (value: string): PromptRole => {
  const first = value[0];
  if (first === "/") return "command";
  if (first === "!") return "bash";
  return "prompt";
};

export const Prompt: Component<{}> = () => {
  const { state: agentState, actions } = useAgentStore();
  const { theme } = useAppStore();
  let textareaRef: TextareaRenderable | undefined;

  const [role, setRole] = createSignal<PromptRole>("prompt");

  const commandCtx: CommandContext = {
    openActionBox,
    closeActionBox,
    exit: () => actions.exit(),
  };

  // When the ActionBox closes, return focus to the composer. The theme picker
  // takes focus while the dialog is open, so it must be handed back on close.
  createEffect(() => {
    if (!actionContent()) {
      queueMicrotask(() => textareaRef?.focus());
    }
  });

  useKeyboard((key) => {
    // Keyboard shortcuts that execute commands (e.g. ctrl+t -> /themes).
    const shortcutCommand = shortcutKeyToCommand(key);
    if (shortcutCommand) {
      key.preventDefault();
      shortcutCommand.run(commandCtx);
      return;
    }

    if (key.name === "escape") {
      // While the ActionBox is open, escape only closes it — it must never
      // abort an in-flight LLM execution.
      if (actionContent()) {
        key.preventDefault();
        closeActionBox();
        return;
      }
      void actions.abort();
    }
  });

  const refreshRole = () => {
    setRole(roleOf(textareaRef?.plainText ?? ""));
  };

  const handleSubmit = () => {
    const value = textareaRef?.plainText ?? "";
    const trimmed = value.trim();
    if (!trimmed) return;

    switch (role()) {
      case "command": {
        const name = (trimmed.slice(1).split(/\s+/)[0] ?? "").toLowerCase();
        const command = findCommand(name);
        if (command) {
          command.run(commandCtx);
          textareaRef?.clear();
          textareaRef?.focus();
          setRole("prompt");
          return;
        }
        actions.notice(`Unknown command: /${name}`);
        break;
      }
      case "bash": {
        void actions.bash(trimmed.slice(1));
        break;
      }
      default:
        void actions.prompt(value);
    }

    textareaRef?.clear();
    textareaRef?.focus();
    setRole("prompt");
  };

  const statusLine = createMemo(() => sessionStats(agentState().stats))

  const title = () => role() === "command" ? " Command " : role() === "bash" ? " Bash " : " Prompt ";
  const titleColor = () => role() === "command"
    ? theme().primary : role() === "bash"
    ? theme().warning : theme().text;

  return (
    <box
      id="center"
      flexDirection="column"
    >
      <Show when={agentState().busy}>
        <BusyLine />
      </Show>
      <box
        id="center-composer"
        flexDirection="column"
        flexShrink={0}
        border={["top", "bottom"]}
        borderColor={titleColor()}
        borderStyle="heavy"
        title={title()}
        titleAlignment="right"
        titleColor={titleColor()}
        paddingLeft={2}
        paddingRight={1}
      >
        <textarea
          width={"100%"}
          minHeight={1}
          maxHeight={6}
          ref={(el) => {
            textareaRef = el;
            el.focus();
          }}
          focused
          placeholder="Ahoy, cap'n! Black Pearl at anchor, crew ready, what ya have on spyglass?"
          textColor={theme().text}
          keyBindings={[
            { name: "return", action: "submit" },
            { name: "kpenter", action: "submit" },
            { name: "return", shift: true, action: "newline" },
            { name: "kpenter", shift: true, action: "newline" },
          ]}
          onContentChange={refreshRole}
          onSubmit={handleSubmit}
        />
      </box>
      <text position="absolute" top={1} fg={titleColor()}>{icons.chevronbigRight}</text>
      <Show when={!!agentState()}>
        <box flexDirection="row" gap={1}>
          <text fg={theme().textMuted}>{statusLine()}</text>
        </box>
      </Show>
    </box>
  )
}
