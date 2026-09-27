import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import imgLogo from "../assets/logoAGB.png";

// Assets exported from Figma (AGBACKSTAGE — Side Bar / Topbar, nodes 7:113, 33:1202, 18:738).
// Swap these for files under /src/assets once you've downloaded them locally.
const assetPrefix = "https://www.figma.com/api/mcp/asset";
const imgAvatar = `${assetPrefix}/bb746cd0-1ab9-4d7b-9295-3207e14f5527/9a920.png`;
const imgBell = `${assetPrefix}/69ec06aa-3515-4cc6-afae-c16426256005/791cd.svg`;
const imgSettings = `${assetPrefix}/69ec06aa-3515-4cc6-afae-c16426256005/e5917.svg`;
const imgPlus = `${assetPrefix}/69ec06aa-3515-4cc6-afae-c16426256005/d2111.svg`;

type NavItem = { label: string; to: string; paths: string[] };

// Icônes SVG inline (style Heroicons), remplace les glyphes provisoires.
const NAV_ITEMS: NavItem[] = [
  {
    label: "Domaines",
    to: "/domaines",
    paths: [
      "M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z",
    ],
  },
  {
    label: "Processus",
    to: "/processus",
    paths: ["M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"],
  },
  {
    label: "Etapes",
    to: "/etapes",
    paths: ["M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z"],
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
    label: "Table & attributs",
    to: "/tables",
    paths: [
      "M3.75 6A2.25 2.25 0 0 1 6 3.75h12A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6Z",
      "M15.75 9V20.25M8.25 9V20.25M3.75 9h16.5M3.75 14.25h16.5M3.75 19.5h16.5",
    ],
  },
  {
    label: "Demandes de changement",
    to: "/demandes-de-changement",
    paths: [
      "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99",
    ],
  },
  {
    label: "Archives",
    to: "/archives",
    paths: [
      "M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z",
    ],
  },
  {
    label: "Profil",
    to: "/profil",
    paths: [
      "M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
    ],
  },
  {
    label: "Administration",
    to: "/administration",
    paths: [
      "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z",
      "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
    ],
  },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setThemeState] = useState<"light" | "dark">(
    () => (localStorage.getItem("theme") as "light" | "dark") || "light"
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const setTheme = (t: "light" | "dark") => {
    setThemeState(t);
    localStorage.setItem("theme", t);
  };

  return (
    <div
      className={`flex h-screen overflow-hidden bg-[#f6f8fa] font-poppins ${
        theme === "dark" ? "dark" : ""
      }`}
    >
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
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
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
          ))}
        </nav>

        {/* Theme toggle */}
        <div className="mt-10 flex w-full items-center gap-2 rounded-lg bg-[#f6f8fa] p-[2px]">
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-1.5 text-xs font-medium ${
              theme === "dark" ? "bg-[#004a86] text-white" : "bg-white text-[#060d38]"
            }`}
          >
            Dark
          </button>
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-1.5 text-xs font-semibold ${
              theme === "light" ? "bg-white text-[#060d38]" : "text-[#060d38]/50 dark:text-gray-400"
            }`}
          >
            Light
          </button>
        </div>

        {/* Profile */}
        <div className="mb-7 mt-3 flex items-center gap-3 py-3">
          <img alt="" className="h-8 w-8 rounded-full object-cover" src={imgAvatar} />
          <div className="flex-1 leading-tight">
            <p className="text-sm font-medium">{user?.name ?? "Utilisateur"}</p>
            <p className="text-[10px] text-[#e6e8f5]/70">{user?.role ?? "Admin"}</p>
          </div>
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
        <header className="flex h-16 items-center gap-3 bg-white px-4 shadow-[0px_4px_16px_0px_rgba(0,0,0,0.08)] dark:bg-[#0d5aa8] sm:px-6 lg:px-8">
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
              <img alt="Notifications" className="topbar-icon h-[27px] w-[27px]" src={imgBell} />
              <span className="absolute right-1 top-1 flex h-[14px] w-[14px] items-center justify-center rounded-full bg-[#f7b500] text-[8px] font-medium text-black">
                3
              </span>
            </button>
            <button
              type="button"
              title="Paramètres"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f5f5]"
            >
              <img alt="Paramètres" className="topbar-icon h-6 w-6" src={imgSettings} />
            </button>
            <button
              type="button"
              onClick={() => navigate("/dcs/new")}
              className="ml-2 flex h-10 items-center gap-2 rounded-full bg-[#004B87] px-6 text-xs font-normal text-white transition-opacity hover:opacity-90"
            >
              <img alt="" className="h-5 w-5" src={imgPlus} />
              <span className="hidden sm:inline">Nouvelle DC</span>
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