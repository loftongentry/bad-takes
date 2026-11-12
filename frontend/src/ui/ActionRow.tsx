import type { ReactNode } from "react";
import { View } from "tamagui";

// Full-width row under a page's main content, typically holding a PrimaryButton
export const ActionRow = ({ children }: { children: ReactNode }) => {
  return <View style={{ width: "100%", maxWidth: 340, marginTop: 22 }}>{children}</View>;
};
