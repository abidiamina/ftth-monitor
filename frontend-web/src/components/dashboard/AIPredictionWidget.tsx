import { useEffect, useState } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, Info, Zap, Cloud, Activity, Map as MapIcon } from 'lucide-react';
import { getOutagePredictions } from '@/services/aiApi';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface PredictionFactor {
  label: string;
  value: string;
  impact: number;
}

interface Prediction {
  zone: string;
  probability: number;
  riskLevel: string;
  trend: 'UP' | 'DOWN' | 'STABLE';
  color: 'emerald' | 'amber' | 'rose';
  factors: {
    weather: PredictionFactor;
    incidents: PredictionFactor;
    criticality: PredictionFactor;
  };
  recommendation: string;
}

// Coordonnées approximatives pour l'affichage des zones sur la carte (Focus Tunis)
const getZoneCoordinates = (zoneName: string): [number, number] => {
  const lowerZone = zoneName.toLowerCase();
  if (lowerZone.includes('nord')) return [36.85, 10.18]; // Ariana / Nord
  if (lowerZone.includes('sud')) return [36.75, 10.20]; // Ben Arous / Sud
  if (lowerZone.includes('centre')) return [36.80, 10.18]; // Centre ville
  return [36.8065, 10.1815]; // Default Tunis
};

// Couleurs Hexa pour les CircleMarkers
const getRiskColor = (colorClass: string) => {
  if (colorClass === 'rose') return '#f43f5e';
  if (colorClass === 'amber') return '#f59e0b';
  return '#10b981'; // emerald
};

export const AIPredictionWidget = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const data = await getOutagePredictions();
        setPredictions(data);
      } catch (error) {
        console.error('Failed to fetch predictions', error);
        toast.error('Erreur lors du chargement des prédictions IA');
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-card animate-pulse flex flex-col justify-center items-center h-[400px]">
        <div className="h-12 w-12 bg-slate-100 rounded-full mb-4" />
        <div className="h-4 w-48 bg-slate-100 rounded mb-2" />
        <div className="h-3 w-32 bg-slate-50 rounded" />
      </div>
    );
  }

  return (
    <div className="dashboard-card overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 border border-violet-100 text-[10px] font-black uppercase tracking-widest text-violet-600 mb-2">
            <Zap className="h-3 w-3 fill-violet-600" /> Random Forest Model
          </div>
          <h2 className="text-2xl font-black text-slate-950 tracking-tight">Prédiction des Pannes.</h2>
          <p className="text-sm font-medium text-slate-500">Cartographie prédictive des zones critiques (Table 5.5).</p>
        </div>
        <div className="h-12 w-12 rounded-2xl bg-slate-950 flex items-center justify-center text-white shadow-xl">
           <MapIcon className="h-6 w-6" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* CARTE GEOGRAPHIQUE (Scénario nominal Étape 4) */}
        <div className="h-[500px] w-full rounded-[2rem] overflow-hidden border border-slate-100 shadow-inner relative z-0">
           <MapContainer 
            center={[36.8065, 10.1815]} 
            zoom={11} 
            scrollWheelZoom={false}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {predictions.map((p, idx) => (
              <CircleMarker 
                key={idx} 
                center={getZoneCoordinates(p.zone)}
                radius={p.probability > 70 ? 40 : p.probability > 40 ? 30 : 20}
                pathOptions={{
                  color: getRiskColor(p.color),
                  fillColor: getRiskColor(p.color),
                  fillOpacity: p.probability > 70 ? 0.4 : 0.2,
                  weight: 2
                }}
              >
                <Popup className="premium-popup">
                   <div className="text-center p-2">
                      <h4 className="font-extrabold text-slate-900 text-lg mb-1">{p.zone}</h4>
                      <p className={`text-2xl font-black ${
                         p.probability > 70 ? 'text-rose-500' : 
                         p.probability > 40 ? 'text-amber-500' : 
                         'text-emerald-500'
                      }`}>{p.probability}%</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Risque {p.riskLevel}</p>
                   </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        {/* LISTE DES DETAILS DES ZONES */}
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {predictions.map((p) => (
            <div key={p.zone} className="group relative p-5 rounded-[2rem] border border-slate-100 bg-white hover:shadow-lg transition-all">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-black text-slate-900">{p.zone}</h3>
                    <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      p.color === 'rose' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                      p.color === 'amber' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                      'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}>
                      {p.riskLevel}
                    </span>
                    {p.trend === 'UP' && <TrendingUp className="h-4 w-4 text-rose-500" />}
                    {p.trend === 'DOWN' && <TrendingDown className="h-4 w-4 text-emerald-500" />}
                  </div>
                  <div className="text-right">
                     <p className={`text-2xl font-black ${
                       p.probability > 70 ? 'text-rose-500' : 
                       p.probability > 40 ? 'text-amber-500' : 
                       'text-emerald-500'
                     }`}>{p.probability}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-tighter flex items-center gap-1">
                      <Cloud className="h-2 w-2" /> Météo
                    </p>
                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-violet-400" style={{ width: `${p.factors?.weather?.impact || 0}%` }} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-tighter flex items-center gap-1">
                      <AlertTriangle className="h-2 w-2" /> Historique
                    </p>
                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-sky-400" style={{ width: `${p.factors?.incidents?.impact || 0}%` }} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-tighter flex items-center gap-1">
                      <Zap className="h-2 w-2" /> Charge
                    </p>
                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-amber-400" style={{ width: `${p.factors?.criticality?.impact || 0}%` }} />
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <Info className="h-3 w-3 text-slate-400 mt-0.5 shrink-0" />
                  <p className="text-[10px] font-medium text-slate-600 leading-tight">"{p.recommendation}"</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
