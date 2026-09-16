import { useNavigate } from 'react-router-dom';
import { dcApi } from '../api/dc';
import { Breadcrumb } from '../components/Breadcrumb';
import { DCForm } from '../components/forms/DCForm';

export function DCCreatePage() {
  const navigate = useNavigate();

  const handleCreate = async (data: any) => {
    await dcApi.create(data);
    navigate('/dcs');
  };

  return (
    <div>
      <Breadcrumb items={[{ label: 'Demandes de changement', path: '/dcs' }, { label: 'Nouvelle DC' }]} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Nouvelle demande de changement</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <DCForm
          onSubmit={handleCreate}
          onCancel={() => navigate('/dcs')}
        />
      </div>
    </div>
  );
}
