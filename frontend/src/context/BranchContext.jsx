import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { setBranchGetter } from '../services/branchBridge';
import { useAuth } from './AuthContext';

const BranchContext = createContext(null);

export const BranchProvider = ({ children }) => {
  const { user } = useAuth();
  const storageKey = user?.gymId ? `selectedBranch:${user.gymId}` : 'selectedBranch';
  const [selectedBranch, setSelectedBranch] = useState(
    () => localStorage.getItem(storageKey) || 'ALL'
  );
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setBranchGetter(() => selectedBranch);
  }, [selectedBranch]);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey) || 'ALL';
    setSelectedBranch(stored);
  }, [storageKey]);

  useEffect(() => {
    const load = async () => {
      if (!user || user.role !== 'OWNER') {
        setBranches([]);
        return;
      }
      setLoading(true);
      try {
        const { data } = await api.get('/branches');
        setBranches(data.items || []);
      } catch {
        setBranches([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const selectBranch = (value) => {
    setSelectedBranch(value);
    localStorage.setItem(storageKey, value);
  };

  const currentBranch = branches.find((b) => b._id === selectedBranch) || null;

  const value = useMemo(
    () => ({
      selectedBranch,
      selectBranch,
      branches,
      currentBranch,
      loading,
      reloadBranches: async () => {
        const { data } = await api.get('/branches');
        setBranches(data.items || []);
      },
    }),
    [selectedBranch, branches, currentBranch, loading, storageKey]
  );

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
};

export const useBranch = () => useContext(BranchContext);
