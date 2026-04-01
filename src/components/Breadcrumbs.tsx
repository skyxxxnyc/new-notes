import React, { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface Breadcrumb {
  id: string;
  title: string;
}

interface BreadcrumbsProps {
  pageId: string;
  onNavigate: (id: string) => void;
}

export default function Breadcrumbs({ pageId, onNavigate }: BreadcrumbsProps) {
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);

  useEffect(() => {
    const fetchAncestors = async () => {
      try {
        const data = await apiFetch(`/api/pages/${pageId}/ancestors`);
        setBreadcrumbs(data);
      } catch (error) {
        console.error('Failed to fetch ancestors:', error);
      }
    };
    fetchAncestors();
  }, [pageId]);

  return (
    <div className="flex items-center gap-1 text-xs text-slate-500">
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.id}>
          <button
            onClick={() => onNavigate(crumb.id)}
            className="hover:text-primary transition-colors hover:underline truncate max-w-[150px]"
          >
            {crumb.title}
          </button>
          {index < breadcrumbs.length - 1 && <ChevronRight size={12} />}
        </React.Fragment>
      ))}
    </div>
  );
}
