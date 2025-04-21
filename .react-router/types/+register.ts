import "react-router";

declare module "react-router" {
  interface Register {
    params: Params;
  }
}

type Params = {
  "/": {};
  "/api/get-energy-production/:timestamp": {
    "timestamp": string;
  };
  "/api/get-energy-export/:timestamp": {
    "timestamp": string;
  };
  "/api/get-energy-import/:timestamp": {
    "timestamp": string;
  };
  "/api/template-registry": {};
  "/action/set-theme": {};
  "/api/snapshots": {};
  "/api/settings": {};
  "/api/devices": {};
  "/api/devices/:deviceId": {
    "deviceId": string;
  };
  "/api/locales": {};
  "/settings/dashboard": {};
  "/settings/devices": {};
  "/settings/common": {};
  "/graph": {};
};