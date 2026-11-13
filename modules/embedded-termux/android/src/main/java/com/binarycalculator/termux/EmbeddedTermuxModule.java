package com.binarycalculator.termux;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

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
