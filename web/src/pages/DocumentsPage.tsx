import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useCompanyDocuments, type CompanyDocCategory } from '../data/companyDocuments';
import { Drawer } from '../components/Drawer';
import type { Role } from '../data/roles';

type Ctx = { role: Role };

const CATEGORIES: CompanyDocCategory[] = ['Policy', 'Letter Template', 'Form', 'Other'];
const inputStyle = { borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' } as const;

export default function DocumentsPage() {
  const { role } = useOutletContext<Ctx>();
  const canManage = role === 'SUPER_ADMIN' || role === 'HR';
  const { documents, addDocument, removeDocument } = useCompanyDocuments();

  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CompanyDocCategory>('Policy');
  const [description, setDescription] = useState('');
  const [filter, setFilter] = useState<'ALL' | CompanyDocCategory>('ALL');
  const [dragActive, setDragActive] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  const filtered = filter === 'ALL' ? documents : documents.filter((d) => d.category === filter);
  const selectedDocument = documents.find((document) => document.id === selectedDocumentId) ?? null;

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (validTypes.includes(files[0].type)) {
        setFile(files[0]);
      }
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    addDocument({
      name: name.trim(),
      category,
      description: description.trim() || undefined,
      file: file || undefined,
    });
    setName('');
    setCategory('Policy');
    setDescription('');
    setFile(null);
    setShowModal(false);
  }

  function handleCancel() {
    setName('');
    setCategory('Policy');
    setDescription('');
    setFile(null);
    setShowModal(false);
  }

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--accent-holiday)' }}>
        HR
      </p>
      <h1 className="font-display mt-1 text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
        Document repository
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        Policies, letter templates, and forms — visible to everyone.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {(['ALL', ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className="border px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors"
            style={{
              background: filter === c ? 'var(--ink)' : 'white',
              color: filter === c ? 'var(--text-on-ink)' : 'var(--text-secondary)',
              borderColor: 'var(--line)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {c === 'ALL' ? 'All' : c}
          </button>
        ))}
      </div>

      <div className={`mt-5 grid gap-6 ${canManage ? 'lg:grid-cols-[1fr_320px]' : ''}`}>
        <div className="border bg-white" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
          {filtered.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No documents in this category.
            </p>
          ) : (
            filtered.map((d) => (
              <div
                key={d.id}
                onClick={() => setSelectedDocumentId(d.id)}
                className="flex cursor-pointer items-start gap-4 border-b px-5 py-3.5 transition-colors hover:bg-[var(--paper)] last:border-b-0"
                style={{ borderColor: 'var(--line-soft)' }}
              >
                <span className="h-8 w-[3px] shrink-0 mt-1" style={{ background: 'var(--accent-holiday)' }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" style={{ color: 'var(--ink)' }}>
                    {d.name}
                  </p>
                  {d.description && (
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                      {d.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <p>{d.uploaded_at}</p>
                    {d.file && <p>•</p>}
                    {d.file && <p>{d.file.name}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className="font-mono px-2 py-0.5 text-[11px] uppercase"
                    style={{ background: 'var(--accent-holiday-bg)', color: 'var(--accent-holiday)', borderRadius: 'var(--radius-sm)' }}
                  >
                    {d.category}
                  </span>
                  {canManage && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        removeDocument(d.id);
                      }}
                      className="font-mono text-[11px] uppercase tracking-wide hover:underline"
                      style={{ color: 'var(--status-absent)' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {canManage && (
          <div className="h-fit border bg-white p-5" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              Add a document
            </h3>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 w-full py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent-holiday)', color: 'white', borderRadius: 'var(--radius-sm)' }}
            >
              Add document
            </button>
          </div>
        )}
      </div>

      <Drawer
        open={Boolean(selectedDocument)}
        title="Document details"
        onClose={() => setSelectedDocumentId(null)}
      >
        {selectedDocument && (
          <div className="space-y-5">
            <div>
              <p className="font-mono text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                {selectedDocument.category}
              </p>
              <h2 className="font-display mt-2 text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
                {selectedDocument.name}
              </h2>
            </div>
            <div className="space-y-4 border-y py-5" style={{ borderColor: 'var(--line-soft)' }}>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Description</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>{selectedDocument.description || 'No description provided.'}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Uploaded</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>{selectedDocument.uploaded_at}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>File</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>{selectedDocument.file?.name || 'No file attached'}</p>
                {selectedDocument.file && <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{selectedDocument.file.type || 'Unknown type'} · {(selectedDocument.file.size / 1024).toFixed(2)} KB</p>}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Add Document Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 z-50">
          <div
            className="w-full max-w-md border bg-white p-6"
            style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}
          >
            <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
              Add Document
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Upload a new HR document
            </p>

            <form onSubmit={handleAdd} className="mt-6 space-y-4">
              {/* File Upload */}
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Document file
                </span>
                <div
                  className={`mt-2 border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${dragActive ? 'bg-blue-50' : 'bg-gray-50'
                    }`}
                  style={{
                    borderColor: dragActive ? 'var(--accent-holiday)' : 'var(--line-soft)',
                    backgroundColor: dragActive ? 'rgba(244, 144, 12, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  }}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    id="file-input"
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.xlsx"
                    className="hidden"
                  />
                  <label htmlFor="file-input" className="cursor-pointer block">
                    {file ? (
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                          ✓ {file.name}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                          ↑
                        </p>
                        <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                          Drag & drop your file
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                          PDF, DOCX, XLSX
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </label>

              {/* Document Name */}
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Document name
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Employee Handbook 2026"
                  className="mt-1.5 w-full border px-3 py-2 text-sm outline-none"
                  style={inputStyle}
                />
              </label>

              {/* Category */}
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Category
                </span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CompanyDocCategory)}
                  className="mt-1.5 w-full border px-3 py-2 text-sm outline-none"
                  style={inputStyle}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              {/* Description */}
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Description
                </span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  className="mt-1.5 w-full border px-3 py-2 text-sm outline-none resize-none"
                  rows={3}
                  style={inputStyle}
                />
              </label>

              {/* Buttons */}
              <div className="mt-6 flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--line-soft)' }}>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-2.5 text-sm font-medium border transition-colors hover:bg-gray-50"
                  style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)', color: 'var(--ink)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="flex-1 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: 'var(--accent-holiday)',
                    color: 'white',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
