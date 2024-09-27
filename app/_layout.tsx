import { Stack } from "expo-router";
import { useEffect, useState } from "react"
import { ActivityIndicator, Text, View } from "react-native";
import { useUpdates, reloadAsync } from "expo-updates";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function CheckForLatestUpdateOnceOnLaunch(props: { onComplete: (options?: { timedOut?: boolean }) => void, timeout?: number }) {
  const { isChecking, isDownloading, isUpdatePending, isUpdateAvailable, downloadError, downloadedUpdate, checkError } = useUpdates();
  const [ initialDelayComplete, setInitialDelayComplete ] = useState<boolean | undefined>(false);

  // Don't wait in this check forever, bail out after a timeout. Alternatively,
  // you could leave this open indefinitely if you fetched an update manifest
  // that indicated that it was urgent priority.
  useEffect(() => {
    if (props.timeout) {
      const timeoutId = setTimeout(() => {
        props.onComplete({ timedOut: true });
      }, props.timeout);
      return () => clearTimeout(timeoutId);
    }
  }, []);

  // Add a very short initial delay where we keep the splash open, which could
  // be useful in case the update finishes very quickly, so we won't need to show
  // any other UI. It also ensures that expo-updates has had a chance to fire the
  // check request.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setInitialDelayComplete(true)
    }, 150);

    return () => {
      clearTimeout(timeoutId)
    };
  }, []);

  useEffect(() => {
    // You can hide the splash screen whenever you want. Maybe after a short initial delay
    // is good, but up to you.
    if (initialDelayComplete) {
      requestAnimationFrame(() => {
        SplashScreen.hideAsync();
      });
    }
  }, [initialDelayComplete])

  useEffect(() => {
    const isInErrorState = checkError || downloadError;
    const isInProgressState = isChecking || isDownloading;
    const isReadyToUpdate = isUpdatePending || downloadedUpdate;

    if (isReadyToUpdate) {
      // An update is available and ready to go, let's not wait any longer
      reloadAsync();
    }

    // Don't do anything until the initial delay is done
    if (!initialDelayComplete) {
      return;
    }

    if (isInErrorState) {
      // Maybe do something about the error, like log to Sentry?
      props.onComplete();
    } else if (!isInProgressState && !isReadyToUpdate) {
      // We finished the check while the app was running, and there is no update, or there was an error
      props.onComplete()
    }

  }, [initialDelayComplete, isChecking, isDownloading, isUpdatePending, isUpdateAvailable]);

  // Put your beautiful loading UI here
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
      <>
        <ActivityIndicator size="large" color="#ccc" />
        <Text style={{ fontSize: 20, marginTop: 10 }}>Preparing the app</Text>
        <Text>
          Current state: {JSON.stringify({ isChecking, isDownloading, isUpdatePending, isUpdateAvailable }, null, 2)}
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
