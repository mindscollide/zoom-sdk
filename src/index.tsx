/* eslint-disable no-restricted-globals */
import React from "react";
import { createRoot } from "react-dom/client";
import ZoomVideo from "@zoom/videosdk";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import ZoomContext from "./context/zoom-context";
import { b64DecodeUnicode } from "./utils/util";

const getMeetingArgs = () => {
  let args: any = Object.fromEntries(new URLSearchParams(location.search));

  // Decode certain fields if present
  if (args.web && args.web !== "0") {
    ["topic", "name", "password", "sessionKey", "userIdentity"].forEach(
      (field) => {
        if (Object.hasOwn(args, field)) {
          try {
            args[field] = b64DecodeUnicode(args[field]);
          } catch {
            console.log("Ignore base64 decode for", field);
          }
        }
      }
    );

    // Ensure role is an integer
    args.role = args.role ? parseInt(args.role, 10) : 1;
  }

  args.useVideoPlayer = 1; // Enforce <video> tag for rendering

  // Parse additional boolean fields as numbers
  [
    "enforceGalleryView",
    "enforceVB",
    "cloud_recording_option",
    "cloud_recording_election",
  ].forEach((field) => {
    if (Object.hasOwn(args, field)) {
      try {
        args[field] = Number(args[field]);
      } catch {
        args[field] = 0;
      }
    }
  });

  // Decode telemetry_tracking_id if present
  if (args.telemetry_tracking_id) {
    try {
      args.telemetry_tracking_id = b64DecodeUnicode(args.telemetry_tracking_id);
    } catch {
      args.telemetry_tracking_id = "";
    }
  }

  return args;
};

// Fetch authentication data
const fetchAuthApi = async (
  sessionKey: string,
  userGuid: string,
  userName: string
) => {
  const authEndpoint =
    "http://192.168.18.241:11022/api/Video/GenerateVideoSdkJwt";
  // const authEndpoint =
  //   "https://portal.letsdiskus.com:9414/api/Video/GenerateVideoSdkJwt";
  // const authEndpoint =
  //   "https://secure.letsdiskus.com:9414/api/Video/GenerateVideoSdkJwt";

  try {
    const response = await fetch(authEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ SessionKey: sessionKey, Guid: userGuid }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    if (data.videoSdkJwt && data.responseCode === 200) {
      return {
        name: userName,
        signature: data.videoSdkJwt,
        topic: data.sessionName,
        webEndpoint: "zoom.us",
        sessionKey: sessionKey,
        userIdentity: userGuid,
      };
    } else {
      console.error(`API Error: ${data.responseMessage}`);
      return null;
    }
  } catch (error) {
    console.error("Failed to fetch auth API:", error);
    return null;
  }
};

const initializeMeetingArgs = async (args: any) => {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionKey = urlParams.get("sessionKey");
  const userGuid = urlParams.get("userGuid");
  const userName = urlParams.get("userName");
  if (sessionKey && userGuid && userName) {
    const authConfig = await fetchAuthApi(sessionKey, userGuid, userName);
    if (authConfig) {
      return { ...args, ...authConfig };
    }
  }

  return args;
};

const zmClient = ZoomVideo.createClient();
const root = createRoot(document.getElementById("root") as HTMLElement);

(async () => {
  let meetingArgs = getMeetingArgs();
  meetingArgs = await initializeMeetingArgs(meetingArgs);

  console.log("Final Meeting Arguments:", meetingArgs);

  root.render(
    <React.StrictMode>
      <ZoomContext.Provider value={zmClient}>
        <App meetingArgs={meetingArgs} />
      </ZoomContext.Provider>
    </React.StrictMode>
  );

  // Measure app performance
  reportWebVitals();
})();
