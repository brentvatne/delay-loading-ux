import { Button, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useUpdates, reloadAsync } from "expo-updates";

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
      <Button title="Reload" onPress={() => reloadAsync()} />
      <Stack.Screen options={{ title: "Home" }} />
    </View>
  );
}
