# Inbox.Cheap for Android

The open-source Android client for [Inbox.Cheap](https://inboxcheap.com/android). Read email and forwarded SMS in separate filters, copy detected verification-code candidates, create receiving addresses and retire addresses you no longer need. Receive-only: no sending or replies.

## What is open here?

- `app/`: the native Java Activity, manifest, icons and Android build configuration.
- `web/`: a snapshot of the mobile interface, including the encrypted local cache implementation, for review.
- `PRIVACY.md` and `SECURITY.md`: permissions, data flows and security boundaries.

The installed app loads **https://inboxcheap.com/mobile** in Android WebView. The website, authentication server, receiving infrastructure and database are separate services and are **not included** here. The live web interface can be updated independently of the APK. The `web/` snapshot is not cryptographically pinned to a running session; inspect live requests/content as well when auditing the app. This repository does not claim that a hosted service is zero-knowledge or end-to-end encrypted.

## Build locally

Requirements: JDK 17, Android SDK platform 35 and build-tools 35. Set `JAVA_HOME` and create a local, ignored `local.properties`:

```properties
sdk.dir=/your/android/sdk
```

```sh
./gradlew :app:assembleRelease :app:lintRelease
# Windows: gradlew.bat :app:assembleRelease :app:lintRelease
```

Output: `app/build/outputs/apk/release/app-release-unsigned.apk`. Debug builds use your machine's debug key. Official release signing is performed outside this repository; publisher keystores and passwords are not distributed. An APK you sign yourself cannot replace an official installation without uninstalling it first.

Official release certificate SHA-256:
`5d307a511b8429826347b506482b1df21247c480c602bc29089ae3489046e18f`

Package: `com.inboxcheap.app`. Minimum Android: 8.0. Current client version: 1.3.0.

## Review the client

There is no native JavaScript bridge, contacts/SMS access, advertising SDK or analytics SDK. The native wrapper blocks file/content access and mixed content, uses an allowlist for in-app navigation, and opens approved external links through the system browser. The mobile JS snapshot contains account-scoped IndexedDB cache encryption and cleanup logic.

Official downloads: https://inboxcheap.com/android

The separate SMS forwarder is at https://github.com/inboxcheap/smstoinbox.

## License

MIT; see `LICENSE`. Branding identifies the official service; a fork must not imply it is an official release. The Poppins-derived wordmark's font license is included in `branding/OFL.txt`.
