import { Button, Tooltip, Dropdown } from "antd";
import classNames from "classnames";
import { IconFont } from "../../../component/icon-font";
import {
  LockOutlined,
  UnlockOutlined,
  UpOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import { SharePrivilege } from "@zoom/videosdk";
import { getAntdDropdownMenu, getAntdItem } from "./video-footer-utils";
import { useEffect, useRef } from "react";

const { Button: DropdownButton } = Dropdown;
interface ScreenShareButtonProps {
  sharePrivilege: SharePrivilege;
  isHostOrManager: boolean;
  onSharePrivilegeClick?: (privilege: SharePrivilege) => void;
  onScreenShareClick: () => void;
}

interface ScreenShareLockButtonProps {
  isLockedScreenShare: boolean;
  onScreenShareLockClick: () => void;
}

const ScreenShareButton = (props: ScreenShareButtonProps) => {
  const {
    sharePrivilege,
    isHostOrManager,
    onScreenShareClick,
    onSharePrivilegeClick,
  } = props;
  const menu = [
    getAntdItem(
      "Lock share",
      `${SharePrivilege.Locked}`,
      sharePrivilege === SharePrivilege.Locked && <CheckOutlined />
    ),
    getAntdItem(
      "One participant can share at a time",
      `${SharePrivilege.Unlocked}`,
      sharePrivilege === SharePrivilege.Unlocked && <CheckOutlined />
    ),
    getAntdItem(
      "Multiple participants can share simultaneously",
      `${SharePrivilege.MultipleShare}`,
      sharePrivilege === SharePrivilege.MultipleShare && <CheckOutlined />
    ),
  ];
  const onMenuItemClick = (payload: { key: any }) => {
    console.log("handlePostMessage", payload.key);
    onSharePrivilegeClick?.(Number(0));
  };
  const buttonRef = useRef<HTMLButtonElement | null>(null); // Create a ref for the button

  useEffect(() => {
    // This is your event listener where you can trigger the button click
    const handlePostMessage = (event: MessageEvent) => {
      console.log("handlePostMessage", event);
      if (
        event.origin === "http://localhost:3000" &&
        event.data === "ScreenShare"
      ) {
      // if (
      //   event.origin === "https://portal.letsdiskus.com" &&
      //   event.data === "ScreenShare"
      // ) {
        // if (
        //   event.origin === "https://secure.letsdiskus.com" &&
        //   event.data === "ScreenShare"
        // ) {
        if (buttonRef.current) {
          buttonRef.current.click(); // Programmatically click the button
        }
      }
    };

    window.addEventListener("message", handlePostMessage);

    // Cleanup the event listener when the component unmounts
    return () => {
      window.removeEventListener("message", handlePostMessage);
    };
  }, []);
  return (
    // eslint-disable-next-line react/jsx-no-useless-fragment
    <>
      {/* {isHostOrManager ? (
        <DropdownButton
          className="vc-dropdown-button"
          size="large"
          menu={getAntdDropdownMenu(menu, onMenuItemClick)}
          onClick={onScreenShareClick}
          trigger={['click']}
          type="ghost"
          icon={<UpOutlined />}
          placement="topRight"
        >
          <IconFont type="icon-share" />
        </DropdownButton>
      ) : ( */}
      <Button
        ref={buttonRef}
        className={classNames("screen-share-button", "vc-button")}
        icon={<IconFont type="icon-share" />}
        ghost={true}
        shape="circle"
        size="large"
        onClick={onScreenShareClick}
      />
      {/* )} */}
    </>
  );
};

const ScreenShareLockButton = (props: ScreenShareLockButtonProps) => {
  const { isLockedScreenShare, onScreenShareLockClick } = props;
  return (
    <Tooltip
      title={isLockedScreenShare ? "unlock screen share" : " lock screen share"}
    >
      <Button
        className="screen-share-button"
        icon={isLockedScreenShare ? <LockOutlined /> : <UnlockOutlined />}
        // eslint-disable-next-line react/jsx-boolean-value
        ghost={true}
        shape="circle"
        size="large"
        onClick={onScreenShareLockClick}
      />
    </Tooltip>
  );
};

export { ScreenShareButton, ScreenShareLockButton };
