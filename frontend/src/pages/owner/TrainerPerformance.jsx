import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useBranch } from '../../context/BranchContext';
import PageHeader from '../../components/common/PageHeader';
import Skeleton from '../../components/common/Skeleton';
import DataTable from '../../components/tables/DataTable';
import BatchChips from '../../components/common/BatchChips';

export default function TrainerPerformance() {
  const { selectedBranch } = useBranch();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/trainers/performance');
        setRows(data.items || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedBranch]);

  return (
    <div>
      <PageHeader title="Trainer Performance" />
      {loading ? <Skeleton /> : (
        <DataTable
          rows={rows}
          columns={[
            { key: 'name', header: 'Trainer', render: (r) => <Link className="font-medium text-brand-700" to={`/owner/trainers/${r._id}`}>{r.name}</Link> },
            { key: 'branch', header: 'Branch', render: (r) => r.branchId?.name },
            { key: 'batches', header: 'Batches', render: (r) => <BatchChips batches={r.batches} empty="—" /> },
            { key: 'admissions', header: 'Admissions', render: (r) => r.stats?.admissions },
            { key: 'assigned', header: 'Assigned Members', render: (r) => r.stats?.assigned },
            { key: 'active', header: 'Active Members', render: (r) => r.stats?.active },
          ]}
        />
      )}
    </div>
  );
}
