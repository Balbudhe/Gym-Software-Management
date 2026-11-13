import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useBranch } from '../../context/BranchContext';
import PageHeader from '../../components/common/PageHeader';
import Skeleton from '../../components/common/Skeleton';
import DataTable from '../../components/tables/DataTable';
import BatchChips from '../../components/common/BatchChips';
import MobileCard, { MobileCardActions, MobileCardHeader, MobileCardMeta } from '../../components/mobile/MobileCard';

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
          mobileRender={(r) => (
            <MobileCard>
              <MobileCardHeader title={r.name} subtitle={r.branchId?.name} />
              <MobileCardMeta
                items={[
                  { label: 'Admissions', value: r.stats?.admissions },
                  { label: 'Assigned', value: r.stats?.assigned },
                  { label: 'Active', value: r.stats?.active },
                  { label: 'Batches', value: r.batches?.length ? `${r.batches.length} batch(es)` : '—' },
                ]}
              />
              <MobileCardActions>
                <Link
                  to={`/owner/trainers/${r._id}`}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-brand-700"
                >
                  View trainer
                </Link>
              </MobileCardActions>
            </MobileCard>
          )}
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
