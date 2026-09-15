from sqlalchemy import Column, Integer, String, Text, JSON, DateTime
from sqlalchemy.sql import func
from app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=True)
    requisito_norma = Column(Text, nullable=False)
    resultado = Column(JSON, nullable=False)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())