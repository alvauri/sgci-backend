from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from app.database import engine, Base, get_db
from app.models import AuditLog
from app.rag import evaluate_compliance
from app.schemas import AuditResponse

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SGCI Backend - ISO 9001 Auditor",
    version="1.0.0"
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Endpoint para procesar auditorías
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

# 2. Endpoint para obtener el historial completo
@app.get("/api/v1/audit-logs", response_model=List[AuditResponse])
def get_audit_logs(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.id.desc()).all()
    
    return [
        {
            "id": log.id,
            "filename": log.filename,
            "requisito_evaluado": log.requisito_norma,
            "resultado_auditoria": log.resultado
        }
        for log in logs
    ]

# 3. Endpoint para obtener una auditoría por ID
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