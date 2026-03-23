import { useState, useEffect, useCallback } from 'react';
import { wasteService } from '@/services/wasteService';
import { showToast } from '@/components/ui/toast';

export function useWasteDetails(id: string) {
  const [waste, setWaste] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchWaste = useCallback(async () => {
    setLoading(true);
    try {
      const data = await wasteService.getWasteDetails(id);
      setWaste(data);
    } catch (err: any) {
      console.error(err);
      setError("Impossible de charger les détails du lot.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchWaste();
  }, [fetchWaste]);

  const reserve = async (userId: string) => {
    if (!userId) return false;
    
    setActionLoading(true);
    try {
      await wasteService.reserveWaste(id, userId);
      showToast("Réservation réussie !", "success");
      return true;
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Erreur lors de la réservation.", "error");
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  return {
    waste,
    loading,
    error,
    actionLoading,
    reserve,
    refresh: fetchWaste
  };
}
