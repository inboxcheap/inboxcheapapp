plugins { id("com.android.application") }
android {
    namespace = "com.inboxcheap.app"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.inboxcheap.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 7
        versionName = "1.3.0"
    }
    buildTypes { release { isMinifyEnabled = false } }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
}
