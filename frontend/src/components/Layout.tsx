import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-64 p-8">
        {children}
      </main>
    </div>
  );
}

function Sidebar() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-800">SGB TechTrace</h1>
        <p className="text-sm text-gray-500">Documentation technique</p>
      </div>

      <nav className="space-y-1">
        <Link
          to="/"
          className={`block px-4 py-2 rounded-lg transition ${
            isActive('/') ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Dashboard
        </Link>
        <Link
          to="/dcs"
          className={`block px-4 py-2 rounded-lg transition ${
            isActive('/dcs') ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Demandes de changement
        </Link>
        <Link
          to="/domaines"
          className={`block px-4 py-2 rounded-lg transition ${
            isActive('/domaines') ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Métiers
        </Link>
        <Link
          to="/search"
          className={`block px-4 py-2 rounded-lg transition ${
            isActive('/search') ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Recherche
        </Link>
      </nav>
    </aside>
  );
}
