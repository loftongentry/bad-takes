import { View } from "tamagui"
import { Page } from "../src/ui/Page"
import { PrimaryButton } from "../src/ui/PrimaryButton"

const PromptEntry = () => {
  return (
    <Page
      title="Enter Bad Take"
      subtitle="Enter a controversial opinion below"
    >

      
      <View style={{ width: '100%', maxWidth: 340, marginTop: 22 }}>
        <PrimaryButton
          onPress={() => { }}
        >
          Submit Bad Take
        </PrimaryButton>
      </View>
    </Page >
  )
}

export default PromptEntry