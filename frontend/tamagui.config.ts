import { defaultConfig } from "@tamagui/config/v4";
import { createTamagui } from "tamagui";

const config = createTamagui(defaultConfig);

export default config;

export type Conf = typeof config;

declare module "tamagui" {
  // Tamagui's required way to register this config's types; it's empty on purpose
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends Conf {}
}
