import { useContext, useEffect, useRef, useState } from "react"
import { useKeyboard } from "@opentui/react";
import type { TextareaRenderable } from "@opentui/core";
import { AppContext } from "../../context/appContext";
import { HarnessContext } from "../../context/harnessContext";
import { icons } from "../../shared/icons";
import { Spinner } from "../Spinner";

type PromptRole = "prompt" | "command" | "bash";

const roleOf = (value: string): PromptRole => {
  const first = value[0];
  if (first === "/") return "command";
  if (first === "!") return "bash";
  return "prompt";
};

export const Prompt = () => {
  const { action, working, currentModel } = useContext(HarnessContext);
  const { theme } = useContext(AppContext);
  const { abort, prompt } = action;
  const textareaRef = useRef<TextareaRenderable | null>(null);

  const [role, setRole] = useState<PromptRole>("prompt");

  useEffect(() => {
    queueMicrotask(() => textareaRef.current?.focus());
  }, []);

  useKeyboard((key) => {
    if (key.name === "escape") {
      void abort();
    }
  });

  const refreshRole = () => {
    setRole(roleOf(textareaRef.current?.plainText ?? ""));
  };

  const handleSubmit = async () => {
    const value = textareaRef.current?.plainText ?? "";
    const trimmed = value.trim();
    if (!trimmed) return;

    switch (role) {
      case "command": {
        break;
      }
      case "bash": {
        break;
      }
      default:
        await prompt(value);
    }

    textareaRef.current?.clear();
    textareaRef.current?.focus();
    setRole("prompt");
  };

  const title = role === "command" ? " Command " : role === "bash" ? " Bash " : " Prompt ";
  const titleColor = role === "command"
    ? theme.primary : role === "bash"
    ? theme.warning : theme.text;

  return (
    <box id="prompt-wrapper" flexDirection="column">
      {working && <Spinner label="Thinking" />}
      <box
        id="prompt-composer"
        flexDirection="row"
        flexShrink={0}
        border={["top", "bottom"]}
        borderColor={titleColor}
        borderStyle="heavy"
        title={title}
        titleAlignment="right"
        titleColor={titleColor}
      >
        <text fg={titleColor}>{icons.chevronBoldRight}</text>
        <textarea
          marginLeft={2}
          width={"100%"}
          minHeight={1}
          maxHeight={6}
          ref={textareaRef}
          focused
          placeholder="What are we building?"
          textColor={theme.text}
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
      <box flexDirection="row" gap={1}>
        <text fg={theme.textMuted}>{currentModel?.modelName}</text>
      </box>
    </box>
  )
}