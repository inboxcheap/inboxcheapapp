# Security review and reporting

Please report suspected vulnerabilities privately to **hello@inboxcheap.com**. Do not post user messages, credentials, receiving/share URLs, cookies or device tokens in public issues. Use synthetic messages and redact private data in examples.

Review `MainActivity.java` for navigation, WebView settings, cookie persistence and external-browser behavior. Review `web/mobile-cache.js` and `web/mobile.js` for cache isolation, sign-out cleanup and message rendering. The app does not expose a native JavaScript bridge or permit mixed content, file URLs or content URLs.

The hosted service and independently updated web content are outside the native APK's trust boundary. Open client code and a matching publisher certificate are not proof of server privacy or deterministic byte-for-byte build reproducibility. Compare source, dependencies, manifest, APK permissions and certificate when auditing.

Never commit keystores, passwords, `.env`, API credentials, actual mail, user records or local build directories. This repository contains neither publisher signing material nor backend configuration.
