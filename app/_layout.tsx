import { Stack } from "expo-router";
import { useEffect, useState } from "react"
import { ActivityIndicator, Text, View } from "react-native";
import { useUpdates, reloadAsync } from "expo-updates";
import { StatusBar } from "expo-status-bar";
import { useInitialUpdateState, UpdateCheckState } from "../hooks/useInitialUpdateState";

function CheckForLatestUpdateOnceOnLaunch(props: { onComplete: (options?: { timedOut?: boolean }) => void, timeout?: number }) {
  const state = useInitialUpdateState({ timeout: props.timeout });
  const { isChecking, isDownloading, isUpdatePending, isUpdateAvailable, downloadError, checkError, lastCheckForUpdateTimeSinceRestart } = useUpdates();

  useEffect(() => {
    if (state === UpdateCheckState.UpdateReady) {
      // the holy grail of conditional branches
      requestAnimationFrame(() => reloadAsync());
    } else if (state === UpdateCheckState.Timeout) {
      props.onComplete({ timedOut: true });
    } else if ([UpdateCheckState.NoUpdateAvailable, UpdateCheckState.Error, UpdateCheckState.NoEventsAfterInitialized].includes(state)) {
      props.onComplete();
    } else {} // In any other state we're just waiting

  }, [state]);

  // Put your beautiful loading UI here
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
      <>
        <ActivityIndicator size="large" color="#ccc" />
        <Text style={{ fontSize: 20, marginTop: 10 }}>Preparing the app</Text>
        <Text>
          Current state: {JSON.stringify({
            isChecking,
            isDownloading,
            isUpdatePending,
            isUpdateAvailable,
            downloadError,
            checkError,
            lastCheckForUpdateTimeSinceRestart
          }, null, 2)}
        </Text>
      </>
      <StatusBar style="auto" />
    </View>
  );
}

export default function RootLayout() {
  const [initialCheckInProgress, setInitialCheckInProgress] = useState<boolean | undefined>(undefined);

  if (initialCheckInProgress === undefined) {
    return (
      <CheckForLatestUpdateOnceOnLaunch
        timeout={10_000}
        onComplete={(options) => {
          if (options?.timedOut) {
            // Do something if the check timed out?
          }

          setInitialCheckInProgress(false);
        }}
      />
    );
  }

  return (
    <>
      <Stack>
        <Stack.Screen name="index" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}