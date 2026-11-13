package com.binarycalculator.termux;

import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;

public final class EmbeddedTermuxViewManager extends SimpleViewManager<EmbeddedTermuxTerminalView> {
    public static final String REACT_CLASS = "EmbeddedTermuxView";

    @Override
    public String getName() {
        return REACT_CLASS;
    }

    @Override
    protected EmbeddedTermuxTerminalView createViewInstance(ThemedReactContext context) {
        return new EmbeddedTermuxTerminalView(context);
    }

    @ReactProp(name = "fontSize", defaultInt = 14)
    public void setFontSize(EmbeddedTermuxTerminalView view, int fontSize) {
        view.setFontSize(fontSize);
    }

    @ReactProp(name = "autoStart", defaultBoolean = true)
    public void setAutoStart(EmbeddedTermuxTerminalView view, boolean autoStart) {
        if (autoStart) view.post(view::startSessionIfReady);
    }

    @Override
    public void onDropViewInstance(EmbeddedTermuxTerminalView view) {
        view.closeSession();
        super.onDropViewInstance(view);
    }
}
