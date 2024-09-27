import { Text, View } from "react-native";
import { Stack } from "expo-router";
import { useUpdates } from "expo-updates";

export default function Index() {
  const { currentlyRunning } = useUpdates();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>new</Text>
      <Text>{currentlyRunning.updateId}</Text>
      <Stack.Screen options={{ title: "Home" }} />
    </View>
  );
}
