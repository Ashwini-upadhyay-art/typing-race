"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Channel, Members } from "pusher-js";
import { subscribeRoom, getPusherClient } from "@/lib/pusher";
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

    const channel = subscribeRoom(channelName, username);
    channelRef.current = channel;

    // If we're subscribing to a channel that's already in the subscribed
    // state (e.g. race page mounting after lobby already joined), Pusher
    // does NOT re-fire `pusher:subscription_succeeded`. So we re-emit the
    // current member list ourselves so initRoom runs for this hook too.
    type SubscribedPresence = {
      subscribed?: boolean;
      members?: Members;
    };
    const presence = channel as unknown as SubscribedPresence;
    if (presence.subscribed && presence.members) {
      const arr: PresenceMember[] = [];
      presence.members.each((m: PusherMember) => arr.push(memberToPresence(m)));
      dispatch(
        roomActions.initRoom({
          code,
          selfId: presence.members.me?.id ?? getPusherClient(username).connection.socket_id ?? "",
          members: arr,
        })
      );
    }

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
      // Only unbind THIS hook's handlers — leave the subscription itself
      // alive so the next page (e.g. race after lobby) inherits a fully
      // joined channel and doesn't have to re-auth. The subscription is
      // torn down explicitly via leaveRoom() when the user goes home.
      channel.unbind("pusher:subscription_succeeded", onSubscribed);
      channel.unbind("pusher:member_added", onMemberAdded);
      channel.unbind("pusher:member_removed", onMemberRemoved);
      channel.unbind("client-difficulty", onDifficulty);
      channel.unbind("client-start", onStart);
      channel.unbind("client-progress", onProgress);
      channel.unbind("client-finish", onFinish);
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
