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

def list_adapters_info(check_live: bool = False) -> List[Dict[str, Any]]:
    results = []
    for name, adapter in ADAPTERS.items():
        if isinstance(adapter, LiveLLMEngineAdapter) and not check_live:
            default_item = next((item for item in adapter._llm_configs.values() if item.get("is_default")), None)
            if default_item:
                health = {
                    "status": default_item.get("status", "not_configured"),
                    "message": default_item.get("health_message", ""),
                    "available_models": default_item.get("available_models", []),
                    "simulated": False
                }
            elif not adapter._llm_configs:
                health = {
                    "status": "not_configured",
                    "message": "Belum ada LLM yang terhubung. Tambahkan koneksi API Key di Settings.",
                    "simulated": False
                }
            else:
                health = {
                    "status": "not_configured",
                    "message": "Pilih salah satu LLM sebagai default.",
                    "simulated": False
                }
        else:
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
