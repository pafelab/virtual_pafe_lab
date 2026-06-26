import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, } from "vitest";
import { useOfficeSocket } from "../hooks/useOfficeSocket";

// Minimal controllable WebSocket mock.
class MockWS {
  constructor() { MockWS.instance = this; }
  send() {}
  close() {}
}
beforeEach(() => { global.WebSocket = MockWS; });

function fire(data) {
  act(() => MockWS.instance.onmessage({ data: JSON.stringify(data) }));
}

describe("useOfficeSocket", () => {
  it("hydrates from a snapshot", () => {
    const { result } = renderHook(() => useOfficeSocket());
    fire({ type: "snapshot", payload: [{ agent_id: 1, name: "Anya", status: "idle", progress: 0 }] });
    expect(result.current.agents[1].name).toBe("Anya");
  });

  it("applies incremental status updates", () => {
    const { result } = renderHook(() => useOfficeSocket());
    fire({ type: "agent_status", payload: { agent_id: 2, status: "coding", detail: "x", progress: 50 } });
    expect(result.current.agents[2].status).toBe("coding");
  });

  it("appends activity logs", () => {
    const { result } = renderHook(() => useOfficeSocket());
    fire({ type: "activity_log", payload: { message: "supervisor → qa", log_type: "info" } });
    expect(result.current.logs.at(-1).message).toBe("supervisor → qa");
  });
});
