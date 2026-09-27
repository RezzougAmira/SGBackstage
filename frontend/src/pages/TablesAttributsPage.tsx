import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { tablesApi } from "../api/tables";
import { attributsApi } from "../api/attributs";
import { Table } from "../types";
import { TableForm } from "../components/forms/TableForm";
import { TablesSkeleton } from "../components/ui/pageSkeletons";

/* -------------------------------------------------------------------------- */
/*  Icônes (Heroicons, SVG inline)                                            */
/* -------------------------------------------------------------------------- */

function IconSearch({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="11" cy="11" r="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPlus({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChevronDown({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChevronLeft({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChevronRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChevronDoubleLeft({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M18 17l-5-5 5-5M11 17l-5-5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChevronDoubleRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M6 17l5-5-5-5M13 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Filtres (select stylisé)                                                   */
/* -------------------------------------------------------------------------- */

interface FilterOption {
  value: string;
  label: string;
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-poppins text-[10px] font-bold uppercase text-[#0c1d31] dark:text-white">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-[#525f6d] bg-[#f6f8fa] px-3 py-2.5 pr-8 font-poppins text-[13px] text-[#525f6d] outline-none dark:bg-white/5 dark:text-white/70"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#525f6d] dark:text-white/70" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page "Tables & Attributs"                                                  */
/* -------------------------------------------------------------------------- */

export function TablesAttributsPage() {
  const navigate = useNavigate();

  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterSchema, setFilterSchema] = useState("Tous les schémas");
  const [filterAttributs, setFilterAttributs] = useState("Tous");
  const [sortBy, setSortBy] = useState("nom-asc");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [showTableModal, setShowTableModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchTables = async () => {
    try {
      const data = await tablesApi.list();
      setTables(data);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const filterAttributsMatch = (count: number, bucket: string) => {
    switch (bucket) {
      case "0":
        return count === 0;
      case "1-10":
        return count >= 1 && count <= 10;
      case "11-20":
        return count >= 11 && count <= 20;
      case "21+":
        return count >= 21;
      default:
        return true;
    }
  };

  const filteredRows = useMemo(() => {
    let rows = tables;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (row) =>
          (row.nom ?? "").toLowerCase().includes(q) ||
          (row.description ?? "").toLowerCase().includes(q)
      );
    }

    if (filterSchema !== "Tous les schémas") {
      rows = rows.filter((row) => (row.base_donnees ?? "") === filterSchema);
    }

    if (filterAttributs !== "Tous") {
      rows = rows.filter((row) => filterAttributsMatch(row.attribut_count ?? 0, filterAttributs));
    }

    switch (sortBy) {
      case "nom-desc":
        rows = [...rows].sort((a, b) => (a.nom ?? "").localeCompare(b.nom ?? "")).reverse();
        break;
      case "attributs-asc":
        rows = [...rows].sort((a, b) => (a.attribut_count ?? 0) - (b.attribut_count ?? 0));
        break;
      case "attributs-desc":
        rows = [...rows].sort((a, b) => (b.attribut_count ?? 0) - (a.attribut_count ?? 0));
        break;
      default:
        rows = [...rows].sort((a, b) => (a.nom ?? "").localeCompare(b.nom ?? ""));
    }

    return rows;
  }, [tables, search, filterSchema, filterAttributs, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pageRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const clearAll = () => {
    setSearch("");
    setFilterSchema("Tous les schémas");
    setFilterAttributs("Tous");
    setSortBy("nom-asc");
    setPage(1);
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  };

  const handleCreateTable = async (data: {
    nom: string;
    schema?: string;
    description?: string;
    attributs: { nom: string; type: string }[];
  }) => {
    const table = await tablesApi.create({
      nom: data.nom,
      base_donnees: data.schema || undefined,
      description: data.description,
    });
    for (const attr of data.attributs) {
      await attributsApi.create(table.id, { nom: attr.nom, type: attr.type });
    }
    await fetchTables();
    setShowTableModal(false);
    showToast(`Table "${table.nom}" créée avec succès.`);
  };

  if (loading) {
    return <TablesSkeleton />;
  }

  return (
    <div>
      {/* Titre */}
      <div className="mb-6">
        <h1 className="font-poppins text-3xl font-bold tracking-tight text-[#0c1d31] dark:text-white">
          Tables &amp; Attributs
        </h1>
        <p className="mt-1 font-poppins text-sm text-[#0c1d31]/70 dark:text-white/60">
          Explorez les tables utilisées par le SGB
        </p>
      </div>

      {/* Barre de recherche + bouton nouvelle table */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex w-full max-w-[755px] items-center gap-2 rounded-full bg-[#e6e8f5] px-5 py-3 dark:bg-white/5">
          <IconSearch className="h-5 w-5 flex-shrink-0 text-[#525f6d]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une table..."
            className="w-full bg-transparent font-poppins text-sm text-[#525f6d] placeholder:text-[#525f6d] outline-none dark:text-white/70"
          />
        </div>

        <button
          type="button"
          title="Nouvelle table"
          onClick={() => setShowTableModal(true)}
          className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-[#003049] px-5 py-3 font-poppins text-sm font-semibold text-white hover:bg-[#00263a]"
        >
          <IconPlus className="h-4 w-4" />
          Nouvelle table
        </button>
      </div>

      {/* Filtres */}
      <div className="mb-6 flex flex-wrap items-end gap-6">
        <div className="w-[220px]">
          <FilterSelect
            label="Schéma"
            value={filterSchema}
            onChange={setFilterSchema}
            options={[
              { value: "Tous les schémas", label: "Tous les schémas" },
              ...Array.from(new Set(tables.map((t) => t.base_donnees).filter(Boolean) as string[])).map(
                (s) => ({ value: s, label: s })
              ),
            ]}
          />
        </div>
        <div className="w-[180px]">
          <FilterSelect
            label="Attributs"
            value={filterAttributs}
            onChange={setFilterAttributs}
            options={[
              { value: "Tous", label: "Tous" },
              { value: "0", label: "Sans attribut" },
              { value: "1-10", label: "1 à 10" },
              { value: "11-20", label: "11 à 20" },
              { value: "21+", label: "21 et plus" },
            ]}
          />
        </div>
        <div className="w-[200px]">
          <FilterSelect
            label="Tri"
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: "nom-asc", label: "Nom A-Z" },
              { value: "nom-desc", label: "Nom Z-A" },
              { value: "attributs-asc", label: "Attributs ↑" },
              { value: "attributs-desc", label: "Attributs ↓" },
            ]}
          />
        </div>

        <button
          type="button"
          onClick={clearAll}
          className="ml-auto flex items-center justify-center rounded-lg border border-[#525f6d] bg-[#f6f8fa] px-4 py-2.5 font-poppins text-sm text-[#525f6d] hover:bg-white dark:bg-white/5 dark:text-white/70"
        >
          Clear All
        </button>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto rounded-xl border border-[#dcdce1] bg-[#fafafa] shadow-md dark:border-white/10 dark:bg-white/5">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#dcdce1] dark:border-white/10">
              <th className="px-5 py-3 font-poppins text-xs font-medium text-[#9d9999]">
                Nom
              </th>
              <th className="px-5 py-3 font-poppins text-xs font-medium text-[#9d9999]">
                Description
              </th>
              <th className="px-5 py-3 font-poppins text-xs font-medium text-[#9d9999]">
                Attributs
              </th>
              <th className="px-8 py-4" />
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr
                key={row.id}
                className={`border-b border-[#dcdce1] last:border-none hover:bg-[#e6e8f5] dark:border-white/10 dark:hover:bg-white/10 ${
                  i % 2 === 1 ? "dark:bg-white/5" : ""
                }`}
              >
                <td className="px-5 py-3.5 font-poppins text-sm text-[#003049] dark:text-white">
                  {row.nom}
                </td>
                <td className="px-5 py-3.5 font-poppins text-sm text-[#003049] dark:text-white">
                  {row.description || "—"}
                </td>
                <td className="px-5 py-3.5 font-poppins text-sm text-[#003049] dark:text-white">
                  {row.attribut_count ?? 0}
                </td>
                <td className="px-8 py-6 text-right">
                  <button
                    type="button"
                    onClick={() => navigate(`/tables/${row.id}`)}
                    className="rounded-full bg-[#003049] px-5 py-2 font-poppins text-xs font-semibold text-white hover:bg-[#00263a]"
                  >
                    Voir Plus
                  </button>
                </td>
              </tr>
            ))}

            {pageRows.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-8 py-10 text-center font-poppins text-sm text-[#525f6d] dark:text-white/60"
                >
                  Aucune table ne correspond à votre recherche.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 font-poppins text-xs text-[#003049]/90 dark:text-white/70">
        <p>
          {pageRows.length === 0
            ? "0 éléments"
            : `${((page - 1) * pageSize + 1)
                .toString()
                .padStart(2, "0")}-${(Math.min(page * pageSize, filteredRows.length))
                .toString()
                .padStart(2, "0")} par ${filteredRows.length} éléments`}
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(1)}
            className="rounded-md p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
            title="Première page"
          >
            <IconChevronDoubleLeft />
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
            title="Page précédente"
          >
            <IconChevronLeft />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`h-7 w-7 rounded-md font-medium ${
                p === page
                  ? "bg-[#003049] text-white"
                  : "text-[#003049] hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-md p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
            title="Page suivante"
          >
            <IconChevronRight />
          </button>
          <button
            onClick={() => setPage(totalPages)}
            className="rounded-md p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
            title="Dernière page"
          >
            <IconChevronDoubleRight />
          </button>
        </div>

        <div className="flex items-center gap-2 lowercase">
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="appearance-none rounded-md border border-[#003049] bg-transparent px-3 py-1.5 pr-6 text-xs font-medium text-[#003049] outline-none dark:border-white/40 dark:text-white"
            >
              {[6, 10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n.toString().padStart(2, "0")}
                </option>
              ))}
            </select>
            <IconChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2" />
          </div>
          <span>éléments par Page</span>
        </div>
      </div>

      {showTableModal && (
        <TableForm
          onSubmit={handleCreateTable}
          onCancel={() => setShowTableModal(false)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[80] flex items-center gap-2 rounded-xl border border-[#26A69A]/50 bg-white px-5 py-3 text-sm font-medium text-[#0a7d74] shadow-2xl dark:bg-[#131313] dark:text-teal-300">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {toast}
        </div>
      )}
    </div>
  );
}