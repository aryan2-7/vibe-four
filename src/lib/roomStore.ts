// src/lib/roomStore.ts
import { Board, createEmptyBoard, generateRoomCode } from "./game";

export type Player = {
  id: string;
  name: string;
  token: string;
  joinedAt: number;
  lastSeen: number;
};

export type Room = {
  code: string;
  board: Board;
  currentPlayer: 1 | 2;
  players: Player[]; // 0 = red (1), 1 = green (2)
  winner: 1 | 2 | "draw" | null;
  winningLine: [number, number][];
  status: "waiting" | "playing" | "finished" | "abandoned";
  createdAt: number;
  updatedAt: number;
  rematchRequests: string[]; // tokens
  moveCount: number;
  abandonedAt?: number;
  leftPlayers?: { id: string; name: string }[];
  scores: { p1: number; p2: number; draws: number };
};

// Type for client-safe room (no tokens leaked cross-player)
export type PublicRoom = Omit<Room, "players"> & {
  players: { id: string; name: string; lastSeen?: number }[];
  opponentLeft?: boolean;
  opponentDisconnected?: boolean;
};

// In-memory fallback for dev/local without Redis
const memStore = new Map<string, Room>();
const g = globalThis as unknown as { __memStore?: Map<string, Room> };
if (!g.__memStore) g.__memStore = memStore;
const store = g.__memStore!;

let redisClient: import("@upstash/redis").Redis | null = null;
function getRedis(): import("@upstash/redis").Redis | null {
  if (redisClient) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Redis } = require("@upstash/redis") as typeof import("@upstash/redis");
      redisClient = new Redis({ url, token });
      return redisClient;
    } catch {
      return null;
    }
  }
  return null;
}

const TTL_SECONDS = 60 * 60 * 4; // 4 hours
const STALE_MS = 15000; // 15s without heartbeat = disconnected

function roomKey(code: string) {
  return `vibe-four:room:${code}`;
}

export async function getRoom(code: string): Promise<Room | null> {
  const normalized = code.toUpperCase().trim();
  const redis = getRedis();
  let data: Room | null = null;
  if (redis) {
    data = (await redis.get<Room>(roomKey(normalized))) as Room | null;
  } else {
    data = store.get(normalized) || null;
  }
  if (data && !data.scores) {
    data.scores = { p1: 0, p2: 0, draws: 0 };
  }
  return data;
}

export async function setRoom(room: Room): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(roomKey(room.code), room, { ex: TTL_SECONDS });
  } else {
    store.set(room.code, room);
  }
}

export async function deleteRoom(code: string): Promise<void> {
  const normalized = code.toUpperCase().trim();
  const redis = getRedis();
  if (redis) await redis.del(roomKey(normalized));
  else store.delete(normalized);
}

export async function createRoom(playerName: string, playerId: string, token: string): Promise<Room> {
  let code = generateRoomCode();
  for (let i = 0; i < 5; i++) {
    const exists = await getRoom(code);
    if (!exists) break;
    code = generateRoomCode();
  }
  const now = Date.now();
  const room: Room = {
    code,
    board: createEmptyBoard(),
    currentPlayer: 1,
    players: [{ id: playerId, name: playerName.slice(0, 20), token, joinedAt: now, lastSeen: now }],
    winner: null,
    winningLine: [],
    status: "waiting",
    createdAt: now,
    updatedAt: now,
    rematchRequests: [],
    moveCount: 0,
    scores: { p1: 0, p2: 0, draws: 0 },
  };
  await setRoom(room);
  return room;
}

// Call on each GET/heartbeat to update lastSeen and detect disconnects
export async function touchRoom(code: string, token: string): Promise<Room | null> {
  const room = await getRoom(code);
  if (!room) return null;
  const now = Date.now();
  let changed = false;
  const p = room.players.find((pl) => pl.token === token);
  if (p) {
    if (now - p.lastSeen > 1000) {
      p.lastSeen = now;
      changed = true;
    }
  }
  // Prune abandoned rooms where one player left long ago? No auto-delete stale players, just mark disconnected
  // If status abandoned and both left? handled in leave
  if (changed) {
    room.updatedAt = now;
    await setRoom(room);
  }
  return room;
}

export async function leaveRoom(code: string, token: string): Promise<{ deleted: boolean; room: Room | null }> {
  const room = await getRoom(code);
  if (!room) return { deleted: true, room: null };
  const idx = room.players.findIndex((p) => p.token === token);
  if (idx === -1) return { deleted: false, room };

  const left = room.players[idx];
  // track who left for notification
  if (!room.leftPlayers) room.leftPlayers = [];
  room.leftPlayers.push({ id: left.id, name: left.name });

  room.players.splice(idx, 1);

  if (room.players.length === 0) {
    await deleteRoom(code);
    return { deleted: true, room: null };
  }

  // one player remains - mark abandoned if game was in progress
  if (room.status === "playing") {
    room.status = "abandoned";
    room.abandonedAt = Date.now();
  } else if (room.status === "waiting" || room.status === "finished") {
    // if waiting and host leaves, keep as waiting but with 1 player? Actually host left, remaining is none -> handled. If one left in waiting, should stay waiting? But waiting normally has 1 player, leaving leaves 0 -> deleted. If finished and one leaves, keep finished but will show opponent left.
  }
  room.updatedAt = Date.now();
  // after 30s of abandoned with no one joining, auto-delete via next touch? We leave TTL to handle, but also delete if last player leaves later
  await setRoom(room);
  return { deleted: false, room };
}

export function sanitizeRoom(room: Room, requesterToken?: string): PublicRoom & { yourToken?: string; yourPlayerNumber?: 1 | 2 | null } {
  let yourPlayerNumber: 1 | 2 | null = null;
  if (requesterToken) {
    const idx = room.players.findIndex((p) => p.token === requesterToken);
    if (idx !== -1) yourPlayerNumber = (idx + 1) as 1 | 2;
  }
  const now = Date.now();
  // opponent disconnected if not seen for STALE_MS
  let opponentDisconnected = false;
  if (room.players.length === 2 && requesterToken) {
    const oppIdx = yourPlayerNumber === 1 ? 1 : 0;
    const opp = room.players[oppIdx];
    if (opp && now - opp.lastSeen > STALE_MS) opponentDisconnected = true;
  } else if (room.players.length === 1 && room.status === "playing") {
    // possible transient where second player just left but not yet marked abandoned - treat as disconnected
    const only = room.players[0];
    if (only && requesterToken && only.token !== requesterToken) opponentDisconnected = true;
  }

  const opponentLeft = room.status === "abandoned" || (room.leftPlayers && room.leftPlayers.length > 0) ? true : false;
  // we show opponentLeft true only if the requester is still in room but the other has left
  const showLeft = opponentLeft && !!requesterToken && room.players.some((p) => p.token === requesterToken) && room.players.length === 1;

  return {
    ...room,
    players: room.players.map((p) => ({ id: p.id, name: p.name, lastSeen: p.lastSeen })),
    yourPlayerNumber,
    yourToken: requesterToken,
    opponentDisconnected,
    opponentLeft: showLeft,
  };
}

export function getPlayerNumber(room: Room, token: string): 1 | 2 | null {
  const idx = room.players.findIndex((p) => p.token === token);
  if (idx === -1) return null;
  return (idx + 1) as 1 | 2;
}
