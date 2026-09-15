from pydantic import BaseModel, Field
from typing import Literal

class AuditResultSchema(BaseModel):
    estado: Literal["Cumple", "No Cumple", "Cumplimiento Parcial"] = Field(
        description="Estado del cumplimiento normativo"
    )
    evidencia_brecha: str = Field(
        description="Detalle de las evidencias halladas o brechas detectadas"
    )
    sugerencia_mejora: str = Field(
        description="Recomendaciones o redacción sugerida para subsanar la no conformidad"
    )

class AuditResponse(BaseModel):
    id: int
    filename: str
    requisito_evaluado: str
    resultado_auditoria: AuditResultSchema
