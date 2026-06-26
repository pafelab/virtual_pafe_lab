import { useEffect, useRef, useState } from "react";
import { WS_URL } from "../api/client";

// Subscribes to the Hub. Returns live agent states (keyed by id) and a log buffer.
export function useOfficeSocket() {
  const [agents, setAgents] = useState({});   // { [agentId]: {status, detail, progress} }
  const [logs, setLogs] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => {
    let alive = true;

    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const { type, payload } = JSON.parse(event.data);
        if (type === "snapshot") {
          const map = {};
          payload.forEach((s) => (map[s.agent_id] = s));
          setAgents(map);
        } else if (type === "agent_status") {
          setAgents((prev) => ({ ...prev, [payload.agent_id]: payload }));
        } else if (type === "activity_log") {
          setLogs((prev) => [...prev.slice(-199), { ...payload, t: Date.now() }]);
        }
      };

      // Auto-reconnect with a small delay.
      ws.onclose = () => {
        if (alive) setTimeout(connect, 1500);
      };
    }

    connect();
    return () => {
      alive = false;
      wsRef.current?.close();
    };
  }, []);

  return { agents, logs };
}
