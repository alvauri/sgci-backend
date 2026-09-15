from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database import engine, Base, get_db
from app.models import AuditLog
from app.rag import evaluate_compliance
from app.schemas import AuditResponse

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SGCI Backend - ISO 9001 Auditor",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/v1/audit-document", response_model=AuditResponse, status_code=status.HTTP_201_CREATED)
async def audit_document(
    file: UploadFile = File(...),
    requisito_norma: str = Form(...),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="El archivo adjunto debe ser un PDF.")

    contents = await file.read()

    resultado_dict = evaluate_compliance(
        requisito_norma=requisito_norma,
        file_bytes=contents
    )

    nuevo_log = AuditLog(
        filename=file.filename,
        requisito_norma=requisito_norma,
        resultado=resultado_dict
    )
    db.add(nuevo_log)
    db.commit()
    db.refresh(nuevo_log)

    return {
        "id": nuevo_log.id,
        "filename": nuevo_log.filename,
        "requisito_evaluado": nuevo_log.requisito_norma,
        "resultado_auditoria": nuevo_log.resultado
    }

# 1. Endpoint de consulta con paginación y filtrado por estado
@app.get("/api/v1/audit-logs", response_model=List[AuditResponse])
def get_audit_logs(
    skip: int = Query(0, ge=0, description="Registros a omitir para paginación"),
    limit: int = Query(10, ge=1, le=100, description="Límite de registros por página"),
    estado: Optional[str] = Query(None, description="Filtrar por: Cumple, No Cumple, Cumplimiento Parcial"),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)

    # Filtrado dinámico dentro de la columna JSONB usando .astext de PostgreSQL
    if estado:
        query = query.filter(AuditLog.resultado["estado"].astext == estado)

    logs = query.order_by(AuditLog.id.desc()).offset(skip).limit(limit).all()

    return [
        {
            "id": log.id,
            "filename": log.filename,
            "requisito_evaluado": log.requisito_norma,
            "resultado_auditoria": log.resultado
        }
        for log in logs
    ]

# 2. Endpoint para obtener una auditoría por ID
@app.get("/api/v1/audit-logs/{audit_id}", response_model=AuditResponse)
def get_audit_log_by_id(audit_id: int, db: Session = Depends(get_db)):
    log = db.query(AuditLog).filter(AuditLog.id == audit_id).first()
    if not log:
        raise HTTPException(status_code=404, detail=f"Auditoría con ID {audit_id} no encontrada.")
    
    return {
        "id": log.id,
        "filename": log.filename,
        "requisito_evaluado": log.requisito_norma,
        "resultado_auditoria": log.resultado
    }