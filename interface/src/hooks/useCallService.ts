// src/hooks/useCallService.ts
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import {
  incomingCall,
  outgoingCall,
  callActive,
  callEnded,
  callError,
} from "@/redux/slices/callSlice";
import { CallEvent } from "@/services/callService";
import { getCallService } from "@/services/callServiceInstance";

export function useCallService() {
  const dispatch = useDispatch();
  const auth = useSelector((state: RootState) => state.auth);

  const userId = auth?.user?.id;
  const token = auth?.token;

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const callService = getCallService(userId, token); // passive reference

  useEffect(() => {
    if (!callService) return;

    // Subscribe only — DO NOT CONNECT HERE
    const unsubscribe = callService.onEvent((evt: CallEvent) => {
      switch (evt.type) {
        case "incoming_call":
          dispatch(incomingCall(evt));
          break;

        case "outgoing_call_started":
          dispatch(outgoingCall(evt));
          break;

        case "call_active":
          dispatch(callActive(evt));
          break;

        case "call_ended":
        case "call_canceled":
        case "call_rejected":
          dispatch(callEnded(evt));
          break;

        case "local_stream":
          setLocalStream(evt.stream);
          break;

        case "remote_stream":
          setRemoteStream(evt.stream);
          break;

        case "error":
          dispatch(callError(evt.message));
          break;
      }
    });

    return () => unsubscribe();
  }, [callService, dispatch]);

  return { callService, localStream, remoteStream };
}
