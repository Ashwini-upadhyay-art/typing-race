"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Channel, Members } from "pusher-js";
import { getPusherClient } from "@/lib/pusher";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { roomActions, type PresenceMember } from "@/lib/store/slices/roomSlice";
import type {
  Difficulty,
  DifficultyEvent,
  FinishEvent,
  ProgressEvent,
  StartRaceEvent,
} from "@/types";

type PusherMember = { id: string; info?: { username?: string; joinedAt?: number } };

function memberToPresence(m: PusherMember): PresenceMember {
  return {
    id: m.id,
    username: m.info?.username ?? "Racer",
    joinedAt: m.info?.joinedAt ?? Date.now(),
  };
}

export function useRoomChannel(code: string | null) {
  const dispatch = useAppDispatch();
  const username = useAppSelector((s) => s.user.username);
  const selfId = useAppSelector((s) => s.room.selfId);
  const channelRef = useRef<Channel | null>(null);

  useEffect(() => {
    if (!code || !username) return;
    const channelName = `presence-room-${code}`;
    const pusher = getPusherClient(username);

    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    const onSubscribed = (members: Members) => {
      const arr: PresenceMember[] = [];
      members.each((m: PusherMember) => arr.push(memberToPresence(m)));
      dispatch(
        roomActions.initRoom({
          code,
          selfId: members.me?.id ?? pusher.connection.socket_id ?? "",
          members: arr,
        })
      );
    };
    const onMemberAdded = (m: PusherMember) =>
      dispatch(roomActions.memberAdded(memberToPresence(m)));
    const onMemberRemoved = (m: PusherMember) =>
      dispatch(roomActions.memberRemoved(m.id));
    const onDifficulty = (d: DifficultyEvent) =>
      dispatch(roomActions.setDifficulty(d.difficulty));
    const onStart = (d: StartRaceEvent) => dispatch(roomActions.raceCountdown(d));
    const onProgress = (d: ProgressEvent) => dispatch(roomActions.updateProgress(d));
    const onFinish = (d: FinishEvent) =>
      dispatch(
        roomActions.markFinished({
          playerId: d.playerId,
          wpm: d.wpm,
          accuracy: d.accuracy,
        })
      );

    channel.bind("pusher:subscription_succeeded", onSubscribed);
    channel.bind("pusher:member_added", onMemberAdded);
    channel.bind("pusher:member_removed", onMemberRemoved);
    channel.bind("client-difficulty", onDifficulty);
    channel.bind("client-start", onStart);
    channel.bind("client-progress", onProgress);
    channel.bind("client-finish", onFinish);

    return () => {
      channel.unbind("pusher:subscription_succeeded", onSubscribed);
      channel.unbind("pusher:member_added", onMemberAdded);
      channel.unbind("pusher:member_removed", onMemberRemoved);
      channel.unbind("client-difficulty", onDifficulty);
      channel.unbind("client-start", onStart);
      channel.unbind("client-progress", onProgress);
      channel.unbind("client-finish", onFinish);
      pusher.unsubscribe(channelName);
      channelRef.current = null;
    };
  }, [code, username, dispatch]);

  const emitDifficulty = useCallback(
    (difficulty: Difficulty) => {
      channelRef.current?.trigger("client-difficulty", { difficulty });
      dispatch(roomActions.setDifficulty(difficulty));
    },
    [dispatch]
  );

  const emitStart = useCallback(
    (payload: StartRaceEvent) => {
      channelRef.current?.trigger("client-start", payload);
      dispatch(roomActions.raceCountdown(payload));
    },
    [dispatch]
  );

  const emitProgress = useCallback(
    (payload: { progress: number; wpm: number; accuracy: number }) => {
      if (!selfId) return;
      const full: ProgressEvent = { playerId: selfId, ...payload };
      channelRef.current?.trigger("client-progress", full);
      dispatch(roomActions.updateProgress(full));
    },
    [selfId, dispatch]
  );

  const emitFinish = useCallback(
    (payload: { wpm: number; accuracy: number }) => {
      if (!selfId) return;
      const full: FinishEvent = {
        playerId: selfId,
        finishedAt: Date.now(),
        ...payload,
      };
      channelRef.current?.trigger("client-finish", full);
      dispatch(
        roomActions.markFinished({
          playerId: selfId,
          wpm: full.wpm,
          accuracy: full.accuracy,
        })
      );
    },
    [selfId, dispatch]
  );

  return { emitDifficulty, emitStart, emitProgress, emitFinish };
}
