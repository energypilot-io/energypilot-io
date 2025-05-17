import "react-router";

declare module "react-router" {
  interface Register {
    params: Params;
  }
}

type Params = {
  "/": {};
  "/graph": {};
  "/settings/common": {};
  "/settings/dashboard": {};
  "/settings/devices": {};
  "/api/locales": {};
  "/api/settings": {};
  "/action/set-theme": {};
  "/api/snapshots": {};
  "/api/template-registry": {};
  "/api/devices": {};
  "/api/devices/:deviceId": {
    "deviceId": string;
  };
  "/api/energy-export/:timestamp": {
    "timestamp": string;
  };
  "/api/energy-import/:timestamp": {
    "timestamp": string;
  };
  "/api/energy-production/:timestamp": {
    "timestamp": string;
  };
  "/.well-known/appspecific/com.chrome.devtools.json": {};
};