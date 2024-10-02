import { Stack } from "expo-router";
import { useEffect, useState } from "react"
import { ActivityIndicator, Text, View } from "react-native";
import { useUpdates, reloadAsync, checkForUpdateAsync } from "expo-updates";
import { StatusBar } from "expo-status-bar";

enum UpdateCheckState {
  Unknown = 'Unknown',
  NativeStateInitialized = 'NativeStateInitialized',
  NoEventsAfterInitialized = 'NoEventsAfterInitialized',
  InProgress = 'InProgress',
  UpdateReady = 'UpdateReady',
  NoUpdateAvailable = 'NoUpdateAvailable',
  Error = 'Error',
}

// To account for the fact that some states don't transition immediately from
// one to another, we debounce some state updates to wait for the underlying
// native state transition to occur. We should change this in expo-updates, so
// that when you use the automated checks it always transitions from checking ->
// downloading -> update pending.
// 
// The other case this handles is that we have no way of knowing on startup what
// state we are actually in immediately, because the native state is only
// updated after the first event fires. One possible way to work around this is
// with `lastCheckForUpdateTimeSinceRestart` but this doesn't work well if you
// use `reloadAsync` after an update is completed - because we don't check for
// updates again after calling reloadAsync.
function debounceStateUpdate(fn: () => void, timeoutMs = 100) {
  const timeoutId = setTimeout(fn, timeoutMs);

  return () => {
    clearTimeout(timeoutId);
  };
}

let d: undefined | Date = undefined;

let events: string[]= [];
let debugLog = (s: string, timestamp = true) => {
  if (!d) {
    d = new Date();
  }
  if (timestamp) {
    events.push(`${new Date().getTime() - d.getTime()}: ${s}`);
  } else {
    events.push(`${s}`);
  }
}

debugLog(`javascript execution pass`)
let loggedFirstExecution = false;

function CheckForLatestUpdateOnceOnLaunch(props: { onComplete: (options?: { timedOut?: boolean }) => void, timeout?: number }) {
  const { isChecking, isDownloading, isUpdatePending, isUpdateAvailable, downloadError, downloadedUpdate, checkError, lastCheckForUpdateTimeSinceRestart } = useUpdates();
  const [ updateCheckState, setUpdateCheckState ] = useState<UpdateCheckState>(UpdateCheckState.Unknown);

  if (!loggedFirstExecution) {
    debugLog(`CheckForLatestUpdateOnceOnLaunch function executed`);
    loggedFirstExecution = true;
  }


  useEffect(() => {
    if (updateCheckState === UpdateCheckState.UpdateReady || updateCheckState === UpdateCheckState.NoUpdateAvailable || updateCheckState === UpdateCheckState.Error) {
      // No escaping complete or error states
      return;
    }

    if (isUpdatePending || downloadedUpdate) {
      // Update available for launch
      debugLog(`${updateCheckState} -> ${UpdateCheckState.UpdateReady}.`);
      setUpdateCheckState(UpdateCheckState.UpdateReady);
    } else if (checkError || downloadError) { 
      // Error
      debugLog(`${updateCheckState} -> ${UpdateCheckState.Error}`);
      setUpdateCheckState(UpdateCheckState.Error);
    } else if ((isChecking || isDownloading) || (!isDownloading && isUpdateAvailable)) { 
      // In progress
      if (updateCheckState === UpdateCheckState.InProgress) {
        debugLog(`${updateCheckState} (unchanged)`);
        debugLog(JSON.stringify({ isChecking, isDownloading, isUpdateAvailable }, null, 2), false);
      } else {
        debugLog(`${updateCheckState} -> ${UpdateCheckState.InProgress}`);
        debugLog(JSON.stringify({ isChecking, isDownloading, isUpdateAvailable }, null, 2), false);
        setUpdateCheckState(UpdateCheckState.InProgress);
      }
    } else if ((!isChecking && !isDownloading && !isUpdateAvailable) && updateCheckState === UpdateCheckState.InProgress) {
      setUpdateCheckState(UpdateCheckState.NoUpdateAvailable);
      debugLog(`${updateCheckState} -> ${UpdateCheckState.NoUpdateAvailable}`);
      debugLog(JSON.stringify({ isChecking, isDownloading, isUpdateAvailable }, null, 2), false);
    } else if (lastCheckForUpdateTimeSinceRestart !== undefined && updateCheckState === UpdateCheckState.Unknown) {
      debugLog(`${updateCheckState} -> ${UpdateCheckState.NativeStateInitialized}`);
      setUpdateCheckState(UpdateCheckState.NativeStateInitialized);
    } else if (updateCheckState === UpdateCheckState.NativeStateInitialized) {
      // If we initialize the state but somehow don't get any other state updates, then we can bail out. This may not
      // ever actually happen in practice, but it's a good fallback.
      return debounceStateUpdate(() => {
        debugLog(`${updateCheckState} -> ${UpdateCheckState.NoEventsAfterInitialized}`);
        setUpdateCheckState(UpdateCheckState.NoEventsAfterInitialized);
      }, 100);
    } else if (updateCheckState === UpdateCheckState.Unknown) {
      // This handles the case where we don't actually check for updates on launch, eg: after reloadAsync
      // If it has taken more than a frame for the updates state to be populated then we can assume we won't be checking
      return debounceStateUpdate(() => {
        debugLog(`${updateCheckState} -> ${UpdateCheckState.NoEventsAfterInitialized}`);
        setUpdateCheckState(UpdateCheckState.NoEventsAfterInitialized);
      }, 16);
    }
  }, [lastCheckForUpdateTimeSinceRestart, isChecking, isDownloading, isUpdatePending, isUpdateAvailable, updateCheckState]);

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

  useEffect(() => {
    if (updateCheckState === UpdateCheckState.Unknown || updateCheckState === UpdateCheckState.NativeStateInitialized || updateCheckState === UpdateCheckState.InProgress) {
      // all we can do is wait when we are in an unknown / initializing / in progress state
    } else if (updateCheckState === UpdateCheckState.Error || updateCheckState === UpdateCheckState.NoEventsAfterInitialized || updateCheckState === UpdateCheckState.NoUpdateAvailable) {
      // bail out if we end up in a state where we aren't waiting on anything and have no update available
      props.onComplete();
    } else if (updateCheckState === UpdateCheckState.UpdateReady) {
      // the holy grail of conditional branches
      // requestAnimationFrame(() => reloadAsync());

      // For debugging
      props.onComplete();
      debugLog('(trigger reload)')
    }
  }, [updateCheckState]);


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

  console.log(events);

  return (
    <>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <Text selectable>{events.join('\n')}</Text>
      </View>

      {/* <Stack>
        <Stack.Screen name="index" />
      </Stack> */}
      <StatusBar style="auto" />
    </>
  );
}


// 0: Unknown -> InProgress
// 0: would like to go from InProgress to NoUpdateAvailable. time since last event in this block {"isChecking":true,"isDownloading":false}
// 99: would like to go from InProgress to NoUpdateAvailable. time since last event in this block {"isChecking":false,"isDownloading":false}
// 5001: transitioning from InProgress to NoUpdateAvailable

// 0: transitioning from Unknown to InProgress
// 0: would like to go from InProgress to NoUpdateAvailable. time since last event in this block {"isChecking":true,"isDownloading":false}
// 65: would like to go from InProgress to NoUpdateAvailable. time since last event in this block {"isChecking":false,"isDownloading":false}
// 1: would like to go from InProgress to NoUpdateAvailable. time since last event in this block {"isChecking":false,"isDownloading":true}
// 670: transitioning from InProgress to UpdateReady. time since last event 670
// 670: would reload but decided not to

// 0: Unknown -> InProgress
// {
//   "isChecking": true,
//   "isDownloading": false
// }
// 0: InProgress -> InProgress
// {
//   "isChecking": true,
//   "isDownloading": false
// }
// 59: prevented InProgress from going to NoUpdateAvailable.
// {
//   "isChecking": false,
//   "isDownloading": false
// }
// 114: InProgress -> NoUpdateAvailable