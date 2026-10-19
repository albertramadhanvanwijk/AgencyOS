from typing import Dict, Any, List, Optional
from apps.api.adapters.base import EngineAdapter
from apps.api.adapters.mock_adapter import MockEngineAdapter
from apps.api.adapters.live_adapter import LiveLLMEngineAdapter, live_adapter
from apps.api.core.config import settings

mock_adapter = MockEngineAdapter()

ADAPTERS: Dict[str, EngineAdapter] = {
    "MockEngineAdapter": mock_adapter,
    "LiveLLMEngineAdapter": live_adapter,
}

def get_adapter(adapter_name: Optional[str] = None) -> EngineAdapter:
    if not adapter_name:
        adapter_name = settings.DEFAULT_ENGINE_ADAPTER or "MockEngineAdapter"
    
    # Fuzzy match lowercase
    for name, adapter in ADAPTERS.items():
        if name.lower() == adapter_name.lower() or name.lower().startswith(adapter_name.lower()):
            return adapter
            
    return mock_adapter

def list_adapters_info() -> List[Dict[str, Any]]:
    results = []
    for name, adapter in ADAPTERS.items():
        health = adapter.health_check()
        caps = adapter.get_capabilities()
        results.append({
            "name": name,
            "is_simulated": adapter.is_simulated,
            "status": health.get("status", "unknown"),
            "health_message": health.get("message", ""),
            "capabilities": caps,
            "is_default": (settings.DEFAULT_ENGINE_ADAPTER.lower() in name.lower()),
        })
    return results
