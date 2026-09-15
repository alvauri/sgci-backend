from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from app.ingest import extract_text_from_pdf, chunk_text
from app.rag import evaluate_compliance

# Inicialización de la aplicación FastAPI con metadata para la documentación
app = FastAPI(
    title="Plataforma de Gestión de Calidad Inteligente API",
    version="0.1.0"
)

@app.get("/")
def health_check():
    """Endpoint básico para verificar que la API esté arriba y respondiendo."""
    return {"status": "online", "system": "SGCI Engine"}

@app.post("/api/v1/audit-document")
async def audit_document(
    file: UploadFile = File(...),
    requisito_norma: str = Form(..., description="Ejemplo: ISO 9001 - Cláusula 7.2 Competencia del Personal")
):
    """
    Recibe un PDF de proceso/política de la empresa y lo compara contra
    un requisito normativo especificado.
    """
    # 1. Validación de extensión del archivo enviado
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="El archivo debe ser un PDF")

    # 2. Leer archivo en memoria (bytes)
    pdf_bytes = await file.read()
    
    # 3. Extraer texto plano del PDF
    text = extract_text_from_pdf(pdf_bytes)
    if not text.strip():
        raise HTTPException(
            status_code=400, 
            detail="No se pudo extraer texto del PDF (¿Es una imagen escaneada?)"
        )

    # 4. Dividir el texto en fragmentos (chunks)
    chunks = chunk_text(text)
    
    # Unifica los primeros 5 bloques como contexto rápido para esta fase inicial de prueba
    contexto_unificado = "\n---\n".join(chunks[:5])

    # 5. Ejecutar Auditoría Virtual enviando el contexto a OpenAI
    resultado_auditoria = evaluate_compliance(
        requisito_norma=requisito_norma,
        contexto_empresa=contexto_unificado
    )

    # 6. Respuesta JSON estructurada
    return {
        "filename": file.filename,
        "total_chunks_procesados": len(chunks),
        "requisito_evaluado": requisito_norma,
        "resultado_auditoria": resultado_auditoria
    }