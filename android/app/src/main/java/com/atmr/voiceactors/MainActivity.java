package com.atmr.voiceactors;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.atmr.voiceactors.plugins.apkinstaller.ApkInstallerPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ApkInstallerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
