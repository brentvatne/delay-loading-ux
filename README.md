# Delay loading to wait for update check

This is an example of how you can delay loading your app until the initial automatic update check is complete, but also show a custom UI rather than just sitting on the splash screen.

The logic lives entirley in [app/_layout.tsx](https://github.com/brentvatne/delay-loading-ux/blob/main/app/_layout.tsx). I recommend this as an alternative to `fallbackToCacheTimeout`, which should be avoided in nearly all cases in production apps due to the significant user experience downside of impacting the launch time of all app users, potentially introducing a significant delay when network conditions are poor -- even when there is no update available! Using the approach in this repo, you can customize the behavior however you like.