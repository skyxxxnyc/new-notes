import React, { useState } from 'react';
import { X, Check, ArrowRight, Type, Hash, Calendar, List, CheckSquare, Link as LinkIcon, AlertCircle } from 'lucide-react';

interface CSVMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  headers: string[];
  data: any[];
  fileName: string;
  onImport: (mappedData: any) => void;
}

const COLUMN_TYPES = [
  { id: 'text', name: 'Text', icon: Type },
  { id: 'number', name: 'Number', icon: Hash },
  { id: 'date', name: 'Date', icon: Calendar },
  { id: 'select', name: 'Select', icon: List },
  { id: 'checkbox', name: 'Checkbox', icon: CheckSquare },
  { id: 'url', name: 'URL', icon: LinkIcon },
];

export default function CSVMappingModal({ isOpen, onClose, headers, data, fileName, onImport }: CSVMappingModalProps) {
  const [mappings, setMappings] = useState<Record<string, { name: string; type: string; isTitle: boolean }>>(
    headers.reduce((acc, header, index) => ({
      ...acc,
      [header]: {
        name: header,
        type: 'text',
        isTitle: index === 0,
      },
    }), {})
  );

  if (!isOpen) return null;

  const handleTypeChange = (header: string, type: string) => {
    setMappings(prev => ({
      ...prev,
      [header]: { ...prev[header], type },
    }));
  };

  const handleNameChange = (header: string, name: string) => {
    setMappings(prev => ({
      ...prev,
      [header]: { ...prev[header], name },
    }));
  };

  const handleTitleChange = (header: string) => {
    const newMappings = { ...mappings };
    Object.keys(newMappings).forEach(h => {
      newMappings[h].isTitle = h === header;
    });
    setMappings(newMappings);
  };

  const handleConfirm = () => {
    const columns = Object.entries(mappings).map(([originalHeader, mapping]) => ({
      id: mapping.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: mapping.name,
      type: mapping.type,
      width: 150,
    }));

    const titleHeader = Object.keys(mappings).find(h => mappings[h].isTitle) || headers[0];

    const pagesData = data.map((row, index) => {
      const title = row[titleHeader] || `Row ${index + 1}`;
      const properties: Record<string, any> = {};
      
      Object.entries(mappings).forEach(([header, mapping]) => {
        const colId = mapping.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        let value = row[header];
        
        // Basic type conversion
        if (mapping.type === 'number') {
          value = parseFloat(value) || 0;
        } else if (mapping.type === 'checkbox') {
          value = value === 'true' || value === '1' || value === 'yes' || value === 'on';
        }
        
        properties[colId] = value;
      });

      return {
        id: `temp-${index}`,
        title,
        content: '',
        properties: JSON.stringify(properties),
        parentId: null,
        isTemplate: false,
      };
    });

    onImport({
      database: {
        name: fileName.replace(/\.csv$/i, ''),
        icon: 'Database',
        columns: JSON.stringify(columns),
      },
      pages: pagesData,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Map CSV Fields</h2>
            <p className="text-xs text-slate-400 font-medium">{fileName} • {data.length} rows</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
            <AlertCircle className="text-amber-500 shrink-0" size={20} />
            <p className="text-sm text-amber-800 leading-relaxed">
              Select which CSV column should be used as the <strong>Page Title</strong> and define the data types for each field.
            </p>
          </div>

          <div className="space-y-3">
            {headers.map((header) => {
              const mapping = mappings[header];
              return (
                <div key={header} className="group flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-primary/30 transition-all">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CSV Header</span>
                      <ArrowRight size={10} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-bold text-slate-700 truncate">{header}</p>
                  </div>

                  <div className="flex-[1.5] space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={mapping.name}
                        onChange={(e) => handleNameChange(header, e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                        placeholder="Column Name"
                      />
                      <select
                        value={mapping.type}
                        onChange={(e) => handleTypeChange(header, e.target.value)}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                      >
                        {COLUMN_TYPES.map(type => (
                          <option key={type.id} value={type.id}>{type.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <label className="flex items-center gap-2 cursor-pointer group/label">
                      <input
                        type="radio"
                        name="title-column"
                        checked={mapping.isTitle}
                        onChange={() => handleTitleChange(header)}
                        className="w-4 h-4 text-primary focus:ring-primary border-slate-300"
                      />
                      <span className={`text-xs font-bold transition-colors ${mapping.isTitle ? 'text-primary' : 'text-slate-400 group-hover/label:text-slate-600'}`}>
                        Use as Page Title
                      </span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold text-sm hover:text-slate-800 transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleConfirm}
            className="px-6 py-2 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition-all shadow-lg shadow-slate-200"
          >
            Confirm & Import
          </button>
        </div>
      </div>
    </div>
  );
}
