import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-xs md:text-base text-gray-500 mb-6">
      <Link to="/" className="hover:text-gray-900 transition-colors py-1">Ana Sayfa</Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight size={14} className="md:w-4 md:h-4" />
          {item.href ? (
            <Link to={item.href} className="hover:text-gray-900 transition-colors py-1">
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium py-1 line-clamp-1">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}