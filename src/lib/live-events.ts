// Event emitter for Server-Sent Events (SSE) and real-time synchronization
type LiveEventCallback = (data: { event: string; payload: any }) => void;

class LiveEventManager {
  private listeners: Map<string, Set<LiveEventCallback>> = new Map();

  subscribe(sessionId: string, callback: LiveEventCallback): () => void {
    if (!this.listeners.has(sessionId)) {
      this.listeners.set(sessionId, new Set());
    }
    this.listeners.get(sessionId)!.add(callback);

    return () => {
      const set = this.listeners.get(sessionId);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(sessionId);
        }
      }
    };
  }

  broadcast(sessionId: string, event: string, payload: any) {
    const set = this.listeners.get(sessionId);
    if (set) {
      set.forEach((cb) => {
        try {
          cb({ event, payload });
        } catch (e) {
          console.error("Live event callback error:", e);
        }
      });
    }

    // In-memory SSE broadcast to all connected clients
  }
}

const globalForLiveEvents = globalThis as unknown as {
  liveEventManager: LiveEventManager | undefined;
};

export const liveEvents = globalForLiveEvents.liveEventManager ?? new LiveEventManager();

if (process.env.NODE_ENV !== "production") {
  globalForLiveEvents.liveEventManager = liveEvents;
}
