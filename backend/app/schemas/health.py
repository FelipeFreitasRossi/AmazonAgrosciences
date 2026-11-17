from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class DatabaseHealth(BaseModel):
    status: Literal["ok", "error"]
    latency_ms: float | None = Field(default=None, description="Latência do ping em ms")
    detail: str | None = None


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    app: str
    version: str
    environment: str
    database: DatabaseHealth
    timestamp: datetime
