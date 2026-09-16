import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, 
  AlertCircle, 
  History, 
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000/api/v1';

export default function App() {
  const [file, setFile] = useState(null);
  const [requisito, setRequisito] = useState('ISO 9001:2015 - Cláusula 7.2 Competencia');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  
  // Historial
  const [historial, setHistorial] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('');

  const cargarHistorial = async () => {
    try {
      const url = filtroEstado 
        ? `${API_BASE}/audit-logs?estado=${filtroEstado}`
        : `${API_BASE}/audit-logs`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setHistorial(data);
      }
    } catch (err) {
      console.error('Error cargando historial:', err);
    }
  };

  useEffect(() => {
    cargarHistorial();
  }, [filtroEstado]);

  const handleAudit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Por favor selecciona un archivo PDF');
      return;
    }
    setError('');
    setLoading(true);
    setResultado(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('requisito_norma', requisito); // Coincide con el argumento Form de FastAPI

    try {
      const res = await fetch(`${API_BASE}/audit-document`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error en el servidor: ${res.statusText}`);
      }

      const data = await res.json();
      setResultado(data);
      cargarHistorial();
    } catch (err) {
      setError(err.message || 'Ocurrió un error al procesar la auditoría');
    } finally {
      setLoading(false);
    }
  };

  const getBadgeClass = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'cumple':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'no cumple':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Header */}
      <header className="bg-slate-900 text-white py-6 shadow-md">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ShieldCheck className="h-8 w-8 text-indigo-400" />
            <h1 className="text-xl font-bold tracking-wide">Sistema RAG Auditoría ISO 9001</h1>
          </div>
          <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
            Módulo de Inspección & Calidad
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Formulario y Dictamen */}
        <section className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-indigo-600" /> Nueva Evaluación de Cumplimiento
            </h2>

            <form onSubmit={handleAudit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Requisito / Norma a Auditar
                </label>
                <input
                  type="text"
                  value={requisito}
                  onChange={(e) => setRequisito(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Documento PDF (Evidencia)
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow transition duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Analizando con RAG / Gemini...</span>
                  </>
                ) : (
                  <span>Iniciar Auditoría</span>
                )}
              </button>
            </form>
          </div>

          {/* Resultado del Dictamen */}
          {resultado && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-semibold text-slate-900">Resultado del Dictamen</h3>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getBadgeClass(resultado.resultado_auditoria?.estado)}`}>
                  {resultado.resultado_auditoria?.estado?.toUpperCase() || 'EVALUADO'}
                </span>
              </div>

              <div>
                <h4 className="text-xs uppercase font-bold text-slate-400 mb-1">Justificación Evaluada</h4>
                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {resultado.resultado_auditoria?.justificacion || 'Sin justificación.'}
                </p>
              </div>

              {resultado.resultado_auditoria?.evidencias?.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase font-bold text-slate-400 mb-1">Evidencias Detectadas</h4>
                  <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                    {resultado.resultado_auditoria.evidencias.map((ev, idx) => (
                      <li key={idx}>{ev}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Historial */}
        <section className="lg:col-span-5 space-y-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <History className="h-5 w-5 text-indigo-600" /> Historial
              </h2>
              <button 
                onClick={cargarHistorial} 
                className="p-1 hover:bg-slate-100 rounded-full transition"
                title="Actualizar"
              >
                <RefreshCw className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            {/* Filtros */}
            <div className="mb-4">
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Todos los estados</option>
                <option value="Cumple">Cumple</option>
                <option value="No Cumple">No Cumple</option>
                <option value="Cumplimiento Parcial">Cumplimiento Parcial</option>
              </select>
            </div>

            {/* Lista de Registros */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {historial.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No hay registros guardados.</p>
              ) : (
                historial.map((item) => (
                  <div key={item.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                        {item.filename}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${getBadgeClass(item.resultado_auditoria?.estado)}`}>
                        {item.resultado_auditoria?.estado || 'Pendiente'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{item.requisito_evaluado}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}