package com.binarycalculator.termux;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class EmbeddedTermuxModule extends ReactContextBaseJavaModule {
    private final ExecutorService installerExecutor = Executors.newSingleThreadExecutor();

    EmbeddedTermuxModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "EmbeddedTermux";
    }

    @ReactMethod
    public void getRuntimeStatus(Promise promise) {
        try {
            WritableMap result = Arguments.createMap();
            result.putBoolean("installed", TermuxBootstrapInstaller.isInstalled(getReactApplicationContext()));
            result.putString("prefix", TermuxBootstrapInstaller.getPrefix(getReactApplicationContext()).getAbsolutePath());
            result.putString("architecture", TermuxBootstrapInstaller.getSupportedArchitecture());
            promise.resolve(result);
        } catch (Exception error) {
            promise.reject("TERMUX_STATUS_FAILED", error);
        }
    }

    @ReactMethod
    public void sendText(String text, Promise promise) {
        try {
            EmbeddedTermuxSessionHolder.sendText(text);
            promise.resolve(true);
        } catch (Exception error) {
            promise.reject("TERMUX_INPUT_FAILED", error);
        }
    }

    @ReactMethod
    public void getLicenseNotices(Promise promise) {
        try {
            String architecture = TermuxBootstrapInstaller.getSupportedArchitecture();
            StringBuilder notices = new StringBuilder();
            appendAsset(notices, "NOTICE.txt");
            appendAsset(notices, "BinaryCalc-GPL-3.0.txt");
            appendAsset(notices, "Apache-2.0.txt");
            appendAsset(notices, "termux-bootstrap-packages-" + architecture + ".csv");
            promise.resolve(notices.toString());
        } catch (Exception error) {
            promise.reject("TERMUX_LICENSE_NOTICES_FAILED", error);
        }
    }

    private void appendAsset(StringBuilder target, String assetName) throws Exception {
        target.append("\\n\\n===== ").append(assetName).append(" =====\\n");
        try (InputStream input = getReactApplicationContext().getAssets().open(assetName);
             BufferedReader reader = new BufferedReader(new InputStreamReader(input, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) target.append(line).append('\\n');
        }
    }

    @ReactMethod
    public void installBootstrap(Promise promise) {
        installerExecutor.execute(() -> {
            try {
                TermuxBootstrapInstaller.install(getReactApplicationContext());
                WritableMap result = Arguments.createMap();
                result.putBoolean("installed", true);
                result.putString("prefix", TermuxBootstrapInstaller.getPrefix(getReactApplicationContext()).getAbsolutePath());
                result.putString("architecture", TermuxBootstrapInstaller.getSupportedArchitecture());
                promise.resolve(result);
            } catch (Exception error) {
                promise.reject("TERMUX_BOOTSTRAP_INSTALL_FAILED", error);
            }
        });
    }

    @Override
    public void invalidate() {
        installerExecutor.shutdownNow();
        super.invalidate();
    }
}
