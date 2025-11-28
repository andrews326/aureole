// src/components/Chat/ChatHeader.tsx

import { ArrowLeft, Phone, Video } from "lucide-react";
import AvatarCosmic from "@/components/AvatarCosmic";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useCallService } from "@/hooks/useCallService";
import { RootState } from "@/redux/store";

interface Props {
  partner: {
    full_name?: string;
    avatar?: string;
  } | null;
}

const ChatHeader = ({ partner }: Props) => {
  const navigate = useNavigate();
  const { userId: peerId } = useParams(); // peer being chatted with
  const { callService } = useCallService();

  const selfUserId = useSelector((state: RootState) => state.auth?.user?.id);
  const callState = useSelector((state: RootState) => state.call);

  const canCall =
    !!callService &&
    !!peerId &&
    !!selfUserId &&
    callState.status === "idle"; // prevent double calls

  const handleAudioCall = () => {
    if (!canCall) return;
    callService!.startCall(peerId!, "audio");
  };

  const handleVideoCall = () => {
    if (!canCall) return;
    callService!.startCall(peerId!, "video");
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-20 p-4">
      <div className="glass-header flex items-center gap-4 p-3 rounded-2xl justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>

          <AvatarCosmic src={partner?.avatar} verified={false} size={56} />

          <div>
            <p className="font-semibold text-white text-lg">
              {partner?.full_name}
            </p>
            <p className="text-xs text-cyan-400">Online</p>
          </div>
        </div>

        {/* Call Buttons */}
        {partner && (
          <div className="flex items-center gap-3">
            {/* Audio Call */}
            <button
              onClick={handleAudioCall}
              disabled={!canCall}
              className={`p-3 rounded-xl transition ${
                canCall
                  ? "bg-white/10 hover:bg-white/20"
                  : "bg-white/5 opacity-40 cursor-not-allowed"
              }`}
            >
              <Phone className="w-5 h-5 text-white" />
            </button>

            {/* Video Call */}
            <button
              onClick={handleVideoCall}
              disabled={!canCall}
              className={`p-3 rounded-xl transition ${
                canCall
                  ? "bg-white/10 hover:bg-white/20"
                  : "bg-white/5 opacity-40 cursor-not-allowed"
              }`}
            >
              <Video className="w-5 h-5 text-white" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;