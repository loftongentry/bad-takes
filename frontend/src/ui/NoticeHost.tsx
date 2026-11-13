import { StyleSheet, Text, View } from "react-native";
import { Dialog } from "tamagui";
import { useNoticeStore } from "../state/noticeStore";
import { NoticeDialog } from "./soapbox/NoticeDialog";
import { SoapboxButton } from "./soapbox/SoapboxButton";
import { FONTS, SOAPBOX } from "./soapbox/tokens";

// Shows the current notice (see noticeStore) over whatever screen is up. Rendered once, in the
// root layout, so a notice survives the screen changing underneath it (e.g. being sent home).
export const NoticeHost = () => {
  const notice = useNoticeStore((s) => s.notice);
  const dismissNotice = useNoticeStore((s) => s.dismissNotice);

  return (
    <Dialog modal open={!!notice} onOpenChange={(open) => (open ? null : dismissNotice())}>
      {notice ? (
        <NoticeDialog title={notice.title}>
          <Text style={styles.message} accessibilityRole="alert">
            {notice.message}
          </Text>
          <View style={{ marginTop: 18 }}>
            <SoapboxButton onPress={dismissNotice}>OK</SoapboxButton>
          </View>
        </NoticeDialog>
      ) : null}
    </Dialog>
  );
};

const styles = StyleSheet.create({
  message: {
    fontFamily: FONTS.body,
    fontSize: 16,
    lineHeight: 23,
    color: SOAPBOX.marker,
  },
});
