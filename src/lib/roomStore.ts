// src/lib/roomStore.ts
import { Board, Cell, createEmptyBoard, generateRoomCode } from "./game";

export type Player = {
  id: string;
  name: string;
  token: string;
  joinedAt: number;
};

export type Room = {
  code: string;
  board: Board;
  currentPlayer: 1 | 2;
  players: Player[]; // 0 = red (1), 1 = yellow (2)
  winner: 1 | 2 | "draw" | null;
  winningLine: [number, number][];
  status: "waiting" | "playing" | "finished";
  createdAt: number;
  updatedAt: number;
  rematchRequests: string[]; // tokens
  moveCount: number;
};

// Type for client-safe room (no tokens leaked cross-player, but we keep showing minimal)
export type PublicRoom = Omit<Room, "players"> & { players: { id: string; name: string }[] };

// In-memory fallback for dev/local without Redis
const memStore = new Map<string, Room>();
// global to survive hot-reload in dev
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

function roomKey(code: string) {
  return `vibe-four:room:${code}`;
}

export async function getRoom(code: string): Promise<Room | null> {
  const normalized = code.toUpperCase().trim();
  const redis = getRedis();
  if (redis) {
    const data = await redis.get<Room>(roomKey(normalized));
    return data as Room | null;
  }
  return store.get(normalized) || null;
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
  // ensure uniqueness (retry up to 5)
  for (let i = 0; i < 5; i++) {
    const exists = await getRoom(code);
    if (!exists) break;
    code = generateRoomCode();
  }
  const room: Room = {
    code,
    board: createEmptyBoard(),
    currentPlayer: 1,
    players: [{ id: playerId, name: playerName.slice(0, 20), token, joinedAt: Date.now() }],
    winner: null,
    winningLine: [],
    status: "waiting",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    rematchRequests: [],
    moveCount: 0,
  };
  await setRoom(room);
  return room;
}

export function sanitizeRoom(room: Room, requesterToken?: string): PublicRoom & { yourToken?: string; yourPlayerNumber?: 1 | 2 | null } {
  // we expose player names + hide tokens from other players, but client needs to know its own number
  let yourPlayerNumber: 1 | 2 | null = null;
  if (requesterToken) {
    const idx = room.players.findIndex((p) => p.token === requesterToken);
    if (idx !== -1) yourPlayerNumber = (idx + 1) as 1 | 2;
  }
  return {
    ...room,
    players: room.players.map((p) => ({ id: p.id, name: p.name })),
    yourPlayerNumber,
    yourToken: requesterToken,
  };
}

export function getPlayerNumber(room: Room, token: string): 1 | 2 | null {
  const idx = room.players.findIndex((p) => p.token === token);
  if (idx === -1) return null;
  return (idx + 1) as 1 | 2;
}
