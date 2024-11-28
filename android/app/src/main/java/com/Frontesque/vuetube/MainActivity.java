package com.Frontesque.vuetube;

import android.os.Bundle;

//import com.Frontesque.server.ServerManager;
import com.getcapacitor.BridgeActivity;

import android.app.PictureInPictureParams;
import android.os.Build;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onUserLeaveHint() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            //PictureInPictureParams.Builder pipBuilder = new PictureInPictureParams.Builder();
            //enterPictureInPictureMode(pipBuilder.build());
        }
    }

}
