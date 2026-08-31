import React, { useState } from 'react';
import { ANDROID_CODE_FILES } from '../../data/androidCodebase';
import { AndroidCodeFile } from '../../types';
import {
  Code2,
  Copy,
  Check,
  Download,
  FileCode,
  FolderTree,
  Search,
  Sparkles,
  ExternalLink,
  Shield,
  Layers
} from 'lucide-react';

interface CodeViewerProps {
  onDownloadProject: () => void;
  isDownloading: boolean;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  onDownloadProject,
  isDownloading
}) => {
  const [selectedFileId, setSelectedFileId] = useState<string>(ANDROID_CODE_FILES[0].id);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const selectedFile = ANDROID_CODE_FILES.find((f) => f.id === selectedFileId) || ANDROID_CODE_FILES[0];

  const filteredFiles = ANDROID_CODE_FILES.filter((file) => {
    const matchesSearch = file.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.path.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || file.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const categories = [
    { id: 'all', label: 'All Files' },
    { id: 'gradle', label: 'Gradle & Build' },
    { id: 'manifest', label: 'Manifest' },
    { id: 'protocol', label: 'TCP Protocol' },
    { id: 'network', label: 'Server & Client' },
    { id: 'transform', label: 'Matrix Splice' },
    { id: 'playback', label: 'ExoPlayer Sync' },
    { id: 'ui', label: 'Activities & UI' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wider text-white flex items-center gap-2">
            <Code2 className="w-4 h-4 text-indigo-400" />
            Production Android Kotlin Codebase
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Modular Kotlin architecture implementing Google ExoPlayer (Media3), Coroutine TCP Sockets, NTP clock synchronization, and <code className="text-indigo-300 font-mono">TextureView</code> Matrix screen splicing.
          </p>
        </div>

        <button
          onClick={onDownloadProject}
          disabled={isDownloading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{isDownloading ? 'Packaging ZIP...' : 'Download Project ZIP'}</span>
        </button>
      </div>

      {/* Main Grid: File List (Left) + Code Viewer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Sidebar: File Tree & Categories */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-lg">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Kotlin files, classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap gap-1 pb-1 border-b border-slate-800">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* File List */}
          <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
            {filteredFiles.map((file) => {
              const isSelected = selectedFileId === file.id;
              return (
                <button
                  key={file.id}
                  id={`file-btn-${file.id}`}
                  onClick={() => setSelectedFileId(file.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-colors flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm'
                      : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs text-slate-200 flex items-center gap-1.5 font-mono">
                      <FileCode className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                      {file.filename}
                    </span>
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {file.language}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {file.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Area: Code Editor / Display */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
          {/* File Header Bar */}
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-indigo-400 font-medium">{selectedFile.path}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">{selectedFile.description}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-copy-code"
                onClick={() => handleCopyCode(selectedFile.code, selectedFile.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
              >
                {copiedId === selectedFile.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Highlights Tag Bar */}
          {selectedFile.highlights && selectedFile.highlights.length > 0 && (
            <div className="bg-slate-950/70 px-4 py-2 border-b border-slate-800/80 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-500 font-mono uppercase text-[9px] tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Key APIs:
              </span>
              {selectedFile.highlights.map((hl, i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-slate-900 text-indigo-300 font-mono text-[10px] border border-slate-800">
                  {hl}
                </span>
              ))}
            </div>
          )}

          {/* Code Window */}
          <div className="relative flex-1 bg-black p-4 font-mono text-xs text-slate-200 overflow-x-auto max-h-[600px] leading-relaxed">
            <pre className="select-text">
              <code>{selectedFile.code}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
