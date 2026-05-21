import { useEffect, useState } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, Info, Zap, Cloud, Map as MapIcon } from 'lucide-react';
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

const getZoneCoordinates = (zoneName: string): [number, number] => {
  const lowerZone = zoneName.toLowerCase();

  if (lowerZone.includes('jendouba')) return [36.5011, 8.7802];
  if (lowerZone.includes('sousse')) return [35.8256, 10.6369];
  if (lowerZone.includes('sfax')) return [34.7405, 10.7603];
  if (lowerZone.includes('bizerte')) return [37.2744, 9.8739];
  if (lowerZone.includes('nabeul')) return [36.4561, 10.7376];
  if (lowerZone.includes('kairouan')) return [35.6781, 10.0963];

  if (lowerZone.includes('nord')) return [36.85, 10.18];
  if (lowerZone.includes('sud')) return [36.75, 10.20];
  if (lowerZone.includes('centre')) return [36.80, 10.18];

  return [36.8065, 10.1815];
};

const getRiskColor = (colorClass: string) => {
  if (colorClass === 'rose') return '#f43f5e';
  if (colorClass === 'amber') return '#f59e0b';
  return '#10b981';
};

const getRiskTextClass = (probability: number) => {
  if (probability > 70) return 'text-rose-500';
  if (probability > 40) return 'text-amber-500';
  return 'text-emerald-500';
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
        toast.error('Erreur lors du chargement des predictions IA');
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
    <div className="dashboard-card overflow-hidden border border-slate-200/70 bg-gradient-to-br from-white via-slate-50/70 to-cyan-50/40 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.5)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-100 text-[10px] font-black uppercase tracking-widest text-sky-700 mb-2">
            <Zap className="h-3 w-3 fill-sky-600" /> Random Forest Model
          </div>
          <h2 className="text-xl font-black text-slate-950 tracking-tight">Prediction des Pannes.</h2>
          <p className="text-xs font-medium text-slate-500">Cartographie predictive des zones critiques.</p>
        </div>
        <div className="h-12 w-12 rounded-2xl bg-slate-950 flex items-center justify-center text-white shadow-xl ring-4 ring-slate-200/60">
          <MapIcon className="h-6 w-6" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="h-[420px] w-full rounded-[1.6rem] overflow-hidden border border-slate-200 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] relative z-0">
          <MapContainer
            center={[35.8, 10.0]}
            zoom={7}
            scrollWheelZoom={false}
            className="h-full w-full"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap"
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
                  weight: 2,
                }}
              >
                <Popup className="premium-popup">
                  <div className="text-center p-2">
                    <h4 className="font-extrabold text-slate-900 text-lg mb-1">{p.zone}</h4>
                    <p className={`text-2xl font-black ${getRiskTextClass(p.probability)}`}>{p.probability}%</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Risque {p.riskLevel}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
          {predictions.map((p) => (
            <div
              key={p.zone}
              className="group relative p-4 rounded-[1.25rem] border border-slate-200/80 bg-white/95 backdrop-blur-sm hover:border-slate-300 hover:shadow-[0_18px_45px_-30px_rgba(15,23,42,0.5)] transition-all"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-black text-slate-900 tracking-tight">{p.zone}</h3>
                    <span
                      className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        p.color === 'rose'
                          ? 'bg-rose-50 text-rose-600 border border-rose-100'
                          : p.color === 'amber'
                            ? 'bg-amber-50 text-amber-600 border border-amber-100'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      }`}
                    >
                      {p.riskLevel}
                    </span>
                    {p.trend === 'UP' && <TrendingUp className="h-4 w-4 text-rose-500" />}
                    {p.trend === 'DOWN' && <TrendingDown className="h-4 w-4 text-emerald-500" />}
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-black ${getRiskTextClass(p.probability)}`}>{p.probability}%</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Probabilite</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <div className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2">
                    <p className="text-[8px] font-black uppercase text-slate-500 tracking-tighter flex items-center gap-1">
                      <Cloud className="h-2 w-2" /> Meteo
                    </p>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-400 to-violet-500"
                        style={{ width: `${p.factors?.weather?.impact || 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2">
                    <p className="text-[8px] font-black uppercase text-slate-500 tracking-tighter flex items-center gap-1">
                      <AlertTriangle className="h-2 w-2" /> Historique
                    </p>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sky-400 to-sky-500"
                        style={{ width: `${p.factors?.incidents?.impact || 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2">
                    <p className="text-[8px] font-black uppercase text-slate-500 tracking-tighter flex items-center gap-1">
                      <Zap className="h-2 w-2" /> Charge
                    </p>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-amber-500"
                        style={{ width: `${p.factors?.criticality?.impact || 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
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
