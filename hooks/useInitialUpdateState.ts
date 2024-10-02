import { useEffect, useState } from "react"
import { useUpdates } from "expo-updates";

export enum UpdateCheckState {
  Unknown = 'Unknown',
  NativeStateInitialized = 'NativeStateInitialized',
  NoEventsAfterInitialized = 'NoEventsAfterInitialized',
  InProgress = 'InProgress',
  UpdateReady = 'UpdateReady',
  NoUpdateAvailable = 'NoUpdateAvailable',
  Error = 'Error',
  Timeout = 'Timeout',
}

const DEFAULT_TIMEOUT = 10_000;

export function useInitialUpdateState(options?: { timeout?: number }) {
  const { isChecking, isDownloading, isUpdatePending, isUpdateAvailable, downloadError, downloadedUpdate, checkError, lastCheckForUpdateTimeSinceRestart } = useUpdates();
  const [ updateCheckState, setUpdateCheckState ] = useState<UpdateCheckState>(UpdateCheckState.Unknown);

  useEffect(() => {
    // Don't go backwards from these states
    if ([UpdateCheckState.UpdateReady, UpdateCheckState.NoUpdateAvailable, UpdateCheckState.Error, UpdateCheckState.Timeout].includes(updateCheckState)) {
      return;
    }

    if (isUpdatePending || downloadedUpdate) {
      setUpdateCheckState(UpdateCheckState.UpdateReady);
    } else if (checkError || downloadError) { 
      setUpdateCheckState(UpdateCheckState.Error);
    } else if ((isChecking || isDownloading || (!isDownloading && isUpdateAvailable)) && updateCheckState !== UpdateCheckState.InProgress) { 
      setUpdateCheckState(UpdateCheckState.InProgress);
    } else if ((!isChecking && !isDownloading && !isUpdateAvailable) && updateCheckState === UpdateCheckState.InProgress) {
      setUpdateCheckState(UpdateCheckState.NoUpdateAvailable);
    } else if (lastCheckForUpdateTimeSinceRestart !== undefined && updateCheckState === UpdateCheckState.Unknown) {
      setUpdateCheckState(UpdateCheckState.NativeStateInitialized);
      return delayedStateUpdate(() => {
        setUpdateCheckState(UpdateCheckState.NoEventsAfterInitialized);
      }, 100);
    } else if (updateCheckState === UpdateCheckState.Unknown) {
      // This handles the case where we don't actually check for updates on launch, eg: after reloadAsync
      // If it has taken more than a frame for the updates state to be populated then we can assume we won't be checking
      return delayedStateUpdate(() => {
        setUpdateCheckState(UpdateCheckState.NoEventsAfterInitialized);
      }, 16);
    }
  }, [lastCheckForUpdateTimeSinceRestart, isChecking, isDownloading, isUpdatePending, isUpdateAvailable, updateCheckState]);

  useEffect(() => {
    return delayedStateUpdate(() => {
      setUpdateCheckState(UpdateCheckState.Timeout);
    }, options?.timeout ?? DEFAULT_TIMEOUT);
  }, []);

  return updateCheckState;
}

function delayedStateUpdate(fn: () => void, timeoutMs: number) {
  const timeoutId = setTimeout(fn, timeoutMs);

  return () => {
    clearTimeout(timeoutId);
  };
}
