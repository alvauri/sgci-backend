import os
import io
import json
from dotenv import load_dotenv
from pypdf import PdfReader
import google.generativeai as genai
from app.schemas import AuditResultSchema

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

def extract_text(pdf_input) -> str:
    if isinstance(pdf_input, str):
        return pdf_input
    if isinstance(pdf_input, (bytes, bytearray)):
        reader = PdfReader(io.BytesIO(pdf_input))
        return "\n".join([page.extract_text() or "" for page in reader.pages])
    return str(pdf_input)

def evaluate_compliance(*args, **kwargs) -> dict:
    requisito_norma = kwargs.get("requisito_norma", "")
    raw_doc = (
        kwargs.get("contexto_empresa") 
        or kwargs.get("pdf_bytes") 
        or kwargs.get("file_bytes") 
        or kwargs.get("file")
    )

    contexto_empresa = extract_text(raw_doc) if raw_doc else ""

    model = genai.GenerativeModel("gemini-3.6-flash")

    prompt = f"""
    Sos un Auditor Líder de Certificación de Normas ISO (especialmente ISO 9001).
    Tu tarea es evaluar la documentación entregada por la empresa frente al Requisito de la Norma.

    REQUISITO DE LA NORMA:
    "{requisito_norma}"

    DOCUMENTACIÓN DE LA EMPRESA:
    "{contexto_empresa}"
    """
    
    response = model.generate_content(
        prompt, 
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            response_schema=AuditResultSchema,
            temperature=0.1
        )
    )
    return json.loads(response.text)