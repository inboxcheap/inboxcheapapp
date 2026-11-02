# Client privacy and data flow

- **Permission:** INTERNET only. No SMS, contacts, shared-storage, microphone or camera permission.
- **Authentication:** cookies are kept in the app's private WebView storage. The client flushes cookies on background/page completion. Persistent device sign-in is a hosted-server feature; the client does not embed passwords or service keys.
- **Network:** the mobile UI connects to Inbox.Cheap over HTTPS. Google sign-in is handed off to the system browser. External links are opened after user navigation/confirmation. Loading external images in an email can contact that image's host, if the user explicitly enables them.
- **Cache:** the mobile snapshot uses account-scoped IndexedDB, AES-GCM and a non-exportable WebCrypto key in the same app storage. This is not Android Keystore, end-to-end encryption or protection against a fully compromised device. Limits: 100 messages, 25 MiB, seven days, cleaned on subsequent operations. Logout/account change/cache-clear remove cached records and keys.
- **Hosted processing:** the service can decrypt server-stored mail for authorized access. Encryption at rest is not zero-knowledge encryption. See https://inboxcheap.com/privacy for server-side processing and retention.
- **Backup:** Android app backup is disabled. Uninstalling removes app-local data; it does not delete server messages, cancel a plan, or remove a copy exported elsewhere.
- **Telemetry:** no advertising or analytics SDK is added by this client. Android, the WebView provider, browser and hosted service have their own behavior and logs.

The public `web/` files are a reviewable snapshot, not an offline/self-hosted mailbox. They require the hosted app's session and endpoints to function.
