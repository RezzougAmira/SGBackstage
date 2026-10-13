import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import imgLogo from "../assets/logoAGB.png";
import { useProtectedImage } from "../hooks/useProtectedImage";

// La topbar utilisait des assets exportés de Figma via figma.com/api/mcp/asset.
// Ces URLs de session expirent et renvoient 404, ce qui affichait des icônes
// cassées. On passe donc en SVG inline, comme le sidebar.

type NavItem = { label: string; to: string; paths: string[] };

// Icônes SVG inline (style Heroicons), remplace les glyphes provisoires.
const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    to: "/",
    paths: [
      "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125Z",
    ],
  },
  {
    label: "Domaines",
    to: "/domaines",
    paths: [
      "M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z",
    ],
  },
  {
    label: "Masques",
    to: "/masques",
    paths: [
      "M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z",
    ],
  },
  {
    label: "Services",
    to: "/services",
    paths: ["m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"],
  },
  {
    label: "Procedures",
    to: "/procedures",
    paths: [
      "M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125",
    ],
  },
  {
    label: "Historique",
    to: "/historique",
    paths: [
      "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
    ],
  },
  ];

// La gestion des comptes est réservée aux administrateurs. Elle se place avant
// « Profil » dans le menu, qui reste la dernière entrée.
const ADMIN_ITEM: NavItem = {
  label: "Utilisateurs",
  to: "/administration",
  paths: [
    "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
  ],
};

const PROFILE_ITEM: NavItem = {
  label: "Profil",
  to: "/profil",
  paths: [
    "M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  ],
};

function SidebarLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-4 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors ${
          isActive
            ? "bg-[#e6e8f5] text-[#060923]"
            : "text-[#e6e8f5]/70 hover:bg-white/10 hover:text-[#e6e8f5]"
        }`
      }
    >
      <span className="flex w-6 items-center justify-center">
        <svg
          className="h-[18px] w-[18px]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {item.paths.map((d) => (
            <path key={d} d={d} />
          ))}
        </svg>
      </span>
      <span className="flex-1">{item.label}</span>
    </NavLink>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const avatarSrc = useProtectedImage(user?.avatar_key);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f8fa] font-poppins">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[266px] flex-col overflow-hidden bg-[#004a86] px-[31px] pt-3 text-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col items-center gap-1 border-b border-white/20 pb-0">
          <img alt="AGBackstage" className="h-36 w-36 object-contain" src={imgLogo} />
        </div>

        <nav className="mt-6 flex flex-col gap-2">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.to} item={item} onNavigate={() => setSidebarOpen(false)} />
          ))}

          {/* Utilisateurs avant Profil : c'est une rubrique d'administration,
              le profil personnel reste la dernière entrée. Réservée aux admins. */}
          {user?.role === "admin" && (
            <SidebarLink item={ADMIN_ITEM} onNavigate={() => setSidebarOpen(false)} />
          )}

          <SidebarLink item={PROFILE_ITEM} onNavigate={() => setSidebarOpen(false)} />
        </nav>

        {/* Profile — clic sur la photo ou le nom pour ouvrir le panneau */}
        <div className="mb-7 mt-16 flex items-center gap-3 py-3">
          <button
            type="button"
            onClick={() => navigate("/profil")}
            title="Mon profil"
            className="flex flex-1 items-center gap-3 rounded-lg p-1 text-left transition hover:bg-white/10"
          >
            {avatarSrc ? (
              <img alt="" className="h-8 w-8 rounded-full object-cover" src={avatarSrc} />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-semibold">
                {(user?.name ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
            <span className="flex-1 leading-tight">
              <span className="block text-sm font-medium">{user?.name ?? "Utilisateur"}</span>
              <span className="block text-[10px] text-[#e6e8f5]/70">{user?.role ?? "Admin"}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={logout}
            aria-label="Se déconnecter"
            className="opacity-70 transition-opacity hover:opacity-100"
            title="Se déconnecter"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
              />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex flex-1 flex-col">
        {/* Topbar */}
        <header className="flex h-16 items-center gap-3 bg-white px-4 shadow-[0px_4px_16px_0px_rgba(0,0,0,0.08)] sm:px-6 lg:px-8">
          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label="Ouvrir le menu"
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f5f5] text-[#004a86] lg:hidden"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              title="Notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f5f5]"
            >
              <svg
                className="topbar-icon h-[27px] w-[27px]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                />
              </svg>
              <span className="absolute right-1 top-1 flex h-[14px] w-[14px] items-center justify-center rounded-full bg-[#f7b500] text-[8px] font-medium text-black">
                3
              </span>
            </button>
            <button
              type="button"
              title="Paramètres"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f5f5]"
            >
              <svg
                className="topbar-icon h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}