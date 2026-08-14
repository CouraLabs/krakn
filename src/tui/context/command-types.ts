export type Command = {
  name: string, 
  aliases?: string[],
  description: string,
  args: () => string,
  execute: <TArgs>(args: TArgs) => void
}