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
    const [newVehicle, setNewVehicle] = useState({ 
        name: "", 
        type: "camion", 
        regNumber: "",
        initialMileage: "0",
        insuranceExpiry: ""
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchFleet = async () => {
        setLoading(true);
        try {
            // Timeout de 5s pour l'auth
            const sessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000));
            
            const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
            const user = session?.user;
            
            if (!user) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('vehicles')
                .select('*, maintenance_logs(*)')
                .order('created_at', { ascending: false });

            if (error) throw error;

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
        } catch (err) {
            console.error("Fleet fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFleet();
    }, []);

    const handleAddVehicle = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const res = await addVehicle(
            newVehicle.name, 
            newVehicle.type, 
            newVehicle.regNumber,
            parseInt(newVehicle.initialMileage) || 0,
            newVehicle.insuranceExpiry
        );
        if (res.success) {
            showToast("Véhicule enregistré", "success");
            setIsAddModalOpen(false);
            setNewVehicle({ 
                name: "", 
                type: "camion", 
                regNumber: "",
                initialMileage: "0",
                insuranceExpiry: ""
            });
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
        <div className="min-h-screen bg-zinc-950 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-2xl">
                                <Truck className="w-8 h-8 text-emerald-500" />
                            </div>
                            <div>
                                <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase italic leading-none">
                                    GESTION <span className="text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">FLOTTE</span>
                                </h1>
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mt-2">
                                    Surveillance technique & Télémesure Citicline
                                </p>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="group relative flex items-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl transition-all shadow-2xl shadow-emerald-500/20 active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Ajouter un véhicule
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { label: "VÉHICULES", value: stats.total, icon: Truck, color: "emerald" },
                        { label: "EN MAINTENANCE", value: stats.maintenance, icon: Wrench, color: "amber" },
                        { label: "ALERTES ENTRETIEN", value: stats.alert, icon: ShieldAlert, color: "red" }
                    ].map((card, i) => (
                        <div key={i} className="bg-zinc-900/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 shadow-2xl flex items-center gap-6 group hover:border-white/10 transition-all">
                            <div className={cn(
                                "w-16 h-16 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 shadow-inner",
                                card.color === "emerald" ? "bg-emerald-500/10 text-emerald-500" :
                                card.color === "amber" ? "bg-amber-500/10 text-amber-500" :
                                "bg-red-500/10 text-red-500"
                            )}>
                                <card.icon size={32} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{card.label}</p>
                                <p className="text-4xl font-black italic tracking-tighter">{card.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Search Bar Section */}
                <div className="relative group max-w-2xl">
                    <div className="absolute inset-0 bg-emerald-500/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-center gap-4 bg-zinc-900/50 backdrop-blur-md p-2 pl-6 rounded-3xl border border-white/5 group-focus-within:border-emerald-500/30 transition-all">
                        <Search className="w-5 h-5 text-zinc-500" />
                        <input 
                            type="text" 
                            placeholder="RECHERCHER PAR MATRICULE OU MODÈLE..." 
                            className="bg-transparent border-none focus:ring-0 text-[11px] font-black uppercase tracking-widest w-full text-white placeholder:text-zinc-600 h-14"
                        />
                    </div>
                </div>

            {/* Vehicle List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {vehicles.map((vehicle) => (
                    <VehicleCard key={vehicle.id} vehicle={vehicle} />
                ))}
            </div>

            {/* Modal Ajout Véhicule */}
            <Modal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                title="Enregistrer un Véhicule"
                className="dark bg-zinc-900 border-white/10"
            >
                <form onSubmit={handleAddVehicle} className="space-y-8">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Nom du véhicule (ex: Camion 01)</label>
                            <input 
                                required
                                className="w-full px-6 py-5 bg-zinc-950 border border-white/5 rounded-2xl text-sm outline-none font-black uppercase text-white focus:border-emerald-500/50 transition-all"
                                placeholder="NOM DU VÉHICULE"
                                value={newVehicle.name}
                                onChange={(e) => setNewVehicle({...newVehicle, name: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Numéro d'immatriculation</label>
                            <input 
                                required
                                className="w-full px-6 py-5 bg-zinc-950 border border-white/5 rounded-2xl text-sm outline-none font-black uppercase text-white focus:border-emerald-500/50 transition-all"
                                placeholder="AA-000-AA"
                                value={newVehicle.regNumber}
                                onChange={(e) => setNewVehicle({...newVehicle, regNumber: e.target.value.toUpperCase()})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Type de véhicule</label>
                            <select 
                                className="w-full px-6 py-5 bg-zinc-950 border border-white/5 rounded-2xl text-sm outline-none font-black uppercase text-white focus:border-emerald-500/50 transition-all appearance-none"
                                value={newVehicle.type}
                                onChange={(e) => setNewVehicle({...newVehicle, type: e.target.value})}
                            >
                                <option value="camion" className="bg-zinc-900">Camion de collecte</option>
                                <option value="tricycle" className="bg-zinc-900">Tricycle motorisé</option>
                                <option value="benne" className="bg-zinc-900">Benne tasseuse</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Km Initial</label>
                                <input 
                                    type="number"
                                    required
                                    className="w-full px-6 py-5 bg-zinc-950 border border-white/5 rounded-2xl text-sm outline-none font-black text-white focus:border-emerald-500/50 transition-all"
                                    placeholder="0"
                                    value={newVehicle.initialMileage}
                                    onChange={(e) => setNewVehicle({...newVehicle, initialMileage: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Assurance (Exp)</label>
                                <input 
                                    type="date"
                                    required
                                    className="w-full px-6 py-5 bg-zinc-950 border border-white/5 rounded-2xl text-sm outline-none font-black uppercase text-white focus:border-emerald-500/50 transition-all"
                                    value={newVehicle.insuranceExpiry}
                                    onChange={(e) => setNewVehicle({...newVehicle, insuranceExpiry: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full py-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-emerald-500/20 disabled:opacity-50 transition-all active:scale-95"
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
        </div>
    );
}


function VehicleCard({ vehicle }: { vehicle: any }) {
    const isMaintenanceNeeded = vehicle.status === 'in_maintenance';
    
    // Calculate maintenance progress based on real mileage
    const mileage = vehicle.current_mileage || 0;
    const lastOilChange = vehicle.last_oil_change_mileage || 0;
    const interval = vehicle.oil_change_interval || 5000;
    const kmSinceOilChange = Math.max(0, mileage - lastOilChange);
    const oilProgress = Math.min(Math.round((kmSinceOilChange / interval) * 100), 100);
    const needsOil = oilProgress >= 90;
    
    // Insurance delay check
    const isInsuranceExpiring = vehicle.insurance_expiry_date ? new Date(vehicle.insurance_expiry_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : false;
    const isInsuranceOverdue = vehicle.insurance_expiry_date ? new Date(vehicle.insurance_expiry_date) < new Date() : false;

    return (
        <div className="bg-zinc-900/40 backdrop-blur-xl p-8 rounded-[3rem] border border-white/5 hover:border-emerald-500/30 transition-all group relative overflow-hidden shadow-2xl">
            {isMaintenanceNeeded && <div className="absolute inset-0 bg-amber-500/5 pointer-events-none" />}
            {(needsOil || isInsuranceOverdue) && <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl pointer-events-none" />}
            
            <div className="flex items-start justify-between mb-8 relative z-10">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-2xl",
                        vehicle.status === 'active' 
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    )}>
                        <Truck className="w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="font-black text-white uppercase text-sm tracking-tight leading-none mb-1">{vehicle.name}</h3>
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">{vehicle.registration_number}</p>
                    </div>
                </div>
                {(needsOil || isInsuranceOverdue || isMaintenanceNeeded) && (
                    <div className={cn(
                        "p-2 rounded-xl animate-pulse shadow-lg",
                        isMaintenanceNeeded ? "bg-amber-500 text-white shadow-amber-500/20" : "bg-red-500 text-white shadow-red-500/20"
                    )}>
                        <AlertTriangle className="w-4 h-4" />
                    </div>
                )}
            </div>

            <div className="space-y-6 relative z-10">
                <div>
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Maintenance (VIDANGE)</span>
                        <span className={cn("text-[10px] font-black uppercase italic", needsOil ? "text-red-500" : "text-emerald-500")}>
                            {oilProgress}%
                        </span>
                    </div>
                    <div className="h-2 bg-zinc-950 rounded-full overflow-hidden border border-white/5">
                        <div 
                            className={cn(
                                "h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.3)]",
                                needsOil ? "bg-red-500 shadow-red-500/30" : "bg-emerald-500"
                            )} 
                            style={{ width: `${oilProgress}%` }} 
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-zinc-950/50 rounded-2xl border border-white/5 group-hover:border-white/10 transition-colors">
                        <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Gauge className="w-3 h-3 text-emerald-500" />
                            KILOMÉTRAGE
                        </p>
                        <p className="text-sm font-black text-white uppercase italic tracking-tighter">{mileage.toLocaleString()} KM</p>
                    </div>
                    <div className="p-4 bg-zinc-950/50 rounded-2xl border border-white/5 group-hover:border-white/10 transition-colors">
                        <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-emerald-500" />
                            ASSURANCE
                        </p>
                        <p className={cn(
                            "text-sm font-black uppercase italic tracking-tighter",
                            isInsuranceOverdue ? "text-red-500" : isInsuranceExpiring ? "text-amber-500" : "text-white"
                        )}>
                            {vehicle.insurance_expiry_date ? new Date(vehicle.insurance_expiry_date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : 'NON RÉGLÉ'}
                        </p>
                    </div>
                </div>
            </div>

            <button onClick={() => showToast('Détails de maintenance à venir', 'success')} className="w-full mt-8 py-5 bg-zinc-950 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 hover:text-white hover:border-emerald-500 transition-all shadow-xl active:scale-95">
                DÉTAILS MAINTENANCE
                <ChevronRight className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}
