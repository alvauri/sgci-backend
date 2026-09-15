from io import BytesIO
import pypdf
from langchain_text_splitters import RecursiveCharacterTextSplitter

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Lee los bytes de un PDF en memoria y concatena el texto de todas sus páginas.
    """
    # Convierte el flujo de bytes recibido en un objeto operable por pypdf
    reader = pypdf.PdfReader(BytesIO(pdf_bytes))
    extracted_text = ""
    
    # Extrae el texto página por página evitando valores nulos
    for page in reader.pages:
        text = page.extract_text()
        if text:
            extracted_text += text + "\n"
            
    return extracted_text

def chunk_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 150):
    """
    Divide el texto en bloques (chunks) respetando saltos de línea y espacios
    para mantener el contexto semántico.
    """
    # Define la estrategia de corte: prioriza párrafos (\n\n), luego líneas (\n) y palabras (" ")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,       # Límite máximo de caracteres por fragmento
        chunk_overlap=chunk_overlap, # Cantidad de caracteres compartidos entre bloques contiguos
        separators=["\n\n", "\n", " ", ""]
    )
    
    return text_splitter.split_text(text)