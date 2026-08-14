import { createEffect, createMemo, createSignal, Show, type Component } from "solid-js"
import { useKeyboard } from "@opentui/solid";
import type { TextareaRenderable } from "@opentui/core";
import { useTui } from "../../hooks/useTui";
import { useHarness } from "../../hooks/useHarness";
import { icons } from "../../shared/icons";

type PromptRole = "prompt" | "command" | "bash";

const roleOf = (value: string): PromptRole => {
  const first = value[0];
  if (first === "/") return "command";
  if (first === "!") return "bash";
  return "prompt";
};

export const Prompt: Component<{}> = () => {
  const { abort, prompt, working } = useHarness();
  const { theme } = useTui();
  let textareaRef: TextareaRenderable | undefined;

  const [role, setRole] = createSignal<PromptRole>("prompt");

  createEffect(() => {
    queueMicrotask(() => textareaRef?.focus());
  });

  useKeyboard((key) => {
    if (key.name === "escape") {
      void abort();
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
        break;
      }
      case "bash": {
        break;
      }
      default:
        void prompt(value);
    }

    textareaRef?.clear();
    textareaRef?.focus();
    setRole("prompt");
  };

  const title = () => role() === "command" ? " Command " : role() === "bash" ? " Bash " : " Prompt ";
  const titleColor = () => role() === "command"
    ? theme().primary : role() === "bash"
    ? theme().warning : theme().text;

  return (
    <box
      id="center"
      flexDirection="column"
    >
      <Show when={working()}>
        <spinner name="dots4" /><text>Thinking...</text>
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
      <text position="absolute" top={1} fg={titleColor()}>{icons.chevronBoldRight}</text>
      <Show when={true}>
        <box flexDirection="row" gap={1}>
          <text fg={theme().textMuted}>Model - Input - Output - Cache - Cost</text>
        </box>
      </Show>
    </box>
  )
}
