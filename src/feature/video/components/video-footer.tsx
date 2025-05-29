import { useState, useCallback, useContext, useEffect } from "react";
import classNames from "classnames";
import { message, Modal, Form, Select, Checkbox, Tooltip } from "antd";
import { SoundOutlined } from "@ant-design/icons";
import ZoomContext from "../../../context/zoom-context";
import CameraButton from "./camera";
import MicrophoneButton from "./microphone";
import { ScreenShareButton } from "./screen-share";
import AudioVideoStatisticModal from "./audio-video-statistic";
import ZoomMediaContext from "../../../context/media-context";
import { useUnmount, useMount } from "../../../hooks";
import type { MediaDevice } from "../video-types";
import "./video-footer.scss";
import { isAndroidOrIOSBrowser } from "../../../utils/platform";
import {
  getPhoneCallStatusDescription,
  SELF_VIDEO_ID,
} from "../video-constants";
import {
  type RecordButtonProps,
  getRecordingButtons,
  RecordingButton,
} from "./recording";
import {
  type DialOutOption,
  DialoutState,
  RecordingStatus,
  MutedSource,
  AudioChangeAction,
  VideoCapturingState,
  SharePrivilege,
  MobileVideoFacingMode,
  LiveStreamStatus,
  ShareStatus,
} from "@zoom/videosdk";
import { LiveTranscriptionButton } from "./live-transcription";
import { LeaveButton } from "./leave";
import { TranscriptionSubtitle } from "./transcription-subtitle";
import IsoRecordingModal from "./recording-ask-modal";
import { LiveStreamButton, LiveStreamModal } from "./live-stream";
import { IconFont } from "../../../component/icon-font";
import { VideoMaskModel } from "./video-mask-modal";
import { useParticipantsChange } from "../hooks/useParticipantsChange";
interface VideoFooterProps {
  className?: string;
  selfShareCanvas?: HTMLCanvasElement | HTMLVideoElement | null;
  sharing?: boolean;
}

const isAudioEnable = typeof AudioWorklet === "function";
const VideoFooter = (props: VideoFooterProps) => {
  const { className, selfShareCanvas, sharing } = props;
  const zmClient = useContext(ZoomContext);
  const { mediaStream } = useContext(ZoomMediaContext);
  const liveTranscriptionClient = zmClient.getLiveTranscriptionClient();
  const liveStreamClient = zmClient.getLiveStreamClient();
  const recordingClient = zmClient.getRecordingClient();
  const [isStartedAudio, setIsStartedAudio] = useState(
    zmClient.getCurrentUserInfo() && zmClient.getCurrentUserInfo().audio !== ""
  );
  const [isStartedVideo, setIsStartedVideo] = useState(
    zmClient.getCurrentUserInfo()?.bVideoOn
  );
  const [audio, setAudio] = useState(zmClient.getCurrentUserInfo()?.audio);
  const [isSupportPhone, setIsSupportPhone] = useState(false);
  const [phoneCountryList, setPhoneCountryList] = useState<any[]>([]);
  const [phoneCallStatus, setPhoneCallStatus] = useState<DialoutState>();
  const [isStartedLiveTranscription, setIsStartedLiveTranscription] =
    useState(false);
  const [isDisableCaptions, setIsDisableCaptions] = useState(false);
  const [isMirrored, setIsMirrored] = useState(false);
  const [isBlur, setIsBlur] = useState(
    mediaStream?.getVirtualbackgroundStatus().imageSrc === "blur"
  );
  const [isMuted, setIsMuted] = useState(
    !!zmClient.getCurrentUserInfo()?.muted
  );
  const [activeMicrophone, setActiveMicrophone] = useState(
    mediaStream?.getActiveMicrophone()
  );
  const [activeSpeaker, setActiveSpeaker] = useState(
    mediaStream?.getActiveSpeaker()
  );
  const [activeCamera, setActiveCamera] = useState(
    mediaStream?.getActiveCamera()
  );
  const [micList, setMicList] = useState<MediaDevice[]>(
    mediaStream?.getMicList() ?? []
  );
  const [speakerList, setSpeakerList] = useState<MediaDevice[]>(
    mediaStream?.getSpeakerList() ?? []
  );
  const [cameraList, setCameraList] = useState<MediaDevice[]>(
    mediaStream?.getCameraList() ?? []
  );
  const [statisticVisible, setStatisticVisible] = useState(false);
  const [selecetedStatisticTab, setSelectedStatisticTab] = useState("audio");
  const [isComputerAudioDisabled, setIsComputerAudioDisabled] = useState(false);
  const [sharePrivilege, setSharePrivileg] = useState(SharePrivilege.Unlocked);
  const [caption, setCaption] = useState({ text: "", isOver: false });
  const [activePlaybackUrl, setActivePlaybackUrl] = useState("");
  const [isMicrophoneForbidden, setIsMicrophoneForbidden] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<"" | RecordingStatus>(
    recordingClient?.getCloudRecordingStatus() || ""
  );
  const [recordingIsoStatus, setRecordingIsoStatus] = useState<
    "" | RecordingStatus
  >("");
  const [liveStreamVisible, setLiveStreamVisible] = useState(false);
  const [liveStreamStatus, setLiveStreamStatus] = useState(
    liveStreamClient?.getLiveStreamStatus()
  );
  // Video Mask
  const [videoMaskVisible, setVideoMaskVisible] = useState(false);

  const [isSecondaryAudioStarted, setIsSecondaryAudioStarted] = useState(false);
  const [secondaryMicForm] = Form.useForm();
  useParticipantsChange(zmClient, () => {
    setIsMuted(!!zmClient.getCurrentUserInfo()?.muted);
  });
  let checkValuFlag = false;

  const userList = zmClient.getAllUser();
  const userListss = zmClient.isHost();
  console.log({ userList, userListss }, "Chceck Check");

  const urlParams = new URLSearchParams(window.location.search);
  const micParam = urlParams.get("isMute"); // 'on' or 'off'
  const videoParam = urlParams.get("isHideCamera"); // 'on' or 'off'

  useEffect(() => {
    // Define the postMessage event listener

    const handlePostMessage = (event: MessageEvent) => {
      if (!mediaStream) {
        return;
      }
      console.log("handlePostMessageSSSjabs", recordingIsoStatus);

      console.log("handlePostMessage", micParam);
      console.log("handlePostMessage", videoParam);
      console.log("handlePostMessage", event.data);
      console.log("handlePostMessage", event.origin);

      if (event.origin === "http://localhost:3000") {
        // if (event.origin === "https://portal.letsdiskus.com") {
        // if (event.origin === 'https://secure.letsdiskus.com') {
        if (event.data === "VidOff") {
          const startVideoOptions = {
            hd: true,
            fullHd: true,
            ptz: mediaStream?.isBrowserSupportPTZ(),
            originalRatio: true,
          };

          // Removed virtual background configuration
          mediaStream.startVideo(startVideoOptions).catch((err) => {
            console.error("Failed to start video:", err);
          });
          setIsStartedVideo(true);
        } else if (event.data === "VidOn") {
          mediaStream.stopVideo().catch((err) => {
            console.error("Failed to stop video:", err);
          });
          setIsStartedVideo(false);
        } else if (event.data === "MicOn") {
          console.log("handlePostMessage");
          onPostMsgAudio(false);
        } else if (event.data === "MicOff") {
          console.log("handlePostMessage");
          onPostMsgAudio(true);
        } else if (event.data === "leaveSession") {
          if (zmClient) {
            console.log(
              "handlePostMessagehandlePostMessage Leaving the session"
            );
            // if recording is on then on leave recording will be end:
            // recordingClient?.stopCloudRecording();
            // window.parent.postMessage("RecordingStopMsgFromIframe", "*");
            console.log(
              "handlePostMessagehandlePostMessage RecordingStopMsgFromIframe"
            );
            zmClient.leave();
          }
        } else if (event.data === "SidebarView") {
          if (zmClient) {
            console.log("handlePostMessagehandlePostMessage SidebarView");
          }
        } else if (event.data === "TileView") {
          if (zmClient) {
            console.log("handlePostMessagehandlePostMessage TileView");
          }
        } else if (event.data === "RecordingStartMsgFromIframe") {
          if (zmClient) {
            recordingClient?.startCloudRecording();
            window.parent.postMessage("RecordingStartMsgFromIframe", "*");
            console.log(
              "handlePostMessagehandlePostMessage RecordingStartMsgFromIframe"
            );
          }
        } else if (event.data === "RecordingResumeMsgFromIframe") {
          if (zmClient) {
            recordingClient?.resumeCloudRecording();
            window.parent.postMessage("RecordingResumeMsgFromIframe", "*");
            console.log(
              "handlePostMessagehandlePostMessage RecordingResumeMsgFromIframe"
            );
          }
        } else if (event.data === "RecordingStopMsgFromIframe") {
          if (zmClient) {
            recordingClient?.stopCloudRecording();
            window.parent.postMessage("RecordingStopMsgFromIframe", "*");
            console.log(
              "handlePostMessagehandlePostMessage RecordingStopMsgFromIframe"
            );
          }
        } else if (event.data === "RecordingPauseMsgFromIframe") {
          if (zmClient) {
            recordingClient?.pauseCloudRecording();
            window.parent.postMessage("RecordingPauseMsgFromIframe", "*");
            console.log(
              "handlePostMessagehandlePostMessage RecordingPauseMsgFromIframe"
            );
          }
        }
      }
    };

    // Add event listener for postMessage
    window.addEventListener("message", handlePostMessage);

    // Cleanup event listener when the component unmounts
    return () => {
      // zmClient.leave();
      window.removeEventListener("message", handlePostMessage);
    };
  }, [mediaStream]);

  const onScreenShareClick = useCallback(async () => {
    try {
      console.log("handlePostMessage", ShareStatus);
      console.log("handlePostMessage", selfShareCanvas);
      console.log("handlePostMessage", mediaStream?.getShareStatus());
      if (
        mediaStream?.getShareStatus() === ShareStatus.End &&
        selfShareCanvas
      ) {
        console.log("handlePostMessage");
        await mediaStream?.startShareScreen(selfShareCanvas, {
          requestReadReceipt: true,
        });
        window.parent.postMessage("ScreenSharedMsgFromIframe", "*"); // Notify parent window
      } else {
        console.log("handlePostMessage");
        await mediaStream?.stopShareScreen();
        console.log("ScreenSharedStopMsgFromIframe");
        window.parent.postMessage("ScreenSharedStopMsgFromIframe", "*"); // Notify parent window
      }
    } catch (err) {
      // Narrow the error type
      const errorMessage =
        (err as { reason?: string }).reason || "Unknown error";
      console.log("handlePostMessage", errorMessage);
      mediaStream?.stopShareScreen();
      window.parent.postMessage("ScreenSharedStopMsgFromIframe", "*");
    }
  }, [mediaStream, selfShareCanvas]);

  const onPostMsgAudio = async (flag2: boolean) => {
    if (!mediaStream) {
      return;
    }
    if (flag2) {
      console.log("handlePostMessage");
      await mediaStream?.unmuteAudio();
    } else {
      console.log("handlePostMessage");
      await mediaStream?.muteAudio();
    }
  };

  useEffect(() => {
    if (!mediaStream) {
      return;
    }
    console.log("handlePostMessage video");

    //When Stream is connected then Recording should be start automatically
    // recordingClient?.startCloudRecording();
    // window.parent.postMessage('RecordingStartMsgFromIframe', '*');

    console.log(
      { videoParam, mediaStream },
      "mediaStreammediaStreammediaStream"
    );
    console.log(
      mediaStream?.isBrowserSupportPTZ,
      "mediaStreammediaStreammediaStream"
    );

    // Handle video based on URL parameter
    if (videoParam === "false") {
      const startVideoOptions = {
        hd: true,
        fullHd: true,
        ptz: mediaStream?.isBrowserSupportPTZ(),
        originalRatio: true,
      };

      // Removed virtual background configuration
      mediaStream.startVideo(startVideoOptions).catch((err) => {
        console.log("MediaStream Failed to start video:", err);
      });
      setIsStartedVideo(true);
    } else if (videoParam === "true") {
      mediaStream.stopVideo().catch((err) => {
        console.log("MediaStream Failed to stop video:", err);
      });
      setIsStartedVideo(false);
    }
  }, [mediaStream, videoParam]);

  const onCameraClick = useCallback(async () => {
    if (isStartedVideo) {
      await mediaStream?.stopVideo();
      setIsStartedVideo(false);
      if (activePlaybackUrl) {
        await mediaStream?.switchMicrophone("default");
        setActiveMicrophone(mediaStream?.getActiveMicrophone());
        setActivePlaybackUrl("");
      }
    } else {
      const startVideoOptions = {
        hd: true,
        fullHd: true,
        ptz: mediaStream?.isBrowserSupportPTZ(),
        originalRatio: true,
      };
      if (mediaStream?.isSupportVirtualBackground() && isBlur) {
        Object.assign(startVideoOptions, {
          virtualBackground: { imageUrl: "blur" },
        });
      }
      await mediaStream?.startVideo(startVideoOptions);
      setIsStartedVideo(true);
    }
  }, [mediaStream, isStartedVideo, zmClient, isBlur, activePlaybackUrl]);

  async function waitForMicrophoneAndTrigger() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Check if any audio tracks are live
      const audioTrack = stream.getAudioTracks()[0];

      if (audioTrack.readyState === "live") {
        console.log("Microphone stream is active!");
        if (checkValuFlag) {
          onMicrophoneClick();
        }
      } else {
        // Listen for when the track becomes active
        audioTrack.onunmute = () => {
          console.log("Microphone unmuted and active!");
          if (checkValuFlag) {
            onMicrophoneClick();
          }
        };
      }
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  }

  useEffect(() => {
    console.log("onMicrophoneClick audio");
    if (!checkValuFlag && mediaStream) {
      console.log("onMicrophoneClick audio");
      checkValuFlag = true;
      waitForMicrophoneAndTrigger();
    }
  }, [mediaStream]);

  useEffect(() => {
    console.log("handlePostMessage audio", micParam);
    if (isStartedAudio) {
      if (micParam === "false") {
        console.log("handlePostMessage audio");
        mediaStream?.unmuteAudio();
      } else {
        console.log("handlePostMessage audio");
        mediaStream?.muteAudio();
      }
    }
  }, [isStartedAudio]);

  const onMicrophoneClick = useCallback(async () => {
    console.log("onMicrophoneClick audio");
    if (!mediaStream) {
      return;
    }
    try {
      if (activePlaybackUrl) {
        console.log("onMicrophoneClick audio");
        await mediaStream?.startAudio({
          mediaFile: { url: activePlaybackUrl, loop: true },
        });
      } else {
        console.log("onMicrophoneClick audio");
        await mediaStream?.startAudio({ highBitrate: true });
      }

      setActiveMicrophone(mediaStream?.getActiveMicrophone());
      setIsStartedAudio(true);
    } catch (e: any) {
      if (
        e.type === "INSUFFICIENT_PRIVILEGES" &&
        e.reason === "USER_FORBIDDEN_MICROPHONE"
      ) {
        setIsMicrophoneForbidden(true);
      }
      console.warn(e);
    }
  }, [mediaStream, activePlaybackUrl]);

  const onMicrophoneMenuClick = async (key: string) => {
    if (mediaStream) {
      const [type, deviceId] = key.split("|");
      if (type === "microphone") {
        if (deviceId !== activeMicrophone) {
          await mediaStream.switchMicrophone(deviceId);
          setActiveMicrophone(mediaStream.getActiveMicrophone());
        }
      } else if (type === "speaker") {
        if (deviceId !== activeSpeaker) {
          await mediaStream.switchSpeaker(deviceId);
          setActiveSpeaker(mediaStream.getActiveSpeaker());
        }
      } else if (type === "leave audio") {
        if (audio === "computer") {
          await mediaStream.stopAudio();
          setIsMicrophoneForbidden(false);
        } else if (audio === "phone") {
          await mediaStream.hangup();
          setPhoneCallStatus(undefined);
        }
      } else if (type === "statistic") {
        setSelectedStatisticTab("audio");
        setStatisticVisible(true);
      } else if (type === "secondary audio") {
        if (isSecondaryAudioStarted) {
          await mediaStream.stopSecondaryAudio();
          setIsSecondaryAudioStarted(false);
        } else {
          const selectedMic = secondaryMicForm.getFieldValue("mic");
          if (
            !mediaStream
              .getMicList()
              .some((item) => item.deviceId === selectedMic)
          ) {
            secondaryMicForm.setFieldValue("mic", undefined);
          }
          Modal.confirm({
            title: "Start secondary audio",
            content: (
              <Form form={secondaryMicForm}>
                <Form.Item label="Microphone" name="mic" required>
                  <Select
                    options={mediaStream.getMicList().map((item) => ({
                      value: item.deviceId,
                      label: item.label,
                      disabled:
                        item.deviceId === mediaStream.getActiveMicrophone() ||
                        item.label ===
                          mediaStream
                            .getMicList()
                            ?.find(
                              (item) =>
                                item.deviceId ===
                                mediaStream.getActiveMicrophone()
                            )?.label,
                    }))}
                  />
                </Form.Item>
                <Form.Item label="Contraintes" name="constraints">
                  <Checkbox.Group
                    options={[
                      { label: "AGC", value: "autoGainControl" },
                      {
                        label: "ANC",
                        value: "noiseSuppression",
                      },
                      {
                        label: "AEC",
                        value: "echoCancellation",
                      },
                    ]}
                  />
                </Form.Item>
              </Form>
            ),
            onOk: async () => {
              try {
                const data = await secondaryMicForm.validateFields();
                const { mic, constraints } = data;
                const option = {
                  autoGainControl: false,
                  noiseSuppression: false,
                  echoCancellation: false,
                };
                if (constraints) {
                  constraints.forEach((key: string) => {
                    Object.assign(option, { [`${key}`]: true });
                  });
                }
                await mediaStream.startSecondaryAudio(mic, option);
                setIsSecondaryAudioStarted(true);
              } catch (e) {
                console.warn(e);
              }
            },
          });
        }
      }
    }
  };

  const onSwitchCamera = async (key: string) => {
    if (mediaStream) {
      if (activeCamera !== key) {
        await mediaStream.switchCamera(key);
        setActiveCamera(mediaStream.getActiveCamera());
        if (activePlaybackUrl) {
          await mediaStream.switchMicrophone("default");
          setActiveMicrophone(mediaStream.getActiveMicrophone());
          console.log("handlePostMessagehandlePostMessage");
          setActivePlaybackUrl("");
        }
      }
    }
  };

  const onMirrorVideo = async () => {
    await mediaStream?.mirrorVideo(!isMirrored);
    setIsMirrored(!isMirrored);
  };

  const onBlurBackground = async () => {
    const isSupportVirtualBackground =
      mediaStream?.isSupportVirtualBackground();
    if (isSupportVirtualBackground) {
      if (isBlur) {
        await mediaStream?.updateVirtualBackgroundImage(undefined);
      } else {
        await mediaStream?.updateVirtualBackgroundImage("blur");
      }
    } else {
      setVideoMaskVisible(true);
    }

    setIsBlur(!isBlur);
  };

  const onPhoneCall = async (
    code: string,
    phoneNumber: string,
    name: string,
    option: DialOutOption
  ) => {
    await mediaStream?.inviteByPhone(code, phoneNumber, name, option);
  };

  const onPhoneCallCancel = async (
    code: string,
    phoneNumber: string,
    option: { callMe: boolean }
  ) => {
    if (
      [
        DialoutState.Calling,
        DialoutState.Ringing,
        DialoutState.Accepted,
      ].includes(phoneCallStatus as any)
    ) {
      await mediaStream?.cancelInviteByPhone(code, phoneNumber, option);
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(true);
        }, 3000);
      });
    }
    return Promise.resolve();
  };

  const onHostAudioMuted = useCallback(
    (payload: any) => {
      const { action, source, type } = payload;
      const currentUser = zmClient.getCurrentUserInfo();

      setIsStartedAudio(
        currentUser.audio === "computer" || currentUser.audio === "phone"
      );
      setAudio(currentUser.audio);
      if (action === AudioChangeAction.Join) {
        setIsStartedAudio(true);
        setAudio(type);
      } else if (action === AudioChangeAction.Leave) {
        setIsStartedAudio(false);
      } else if (action === AudioChangeAction.Muted) {
        if (source === MutedSource.PassiveByMuteOne) {
          message.info("Host muted you");
        }
      } else if (action === AudioChangeAction.Unmuted) {
        if (source === "passive") {
          message.info("Host unmuted you");
        }
      }
    },
    [zmClient]
  );

  // const onScreenShareClick = useCallback(async () => {
  //   if (mediaStream?.getShareStatus() === ShareStatus.End && selfShareCanvas) {
  //     await mediaStream?.startShareScreen(selfShareCanvas, { requestReadReceipt: true });
  //   }
  // }, [mediaStream, selfShareCanvas]);

  const onLiveTranscriptionClick = useCallback(async () => {
    if (isDisableCaptions) {
      message.info("Captions has been disable by host.");
    } else if (isStartedLiveTranscription) {
      message.info("Live transcription has started.");
    } else if (!isStartedLiveTranscription) {
      await liveTranscriptionClient?.startLiveTranscription();
      setIsStartedLiveTranscription(true);
    }
  }, [isStartedLiveTranscription, isDisableCaptions, liveTranscriptionClient]);

  const onDisableCaptions = useCallback(
    async (disable: boolean) => {
      if (disable && !isDisableCaptions) {
        await liveTranscriptionClient?.disableCaptions(disable);
        setIsStartedLiveTranscription(false);
        setIsDisableCaptions(true);
      } else if (!disable && isDisableCaptions) {
        await liveTranscriptionClient?.disableCaptions(disable);
        setIsDisableCaptions(false);
      }
    },
    [isDisableCaptions, liveTranscriptionClient]
  );

  const onLeaveClick = useCallback(async () => {
    console.log("handlePostMessagehandlePostMessage Leaving the session");
    recordingClient?.stopCloudRecording();
    window.parent.postMessage("RecordingStopMsgFromIframe", "*");
    console.log(
      "handlePostMessagehandlePostMessage RecordingStopMsgFromIframe"
    );
    await zmClient.leave();
  }, [zmClient]);

  const onEndClick = useCallback(async () => {
    console.log("handlePostMessagehandlePostMessage Leaving the session");
    recordingClient?.stopCloudRecording();
    window.parent.postMessage("RecordingStopMsgFromIframe", "*");
    console.log(
      "handlePostMessagehandlePostMessage RecordingStopMsgFromIframe"
    );
    await zmClient.leave(true);
  }, [zmClient]);

  const onPassivelyStopShare = useCallback(({ reason }: any) => {
    window.parent.postMessage("ScreenSharedStopMsgFromIframe", "*");

    console.log("passively stop reason:", reason);
  }, []);

  const onDeviceChange = useCallback(() => {
    if (mediaStream) {
      setMicList(mediaStream.getMicList());
      setSpeakerList(mediaStream.getSpeakerList());
      if (!isAndroidOrIOSBrowser()) {
        setCameraList(mediaStream.getCameraList());
      }
      setActiveMicrophone(mediaStream.getActiveMicrophone());
      setActiveSpeaker(mediaStream.getActiveSpeaker());
      setActiveCamera(mediaStream.getActiveCamera());
    }
  }, [mediaStream]);

  const onRecordingChange = useCallback(() => {
    setRecordingStatus(recordingClient?.getCloudRecordingStatus() || "");
  }, [recordingClient]);

  const onRecordingISOChange = useCallback(
    (payload: any) => {
      if (
        payload?.userId === zmClient.getSessionInfo().userId ||
        payload?.status === RecordingStatus.Ask
      ) {
        setRecordingIsoStatus(payload?.status);
      }
      console.log("recording-iso-change", payload);
    },
    [zmClient]
  );

  const onDialOutChange = useCallback((payload: any) => {
    setPhoneCallStatus(payload.code);
  }, []);

  const onRecordingClick = useCallback(async (key: string) => {
    try {
      switch (key) {
        case "Record": {
          await recordingClient?.startCloudRecording();
          window.parent.postMessage("RecordingStartMsgFromIframe", "*");
          break;
        }
        case "Resume": {
          await recordingClient?.resumeCloudRecording();
          window.parent.postMessage("RecordingResumeMsgFromIframe", "*");
          break;
        }
        case "Stop": {
          await recordingClient?.stopCloudRecording();
          window.parent.postMessage("RecordingStopMsgFromIframe", "*");
          break;
        }
        case "Pause": {
          await recordingClient?.pauseCloudRecording();
          window.parent.postMessage("RecordingPauseMsgFromIframe", "*");
          break;
        }
        default: {
          await recordingClient?.startCloudRecording();
          window.parent.postMessage("RecordingStartMsgFromIframe", "*");
        }
      }
    } catch (err) {
      const errorMessage =
        (err as { reason?: string }).reason || "Unknown error";
      console.log("Recording error:", errorMessage);
    }
  }, []);

  const onVideoCaptureChange = useCallback((payload: any) => {
    if (payload.state === VideoCapturingState.Started) {
      setIsStartedVideo(true);
    } else {
      setIsStartedVideo(false);
    }
  }, []);

  const onShareAudioChange = useCallback(
    (payload: any) => {
      const { state } = payload;
      if (state === "on") {
        if (!mediaStream?.isSupportMicrophoneAndShareAudioSimultaneously()) {
          setIsComputerAudioDisabled(true);
        }
      } else if (state === "off") {
        setIsComputerAudioDisabled(false);
      }
    },
    [mediaStream]
  );

  const onHostAskToUnmute = useCallback(
    (payload: any) => {
      const { reason } = payload;
      Modal.confirm({
        title: "Unmute audio",
        content: `Host ask to unmute audio, reason: ${reason}`,
        onOk: async () => {
          await mediaStream?.unmuteAudio();
        },
        onCancel() {
          console.log("cancel");
        },
      });
    },
    [mediaStream]
  );

  const onCaptionStatusChange = useCallback((payload: any) => {
    const { autoCaption } = payload;
    if (autoCaption) {
      message.info("Auto live transcription enabled!");
    }
  }, []);

  const onCaptionMessage = useCallback((payload: any) => {
    const { text, done } = payload;
    setCaption({
      text,
      isOver: done,
    });
  }, []);

  const onCaptionDisable = useCallback((payload: any) => {
    setIsDisableCaptions(payload);
    if (payload) {
      setIsStartedLiveTranscription(false);
    }
  }, []);

  const onCanSeeMyScreen = useCallback(() => {
    message.info("Users can now see your screen", 1);
  }, []);

  const onSelectVideoPlayback = useCallback(
    async (url: string) => {
      if (activePlaybackUrl !== url) {
        await mediaStream?.switchCamera({ url, loop: true });
        if (isStartedAudio) {
          await mediaStream?.switchMicrophone({ url, loop: true });
        } else {
          await mediaStream?.startAudio({ mediaFile: { url, loop: true } });
        }
        console.log("handlePostMessagehandlePostMessage");
        setActivePlaybackUrl(url);
      }
    },
    [isStartedAudio, activePlaybackUrl, mediaStream]
  );

  const onLiveStreamClick = useCallback(() => {
    if (liveStreamStatus === LiveStreamStatus.Ended) {
      setLiveStreamVisible(true);
    } else if (liveStreamStatus === LiveStreamStatus.InProgress) {
      liveStreamClient?.stopLiveStream();
    }
  }, [liveStreamStatus, liveStreamClient]);

  const onLiveStreamStatusChange = useCallback((status: any) => {
    setLiveStreamStatus(status);
    if (status === LiveStreamStatus.Timeout) {
      message.error("Start live streaming timeout");
    }
  }, []);

  useEffect(() => {
    zmClient.on("current-audio-change", onHostAudioMuted);
    zmClient.on("passively-stop-share", onPassivelyStopShare);
    zmClient.on("device-change", onDeviceChange);
    zmClient.on("recording-change", onRecordingChange);
    zmClient.on("individual-recording-change", onRecordingISOChange);
    zmClient.on("dialout-state-change", onDialOutChange);
    zmClient.on("video-capturing-change", onVideoCaptureChange);
    zmClient.on("share-audio-change", onShareAudioChange);
    zmClient.on("host-ask-unmute-audio", onHostAskToUnmute);
    zmClient.on("caption-status", onCaptionStatusChange);
    zmClient.on("caption-message", onCaptionMessage);
    zmClient.on("caption-host-disable", onCaptionDisable);
    zmClient.on("share-can-see-screen", onCanSeeMyScreen);
    zmClient.on("live-stream-status", onLiveStreamStatusChange);
    return () => {
      zmClient.off("current-audio-change", onHostAudioMuted);
      zmClient.off("passively-stop-share", onPassivelyStopShare);
      zmClient.off("device-change", onDeviceChange);
      zmClient.off("recording-change", onRecordingChange);
      zmClient.off("individual-recording-change", onRecordingISOChange);
      zmClient.off("dialout-state-change", onDialOutChange);
      zmClient.off("video-capturing-change", onVideoCaptureChange);
      zmClient.off("share-audio-change", onShareAudioChange);
      zmClient.off("host-ask-unmute-audio", onHostAskToUnmute);
      zmClient.off("caption-status", onCaptionStatusChange);
      zmClient.off("caption-message", onCaptionMessage);
      zmClient.off("caption-host-disable", onCaptionDisable);
      zmClient.off("share-can-see-screen", onCanSeeMyScreen);
      zmClient.off("live-stream-status", onLiveStreamStatusChange);
    };
  }, [
    zmClient,
    onHostAudioMuted,
    onPassivelyStopShare,
    onDeviceChange,
    onRecordingChange,
    onDialOutChange,
    onVideoCaptureChange,
    onShareAudioChange,
    onHostAskToUnmute,
    onCaptionStatusChange,
    onCaptionMessage,
    onCanSeeMyScreen,
    onRecordingISOChange,
    onCaptionDisable,
    onLiveStreamStatusChange,
  ]);

  useUnmount(() => {
    if (zmClient.getSessionInfo().isInMeeting) {
      if (isStartedAudio) {
        mediaStream?.stopAudio();
      }
      if (isStartedVideo) {
        mediaStream?.stopVideo();
      }
      mediaStream?.stopShareScreen();
      // recordingClient?.stopCloudRecording();
    }
  });

  useMount(() => {
    if (mediaStream) {
      setIsSupportPhone(!!mediaStream.isSupportPhoneFeature());
      setPhoneCountryList(mediaStream.getSupportCountryInfo() || []);
      setSharePrivileg(mediaStream.getSharePrivilege());
      if (isAndroidOrIOSBrowser()) {
        setCameraList([
          { deviceId: MobileVideoFacingMode.User, label: "Front-facing" },
          { deviceId: MobileVideoFacingMode.Environment, label: "Rear-facing" },
        ]);
      }
    }
  });

  useEffect(() => {
    if (
      mediaStream &&
      zmClient.getSessionInfo().isInMeeting &&
      statisticVisible
    ) {
      mediaStream.subscribeAudioStatisticData();
      mediaStream.subscribeVideoStatisticData();
      mediaStream.subscribeShareStatisticData();
    }
    return () => {
      if (zmClient.getSessionInfo().isInMeeting) {
        mediaStream?.unsubscribeAudioStatisticData();
        mediaStream?.unsubscribeVideoStatisticData();
        mediaStream?.unsubscribeShareStatisticData();
      }
    };
  }, [mediaStream, zmClient, statisticVisible]);

  const recordingButtons: RecordButtonProps[] = getRecordingButtons(
    recordingStatus,
    zmClient.isHost()
  );

  return (
    <div className={classNames("video-footer", className)}>
      {isAudioEnable && (
        <MicrophoneButton
          isStartedAudio={isStartedAudio}
          isMuted={isMuted}
          isSupportPhone={isSupportPhone}
          audio={audio}
          phoneCountryList={phoneCountryList}
          onPhoneCallClick={onPhoneCall}
          onPhoneCallCancel={onPhoneCallCancel}
          phoneCallStatus={getPhoneCallStatusDescription(phoneCallStatus)}
          onMicrophoneClick={onMicrophoneClick}
          onMicrophoneMenuClick={onMicrophoneMenuClick}
          microphoneList={micList}
          speakerList={speakerList}
          activeMicrophone={activeMicrophone}
          activeSpeaker={activeSpeaker}
          disabled={isComputerAudioDisabled}
          isMicrophoneForbidden={isMicrophoneForbidden}
          isSecondaryAudioStarted={isSecondaryAudioStarted}
        />
      )}
      <CameraButton
        isStartedVideo={isStartedVideo}
        onCameraClick={onCameraClick}
        onSwitchCamera={onSwitchCamera}
        onMirrorVideo={onMirrorVideo}
        onVideoStatistic={() => {
          setSelectedStatisticTab("video");
          setStatisticVisible(true);
        }}
        onBlurBackground={onBlurBackground}
        onSelectVideoPlayback={onSelectVideoPlayback}
        activePlaybackUrl={activePlaybackUrl}
        cameraList={cameraList}
        activeCamera={activeCamera}
        isMirrored={isMirrored}
        isBlur={isBlur}
      />
      {sharing && (
        <ScreenShareButton
          sharePrivilege={sharePrivilege}
          isHostOrManager={zmClient.isHost() || zmClient.isManager()}
          onScreenShareClick={onScreenShareClick}
          onSharePrivilegeClick={async (privilege) => {
            await mediaStream?.setSharePrivilege(privilege);
            setSharePrivileg(privilege);
          }}
        />
      )}
      {!zmClient?.getCurrentUserInfo()?.subsessionId &&
        recordingButtons.map((button: RecordButtonProps) => {
          return (
            <RecordingButton
              key={button.text}
              onClick={() => {
                onRecordingClick(button.text);
              }}
              {...button}
            />
          );
        })}
      {liveTranscriptionClient?.getLiveTranscriptionStatus()
        .isLiveTranscriptionEnabled && (
        <>
          <LiveTranscriptionButton
            isStartedLiveTranscription={isStartedLiveTranscription}
            isDisableCaptions={isDisableCaptions}
            isHost={zmClient.isHost()}
            onDisableCaptions={onDisableCaptions}
            onLiveTranscriptionClick={onLiveTranscriptionClick}
          />
          <TranscriptionSubtitle text={caption.text} />
        </>
      )}
      {liveStreamClient?.isLiveStreamEnabled() && zmClient.isHost() && (
        <>
          <LiveStreamButton
            isLiveStreamOn={liveStreamStatus === LiveStreamStatus.InProgress}
            onLiveStreamClick={onLiveStreamClick}
          />
          <LiveStreamModal
            visible={liveStreamVisible}
            setVisible={setLiveStreamVisible}
            onStartLiveStream={(
              streanUrl: string,
              streamKey: string,
              broadcastUrl: string
            ) => {
              liveStreamClient.startLiveStream(
                streanUrl,
                streamKey,
                broadcastUrl
              );
            }}
          />
        </>
      )}
      {liveStreamStatus === LiveStreamStatus.InProgress && (
        <IconFont
          type="icon-live"
          style={{
            position: "fixed",
            top: "45px",
            left: "10px",
            color: "#f00",
          }}
        />
      )}
      {isSecondaryAudioStarted && (
        <Tooltip title="Secondary audio on">
          <SoundOutlined
            style={{
              position: "fixed",
              top: "45px",
              left: "10px",
              color: "#f60",
              fontSize: "24px",
            }}
          />
        </Tooltip>
      )}
      <LeaveButton
        onLeaveClick={onLeaveClick}
        isHost={zmClient.isHost()}
        onEndClick={onEndClick}
      />

      <AudioVideoStatisticModal
        visible={statisticVisible}
        setVisible={setStatisticVisible}
        defaultTab={selecetedStatisticTab}
        isStartedAudio={isStartedAudio}
        isMuted={isMuted}
        isStartedVideo={isStartedVideo}
      />

      {recordingIsoStatus === RecordingStatus.Ask && (
        <IsoRecordingModal
          onClick={() => {
            recordingClient?.acceptIndividualRecording();
          }}
          onCancel={() => {
            recordingClient?.declineIndividualRecording();
          }}
        />
      )}
      {!mediaStream?.isSupportVirtualBackground() && (
        <VideoMaskModel
          visible={videoMaskVisible}
          setVisible={setVideoMaskVisible}
          isMirrored={isMirrored}
        />
      )}
    </div>
  );
};
export default VideoFooter;
