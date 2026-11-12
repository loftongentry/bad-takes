import type { ReactNode } from "react";
import { TouchableOpacity } from "react-native";
import { View } from "tamagui";

export const VoteButton = ({
  icon,
  color,
  onPress,
  disabled,
}: {
  icon: ReactNode;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) => (
  <TouchableOpacity activeOpacity={0.8} onPress={onPress} disabled={disabled}>
    <View
      style={{
        backgroundColor: color,
        width: 140,
        height: 140,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: color,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
      }}
    >
      {icon}
    </View>
  </TouchableOpacity>
);
