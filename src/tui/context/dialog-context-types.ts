import type { Accessor } from "solid-js";
import type { JSX } from "solid-js";
import type { DialogSize } from "../components/Dialog";

/** Accepted by `open`; decides how the dialog opens and behaves. */
export type DialogOpenOptions = {
  /** Title shown in the dialog header. Defaults to empty. */
  title?: string;
  /** Dialog size; defaults to "medium". */
  size?: DialogSize;
  /** JSX body rendered inside the dialog. */
  content: JSX.Element;
  /** Called when the dialog is dismissed (X button, cancel, Escape, or overlay click). */
  onClose?: () => void;
};

export type DialogContextAction = {
  /** Open the dialog with the given options. */
  open: (options: DialogOpenOptions) => void;
  /** Dismiss the currently open dialog, invoking its `onClose`. */
  close: () => void;
};

export type DialogContextSelect = {
  /** Whether a dialog is currently open. */
  isOpen: Accessor<boolean>;
};