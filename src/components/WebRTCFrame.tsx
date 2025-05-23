import React from "react";

interface WebRTCFrameProps {
  authCode: string;
}

const WebRTCFrame: React.FC<WebRTCFrameProps> = ({ authCode }) => {
  const webrtcUrl = `https://indiavoice.rpdigitalphone.com/webrtc?authcode=${encodeURIComponent(authCode)}`;

  return (
    <div className="w-full h-[600px] border border-gray-300 rounded-lg overflow-hidden">
      <iframe
        src={webrtcUrl}
        width="100%"
        height="100%"
        allow="camera; microphone; fullscreen"
        className="border-none"
      />
    </div>
  );
};

export default WebRTCFrame;
