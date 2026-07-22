import { v4 as uuid } from "uuid";
import { Room } from "./Room.js";
import { config } from "../config/index.js";

/**
 * In-memory room store. The method surface deliberately mirrors what a
 * Redis-backed adapter would need (get/set/delete/list), so migrating
 * later is a swap of the storage layer, not a rewrite of room logic.
 * See Blueprint Section 4 and Section 15 (Scalability).
 */
export class RoomManager {
  private rooms = new Map<string, Room>();
  private cleanupTimer: NodeJS.Timeout;

  constructor() {
    this.cleanupTimer = setInterval(() => this.sweepExpiredRooms(), 60 * 1000);
  }

  create(): Room {
    const id = uuid().slice(0, 8);
    const room = new Room(id);
    this.rooms.set(id, room);
    return room;
  }

  get(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  delete(roomId: string): void {
    const room = this.rooms.get(roomId);
    room?.dispose();
    this.rooms.delete(roomId);
  }

  list(): Room[] {
    return Array.from(this.rooms.values());
  }

  private sweepExpiredRooms(): void {
    for (const room of this.rooms.values()) {
      if (room.isEmpty() || room.isExpired(config.roomTtlMs)) {
        room.dispose();
        this.rooms.delete(room.id);
      }
    }
  }

  /** Call on server shutdown to clear the sweep interval. */
  dispose(): void {
    clearInterval(this.cleanupTimer);
  }
}
