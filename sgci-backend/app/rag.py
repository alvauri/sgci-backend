import os
import io
from dotenv import load_dotenv
from pypdf import PdfReader
import google.generativeai as genai

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

PROMPT_AUDITOR = """
Sos un Auditor Líder de Certificación de Normas ISO (especialmente ISO 9001).
Tu tarea es evaluar la documentación entregada por la empresa frente a un Requisito de la Norma.

REQUISITO DE LA NORMA:
"{requisito_norma}"

DOCUMENTACIÓN DE LA EMPRESA (CONTEXTO):
"{contexto_empresa}"

INSTRUCCIONES:
Respondé de manera ejecutiva y estructurada con el siguiente formato EXACTO:

1. ESTADO: [Cumple / No Cumple / Cumplimiento Parcial]
2. EVIDENCIA / BRECHA: Resumen breve de qué evidencia se encontró o qué falta en el documento.
3. SUGERENCIA DE MEJORA: Texto o cláusula sugerida que la empresa debería agregar al documento para certificar sin observaciones.
"""

def extract_text(pdf_input) -> str:
    if isinstance(pdf_input, str):
        return pdf_input
    if isinstance(pdf_input, (bytes, bytearray)):
        reader = PdfReader(io.BytesIO(pdf_input))
        return "\n".join([page.extract_text() or "" for page in reader.pages])
    return str(pdf_input)

def evaluate_compliance(*args, **kwargs) -> str:
    requisito_norma = kwargs.get("requisito_norma", "")
    raw_doc = (
        kwargs.get("contexto_empresa") 
        or kwargs.get("pdf_bytes") 
        or kwargs.get("file_bytes") 
        or kwargs.get("file")
    )

    if not requisito_norma and len(args) > 0:
        for arg in args:
            if isinstance(arg, (bytes, bytearray)):
                raw_doc = arg
            elif isinstance(arg, str):
                if not requisito_norma:
                    requisito_norma = arg
                else:
                    raw_doc = arg

    contexto_empresa = extract_text(raw_doc) if raw_doc else ""

    # Modelo actualizado según requerimiento del endpoint
    model = genai.GenerativeModel("gemini-3.6-flash")

    prompt = PROMPT_AUDITOR.format(
        requisito_norma=requisito_norma,
        contexto_empresa=contexto_empresa
    )
    
    response = model.generate_content(
        prompt, 
        generation_config={"temperature": 0.1}
    )
    return response.text