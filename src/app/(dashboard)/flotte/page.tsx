"use client";

import { useState, useEffect } from "react";
import { 
    Truck, 
    AlertTriangle, 
    CheckCircle2, 
    Clock, 
    Wrench, 
    ShieldAlert, 
    Plus,
    Calendar,
    Gauge,
    Loader2,
    ChevronRight,
    Search
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { addVehicle } from "@/app/actions/fleet";
import { showToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/Modal";

export default function FleetPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [stats, setStats] = useState({ total: 0, maintenance: 0, alert: 0 });

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newVehicle, setNewVehicle] = useState({ name: "", type: "camion", regNumber: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchFleet = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('vehicles')
            .select('*, maintenance_logs(*)')
            .order('created_at', { ascending: false });

        if (data) {
            setVehicles(data);
            const total = data.length;
            const maintenance = data.filter((v: any) => v.status === 'in_maintenance').length;
            const alert = data.filter((v: any) => {
                const daysOld = (Date.now() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24);
                return daysOld > 30 && !v.last_maintenance_date;
            }).length;
            setStats({ total, maintenance, alert });
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchFleet();
    }, []);

    const handleAddVehicle = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const res = await addVehicle(newVehicle.name, newVehicle.type, newVehicle.regNumber);
        if (res.success) {
            showToast("Véhicule enregistré", "success");
            setIsAddModalOpen(false);
            setNewVehicle({ name: "", type: "camion", regNumber: "" });
            fetchFleet();
        } else {
            showToast(res.error || "Erreur", "error");
        }
        setIsSubmitting(false);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Chargement du garage...</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter uppercase italic flex items-center gap-4">
                        <Truck className="w-12 h-12 text-primary" />
                        Gestion <span className="text-primary">Flotte</span>
                    </h1>
                    <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest mt-4">
                        Surveillance technique du parc automobile CITICLINE
                    </p>
                </div>
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-8 py-4 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white font-black text-[10px] uppercase tracking-widest rounded-3xl hover:scale-105 active:scale-95 transition-all shadow-xl"
                >
                    <Plus className="w-4 h-4" />
                    Ajouter un véhicule
                </button>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-sm flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <Truck className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Véhicules</p>
                        <p className="text-3xl font-black text-gray-900 dark:text-white italic">{stats.total}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-sm flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <Wrench className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">En Maintenance</p>
                        <p className="text-3xl font-black text-gray-900 dark:text-white italic">{stats.maintenance}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-sm flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                        <ShieldAlert className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Alertes Entretien</p>
                        <p className="text-3xl font-black text-gray-900 dark:text-white italic">{stats.alert}</p>
                    </div>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="flex items-center gap-4 bg-gray-50 dark:bg-zinc-900/50 p-4 rounded-3xl border border-gray-100 dark:border-zinc-800">
                <Search className="w-5 h-5 text-gray-400 ml-2" />
                <input 
                    type="text" 
                    placeholder="RECHERCHER PAR MATRICULE OU MODÈLE..." 
                    className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-widest w-full"
                />
            </div>

            {/* Vehicle List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {vehicles.map((vehicle) => (
                    <VehicleCard key={vehicle.id} vehicle={vehicle} />
                ))}
            </div>

            {/* Modal Ajout Véhicule */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Enregistrer un Véhicule">
                <form onSubmit={handleAddVehicle} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Nom du véhicule (ex: Camion 01)</label>
                            <input 
                                required
                                className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none font-black uppercase"
                                placeholder="NOM DU VÉHICULE"
                                value={newVehicle.name}
                                onChange={(e) => setNewVehicle({...newVehicle, name: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Numéro d'immatriculation</label>
                            <input 
                                required
                                className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none font-black uppercase"
                                placeholder="AA-000-AA"
                                value={newVehicle.regNumber}
                                onChange={(e) => setNewVehicle({...newVehicle, regNumber: e.target.value.toUpperCase()})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4">Type de véhicule</label>
                            <select 
                                className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none font-black uppercase"
                                value={newVehicle.type}
                                onChange={(e) => setNewVehicle({...newVehicle, type: e.target.value})}
                            >
                                <option value="camion">Camion de collecte</option>
                                <option value="tricycle">Tricycle motorisé</option>
                                <option value="benne">Benne tasseuse</option>
                            </select>
                        </div>
                    </div>
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full py-5 bg-primary text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-xl disabled:opacity-50"
                    >
                        {isSubmitting ? "Enregistrement..." : "Confirmer l'Ajout"}
                    </button>
                </form>
            </Modal>

            {vehicles.length === 0 && (
                <div className="text-center py-24 opacity-20">
                    <Truck className="w-20 h-20 mx-auto mb-6" />
                    <p className="font-black uppercase tracking-[0.3em] text-xs">Aucun véhicule enregistré</p>
                </div>
            )}
        </div>
    );
}

function VehicleCard({ vehicle }: any) {
    // Mocking data for missing fields in schema
    const currentMileage = 12500; // Placeholder
    const oilLimit = 15000; // Placeholder
    const oilProgress = Math.min(100, (currentMileage / oilLimit) * 100);
    const needsOil = currentMileage >= (oilLimit - 500);
    const insuranceExpiry = vehicle.created_at; // Placeholder - using created_at for insurance mock

    return (
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-gray-100 dark:border-zinc-800 hover:border-primary/30 transition-all group relative overflow-hidden">
            {needsOil && <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl" />}
            
            <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0",
                        vehicle.status === 'active' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" : "bg-amber-50 text-amber-600 dark:bg-amber-500/10"
                    )}>
                        <Truck className="w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="font-black text-gray-900 dark:text-white uppercase text-sm tracking-tight">{vehicle.name}</h3>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">{vehicle.registration_number}</p>
                    </div>
                </div>
                {needsOil && (
                    <div className="bg-red-500 p-2 rounded-xl animate-pulse text-white shadow-lg shadow-red-500/20">
                        <AlertTriangle className="w-4 h-4" />
                    </div>
                )}
            </div>

            <div className="space-y-6">
                <div>
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Entretien (Vidange)</span>
                        <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase">{currentMileage} / {oilLimit} KM</span>
                    </div>
                    <div className="h-2 bg-gray-50 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                            className={cn(
                                "h-full rounded-full transition-all duration-1000",
                                needsOil ? "bg-red-500" : "bg-primary"
                            )} 
                            style={{ width: `${oilProgress}%` }} 
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Gauge className="w-3 h-3" />
                            Kilométrage
                        </p>
                        <p className="text-xs font-black text-gray-900 dark:text-white uppercase italic">{currentMileage} KM</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Assurance
                        </p>
                        <p className={cn(
                            "text-xs font-black uppercase italic",
                            new Date(insuranceExpiry) < new Date() ? "text-red-500" : "text-gray-900 dark:text-white"
                        )}>
                            {new Date(insuranceExpiry).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                        </p>
                    </div>
                </div>
            </div>

            <button className="w-full mt-8 py-4 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 group-hover:bg-zinc-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-zinc-900 transition-all">
                Détails Maintenance
                <ChevronRight className="w-3 h-3" />
            </button>
        </div>
    );
}
