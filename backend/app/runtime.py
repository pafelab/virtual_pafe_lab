from app.hub.ws_broker import WebSocketBroker
from app.hub.state_manager import StateManager

# Created once and shared by routers, the WebSocket endpoint, and the orchestrator.
broker = WebSocketBroker()
hub = StateManager(broker)
