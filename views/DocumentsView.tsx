import React, { useState } from 'react';
import { DocumentItem } from '../types';
import { Folder, FileText, Download, Plus, Search, ShieldCheck, Upload, X } from 'lucide-react';

interface DocumentsViewProps {
  documents: DocumentItem[];
  onAddDocument: (doc: DocumentItem) => void;
  darkMode?: boolean;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  documents,
  onAddDocument,
  darkMode
}) => {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentItem['category']>('POP');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    const newDoc: DocumentItem = {
      id: `doc_${Date.now()}`,
      title,
      category,
      fileSize: '2.1 MB',
      uploadedBy: 'Enfª. Amanda Oliveira',
      timestamp: new Date().toISOString().split('T')[0],
      description
    };

    onAddDocument(newDoc);
    setIsModalOpen(false);
    setTitle('');
    setDescription('');
  };

  const filteredDocs = documents.filter(d => 
    d.title.toLowerCase().includes(search.toLowerCase()) || 
    d.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-slide-up pb-24 max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Folder className="text-cyan-500" size={22} /> Biblioteca de POPs & Protocolos
          </h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Procedimentos Operacionais Padrão, manuais COREN e diretrizes institucionais offline.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-cyan-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <Plus size={16} /> Adicionar Protocolo/POP
        </button>
      </div>

      {/* BUSCA */}
      <div className="relative w-full">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input 
          type="text" 
          placeholder="Buscar POP, protocolo de medicação ou manual de segurança..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className={`w-full pl-10 pr-4 py-3 rounded-2xl text-xs font-medium border outline-none transition-all ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white focus:border-cyan-500' : 'bg-white border-slate-200 text-slate-800 focus:border-cyan-500'
          }`}
        />
      </div>

      {/* CARDS DE DOCUMENTOS */}
      <div className="space-y-3">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className={`p-5 rounded-3xl border space-y-3 shadow-sm transition-all hover:border-cyan-500 ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-cyan-500/10 text-cyan-600 rounded-2xl font-black text-xs">
                  <FileText size={20} />
                </div>

                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">{doc.title}</h3>
                  <span className="text-[10px] font-bold text-slate-400">Tamanho: {doc.fileSize} • Upload por: {doc.uploadedBy}</span>
                </div>
              </div>

              <span className="px-2.5 py-1 bg-cyan-500/10 text-cyan-600 font-black rounded-full text-[10px] uppercase">
                {doc.category}
              </span>
            </div>

            {doc.description && (
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                {doc.description}
              </p>
            )}

            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
              <span className="text-[10px] font-bold text-slate-400">Sincronizado Offline • {doc.timestamp}</span>

              <button 
                onClick={() => alert(`Iniciando download do documento: ${doc.title}`)}
                className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-black rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all"
              >
                <Download size={13} /> Baixar PDF
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL ADICIONAR DOCUMENTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-[2.5rem] p-6 space-y-5 shadow-2xl border relative max-h-[90vh] overflow-y-auto animate-slide-up ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
          }`}>
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 dark:bg-slate-800 rounded-full"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Folder size={20} className="text-cyan-500" /> Upload de Documento / POP
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Título do Documento</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  required
                  placeholder="Ex: POP-ENF-015: Sondagem Nasogastrica"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-cyan-500" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Categoria</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-cyan-500"
                >
                  <option value="POP">Procedimento Operacional Padrão (POP)</option>
                  <option value="PROTOCOLO">Protocolo Clínico Institucional</option>
                  <option value="MANUAL">Manual COREN / Anvisa</option>
                  <option value="LAUDO">Laudo / Exame</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">Descrição do Conteúdo</label>
                <textarea 
                  rows={3} 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Resumo do procedimento e norma aplicável..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-cyan-500" 
                />
              </div>

              <div className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center space-y-1">
                <Upload size={24} className="text-cyan-500 mx-auto" />
                <p className="font-bold text-xs">Clique para selecionar o PDF (Máx. 25MB)</p>
                <span className="text-[10px] text-slate-400">PDF, PNG, JPG, DOCX permitidos</span>
              </div>

              <button
                type="submit"
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-black p-3.5 rounded-2xl uppercase tracking-wider shadow-lg shadow-cyan-600/20 active:scale-95 transition-all mt-2"
              >
                Salvar Documento na Biblioteca
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
