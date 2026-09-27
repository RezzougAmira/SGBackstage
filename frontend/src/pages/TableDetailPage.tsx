import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Table, Attribut } from "../types";
import { tablesApi } from "../api/tables";
import { Breadcrumb } from "../components/Breadcrumb";
import { DetailSkeleton } from "../components/ui/pageSkeletons";

export function TableDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [table, setTable] = useState<Table | null>(null);
  const [attributs, setAttributs] = useState<Attribut[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!id) return;
    try {
      const [tableData, attributsData] = await Promise.all([
        tablesApi.get(parseInt(id)),
        tablesApi.listAttributs(parseInt(id)),
      ]);
      setTable(tableData);
      setAttributs(attributsData);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!table) {
    return <div className="py-8 text-center">Table non trouvée</div>;
  }

  return (
    <div>
      <Breadcrumb items={[{ label: "Tables & attributs", path: "/tables" }, { label: table.nom }]} />

      <div className="mb-6">
        <h1 className="font-poppins text-3xl font-bold tracking-tight text-[#0c1d31] dark:text-white">
          {table.nom}
        </h1>
        <p className="mt-1 font-poppins text-sm text-[#0c1d31]/70 dark:text-white/60">
          {table.base_donnees ? `Base : ${table.base_donnees} — ` : ""}
          {table.description || "Aucune description"}
        </p>
      </div>

      <div className="mb-6">
        <h2 className="mb-3 font-poppins text-xl font-semibold text-[#003049] dark:text-white">
          Attributs
        </h2>
        <div className="overflow-x-auto rounded-xl border border-[#dcdce1] bg-[#fafafa] dark:border-white/10 dark:bg-white/5">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#dcdce1] dark:border-white/10">
                <th className="px-5 py-3 font-poppins text-xs font-medium text-[#9d9999]">
                  Nom
                </th>
                <th className="px-5 py-3 font-poppins text-xs font-medium text-[#9d9999]">
                  Type
                </th>
              </tr>
            </thead>
            <tbody>
              {attributs.map((attr, i) => (
                <tr
                  key={attr.id}
                  className={`border-b border-[#dcdce1] last:border-none hover:bg-[#e6e8f5] dark:border-white/10 dark:hover:bg-white/10 ${
                    i % 2 === 1 ? "dark:bg-white/5" : ""
                  }`}
                >
                  <td className="px-5 py-2.5 font-poppins text-sm text-[#003049] dark:text-white">
                    {attr.nom}
                  </td>
                  <td className="px-5 py-2.5 font-poppins text-sm text-[#003049] dark:text-white">
                    {attr.type}
                  </td>
                </tr>
              ))}
              {attributs.length === 0 && (
                <tr>
                  <td
                    colSpan={2}
                    className="px-8 py-10 text-center font-poppins text-sm text-[#525f6d] dark:text-white/60"
                  >
                    Aucun attribut pour cette table.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}