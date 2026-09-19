import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, 
  AlertCircle, 
  History, 
  ShieldCheck,
  RefreshCw,
  FileText,
  Eye,
  Printer,
  Search,
  Filter
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000/api/v1';

const CLAUSULAS_ISO9001 = [
  { id: '7.2', nombre: 'ISO 9001:2015 - Cláusula 7.2 Competencia del personal' },
  { id: '7.5', nombre: 'ISO 9001:2015 - Cláusula 7.5 Información documentada' },
  { id: '8.2', nombre: 'ISO 9001:2015 - Cláusula 8.2 Requisitos para los productos y servicios' },
  { id: '8.5.2', nombre: 'ISO 9001:2015 - Cláusula 8.5.2 Identificación y trazabilidad' },
  { id: '9.2', nombre: 'ISO 9001:2015 - Cláusula 9.2 Auditoría interna' },
  { id: 'custom', nombre: 'Otra cláusula (Personalizada)' },
];

export default function App() {
  // --- Estados de Formulario y Visor PDF ---
  const [file, setFile] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [requisitosSeleccionados, setRequisitosSeleccionados] = useState([CLAUSULAS_ISO9001[0].nombre]);
  const [requisitoPersonalizado, setRequisitoPersonalizado] = useState('');
  const [mostrarPersonalizado, setMostrarPersonalizado] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // --- Estados para Historial y Filtros Dinámicos ---
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  /**
   * Conmuta la selección de cláusulas en el listado multi-requisito.
   */
  const toggleClausula = (nombreClausula) => {
    if (requisitosSeleccionados.includes(nombreClausula)) {
      if (requisitosSeleccionados.length > 1) {
        setRequisitosSeleccionados(requisitosSeleccionados.filter(item => item !== nombreClausula));
      }
    } else {
      setRequisitosSeleccionados([...requisitosSeleccionados, nombreClausula]);
    }
  };

  /**
   * Consulta el historial de auditorías almacenado en PostgreSQL mediante el backend.
   */
  const fetchAuditLogs = async (statusFilter = selectedStatusFilter) => {
    setIsLoadingLogs(true);
    try {
      const queryParam = statusFilter !== 'todos' ? `?estado=${encodeURIComponent(statusFilter)}` : '';
      const response = await fetch(`${API_BASE}/audit-logs${queryParam}`);

      if (!response.ok) {
        throw new Error(`Error HTTP en servidor: ${response.status}`);
      }

      const data = await response.json();
      setAuditLogs(data.logs || data);
    } catch (error) {
      console.error('No se pudo recuperar el historial de auditorías:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Carga inicial de historial
  useEffect(() => {
    fetchAuditLogs();
  }, []);

  // Control de ciclo de vida del Blob URL para previsualizar PDF
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPdfPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPdfPreviewUrl(null);
  }, [file]);

  /**
   * Ejecuta el proceso de auditoría llamando a la API multimodal de Gemini.
   */
  const handleAudit = async (e) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage('Por favor selecciona un archivo PDF');
      return;
    }
    setErrorMessage('');
    setIsAuditing(true);
    setResultado(null);

    const formData = new FormData();
    formData.append('file', file);

    const listaFinal = [...requisitosSeleccionados];
    if (mostrarPersonalizado && requisitoPersonalizado.trim()) {
      listaFinal.push(`Personalizado: ${requisitoPersonalizado.trim()}`);
    }
    formData.append('requisito_norma', listaFinal.join(' | '));

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
      fetchAuditLogs();
    } catch (err) {
      setErrorMessage(err.message || 'Ocurrió un error al procesar la auditoría');
    } finally {
      setIsAuditing(false);
    }
  };

  /**
   * Dispara el diálogo nativo para guardar como PDF o imprimir el dictamen actual.
   */
  const handleExportReport = () => {
    window.print();
  };

  /**
   * Retorna estilos de Tailwind CSS según el estado de cumplimiento.
   */
  const getBadgeClass = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'cumple':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'no cumple':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-300';
    }
  };

  // Filtrado reactivo en memoria por término de búsqueda (nombre de archivo o norma)
  const filteredLogs = auditLogs.filter((item) => {
    const term = searchTerm.toLowerCase();
    const fileName = item.nombre_archivo || item.filename || '';
    const normRequirement = item.requisito_norma || item.requisito_evaluado || '';
    return fileName.toLowerCase().includes(term) || normRequirement.toLowerCase().includes(term);
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* Encabezado Principal */}
      <header className="bg-slate-900 text-white py-4 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ShieldCheck className="h-7 w-7 text-indigo-400" />
            <h1 className="text-xl font-bold tracking-wide">Sistema RAG Auditoría ISO 9001</h1>
          </div>
          <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
            Módulo de Inspección & Calidad
          </span>
        </div>
      </header>

      {/* Contenedor Principal Split-Screen */}
      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 w-full">
        
        {/* Panel Izquierdo: Visor PDF */}
        <section className="lg:col-span-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[780px]">
          <div className="flex items-center justify-between mb-3 border-b pb-2">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Eye className="h-4 w-4 text-indigo-600" /> Visor de Documento Auditable
            </h2>
            {file && (
              <span className="text-xs font-medium text-slate-500 truncate max-w-[200px]">
                {file.name}
              </span>
            )}
          </div>

          {pdfPreviewUrl ? (
            <div className="flex-1 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
              <iframe
                src={pdfPreviewUrl}
                title="Previsualización del PDF"
                className="w-full h-full"
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 text-slate-400 p-6 text-center">
              <FileText className="h-14 w-14 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-600">No hay documento seleccionado</p>
              <p className="text-xs text-slate-400 mt-1">
                Selecciona un archivo PDF en el panel derecho para visualizarlo en tiempo real.
              </p>
            </div>
          )}
        </section>

        {/* Panel Derecho: Formulario, Dictamen e Historial */}
        <section className="lg:col-span-6 space-y-6 h-[780px] overflow-y-auto pr-1">
          
          {/* Formulario de Evaluación */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <UploadCloud className="h-4 w-4 text-indigo-600" /> Nueva Evaluación de Cumplimiento
            </h2>

            <form onSubmit={handleAudit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Requisitos / Cláusulas a Auditar (Selección Múltiple)
                </label>
                
                <div className="space-y-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50">
                  {CLAUSULAS_ISO9001.filter(item => item.id !== 'custom').map((item) => {
                    const isChecked = requisitosSeleccionados.includes(item.nombre);
                    return (
                      <label 
                        key={item.id} 
                        className={`flex items-start gap-2.5 p-2 rounded-md cursor-pointer transition border text-xs ${
                          isChecked 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-medium' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleClausula(item.nombre)}
                          className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{item.nombre}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="mt-3">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mostrarPersonalizado}
                      onChange={(e) => setMostrarPersonalizado(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Agregar otra cláusula personalizada</span>
                  </label>

                  {mostrarPersonalizado && (
                    <input
                      type="text"
                      placeholder="Escribe la cláusula o requisito adicional..."
                      value={requisitoPersonalizado}
                      onChange={(e) => setRequisitoPersonalizado(e.target.value)}
                      className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Documento PDF (Evidencia)
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 text-rose-700 text-sm rounded-lg flex items-center gap-2 border border-rose-200">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isAuditing}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow transition duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 text-sm"
              >
                {isAuditing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Analizando con RAG / Gemini...</span>
                  </>
                ) : (
                  <span>Iniciar Auditoría</span>
                )}
              </button>
            </form>
          </div>

          {/* Resultado del Dictamen Activo */}
          {resultado && (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-semibold text-slate-900 text-sm">Resultado del Dictamen</h3>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleExportReport} 
                    className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition shadow-sm"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Exportar PDF
                  </button>

                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getBadgeClass(resultado.resultado_auditoria?.estado)}`}>
                    {resultado.resultado_auditoria?.estado?.toUpperCase() || 'EVALUADO'}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs uppercase font-bold text-slate-400 mb-1">Justificación Evaluada</h4>
                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
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

          {/* Panel de Historial de Auditorías con Filtros Dinámicos */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <History className="h-4 w-4 text-indigo-600" /> Historial de Auditorías
              </h2>
              <button 
                onClick={() => fetchAuditLogs()} 
                disabled={isLoadingLogs}
                className="p-1 hover:bg-slate-100 rounded-full transition disabled:opacity-50"
                title="Actualizar registros"
              >
                <RefreshCw className={`h-4 w-4 text-slate-500 ${isLoadingLogs ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Filtros: Búsqueda por Texto y Estado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por documento o norma..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="relative">
                <Filter className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => {
                    const newFilter = e.target.value;
                    setSelectedStatusFilter(newFilter);
                    fetchAuditLogs(newFilter);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="todos">Todos los Estados</option>
                  <option value="Cumple">Cumple</option>
                  <option value="Cumplimiento Parcial">Cumplimiento Parcial</option>
                  <option value="No Cumple">No Cumple</option>
                </select>
              </div>
            </div>

            {/* Registros Filtrados */}
            {isLoadingLogs ? (
              <p className="text-xs text-slate-400 text-center py-6">Cargando historial desde la base de datos...</p>
            ) : filteredLogs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No se encontraron registros de auditoría.</p>
            ) : (
              <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1 divide-y divide-slate-100">
                {filteredLogs.map((item) => {
                  const auditState = item.dictamen?.estado || item.resultado_auditoria?.estado || 'Desconocido';
                  const fileName = item.nombre_archivo || item.filename || 'Documento sin nombre';
                  const requirement = item.requisito_norma || item.requisito_evaluado || 'Requisito general';

                  return (
                    <div key={item.id} className="pt-2.5 first:pt-0 flex flex-col space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-800 truncate max-w-[200px]" title={fileName}>
                          {fileName}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getBadgeClass(auditState)}`}>
                          {auditState}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate" title={requirement}>
                        {requirement}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </section>

      </main>
    </div>
  );
}