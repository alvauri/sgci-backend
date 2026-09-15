from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import engine, Base, get_db
from app.models import AuditLog
from app.rag import evaluate_compliance
from app.schemas import AuditResponse

# Crear las tablas en Neon automáticamente
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SGCI Backend - ISO 9001 Auditor")

@app.post("/api/v1/audit-document", response_model=AuditResponse)
async def audit_document(
    file: UploadFile = File(...),
    requisito_norma: str = Form(...),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="El archivo debe ser un PDF.")

    contents = await file.read()

    # 1. Evaluar con Gemini (devuelve dict con estructura de AuditResultSchema)
    resultado_dict = evaluate_compliance(
        requisito_norma=requisito_norma,
        file_bytes=contents
    )

    # 2. Persistir en la base de datos PostgreSQL (Neon)
    nuevo_log = AuditLog(
        filename=file.filename,
        requisito_norma=requisito_norma,
        resultado=resultado_dict
    )
    db.add(nuevo_log)
    db.commit()
    db.refresh(nuevo_log)

    # 3. Retornar respuesta mapeada
    return {
        "id": nuevo_log.id,
        "filename": nuevo_log.filename,
        "requisito_evaluado": nuevo_log.requisito_norma,
        "resultado_auditoria": nuevo_log.resultado
    }