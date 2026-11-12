import { Text, View, Button } from "tamagui";
import { ArrowLeft } from "@tamagui/lucide-icons";
import { COLORS } from "./theme";
import { useRouter } from "expo-router";
import { useGameSessionStore } from "../state/gameSessionStore";

const BackIconButton = ({ onBack }: { onBack?: () => void }) => {
  const router = useRouter();
  const clearSession = useGameSessionStore((s) => s.clearSession);

  const handleBack = () => {
    clearSession();
    router.replace("/");
  };

  return (
    <Button
      bordered
      onPress={onBack || handleBack}
      style={{
        height: 30,
        width: 30,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
        padding: 0,
      }}
      icon={<ArrowLeft color={COLORS.light} size={18} />}
    />
  );
};

export const Page = ({
  title,
  subtitle,
  showBack = true,
  onBack,
  headerRight,
  children,
}: {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  // Shown at the right end of the top bar, e.g. the host's players menu
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) => {
  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 40,
        alignItems: "center",
        marginTop: 20,
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 340,
          alignSelf: "center",
          flexDirection: "row",
          alignItems: "center",
          marginTop: 10,
          marginBottom: 20,
        }}
      >
        {showBack ? <BackIconButton onBack={onBack} /> : null}
        <View style={{ flex: 1 }} />
        {headerRight}
      </View>

      <Text
        style={{
          color: COLORS.light,
          fontSize: 44,
          fontWeight: "900",
          letterSpacing: -0.5,
          marginBottom: 20,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          style={{
            color: COLORS.light,
            fontSize: 16,
            fontWeight: "700",
            opacity: 0.85,
            marginTop: -10,
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          {subtitle}
        </Text>
      )}
      {children}
    </View>
  );
};
