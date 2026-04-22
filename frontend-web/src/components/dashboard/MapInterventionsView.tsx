import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { InterventionRecord } from '@/types/auth.types'
import { MapPin, User, Clock, CheckCircle2 } from 'lucide-react'

// Fix for default marker icons in Leaflet + React
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

type MapInterventionsViewProps = {
  interventions: InterventionRecord[]
}

// Function to create custom DivIcons for better aesthetics
const createCustomIcon = (statut: string) => {
  const colorClass = 
    statut === 'EN_ATTENTE' ? 'marker-pending' : 
    statut === 'EN_COURS' ? 'marker-working' : 
    'marker-done'
    
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div class="leaflet-marker-pill ${colorClass}"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

// Helper to auto-fit bounds when interventions change
function ChangeView({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap()
  if (bounds) {
    map.fitBounds(bounds, { padding: [50, 50] })
  }
  return null
}

export function MapInterventionsView({ interventions }: MapInterventionsViewProps) {
  // Filter interventions with valid coordinates
  const markers = interventions.filter(i => i.latitude !== null && i.longitude !== null)
  
  const bounds = markers.length > 0 
    ? L.latLngBounds(markers.map(m => [m.latitude!, m.longitude!])) 
    : null

  const center: L.LatLngExpression = markers.length > 0 
    ? [markers[0].latitude!, markers[0].longitude!] 
    : [36.8065, 10.1815] // Default to Tunis, Tunisia

  return (
    <div className="dashboard-card !p-2 animate-in fade-in zoom-in-95 duration-500 overflow-hidden">
      <div className="h-[500px] w-full rounded-[1.5rem] overflow-hidden">
        <MapContainer 
          center={center} 
          zoom={13} 
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <ChangeView bounds={bounds} />

          {markers.map((intervention) => (
            <Marker 
              key={intervention.id} 
              position={[intervention.latitude!, intervention.longitude!]}
              icon={createCustomIcon(intervention.statut)}
            >
              <Popup className="premium-popup">
                <div className="p-1 min-w-[200px]">
                   <h4 className="font-extrabold text-slate-900 mb-2 border-b border-slate-100 pb-2">{intervention.titre}</h4>
                   
                   <div className="space-y-2 mt-3">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                         <MapPin className="h-3 w-3" />
                         <span className="truncate">{intervention.adresse}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                         <User className="h-3 w-3" />
                         <span>{(intervention.client.prenom + ' ' + intervention.client.nom) || 'Client Inconnu'}</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-bold mt-2">
                         {intervention.statut === 'EN_ATTENTE' && <Clock className="h-3 w-3 text-amber-500" />}
                         {intervention.statut === 'EN_COURS' && <div className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />}
                         {intervention.statut === 'TERMINEE' && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                         <span className={
                           intervention.statut === 'EN_ATTENTE' ? 'text-amber-600' : 
                           intervention.statut === 'EN_COURS' ? 'text-sky-600' : 
                           'text-emerald-600'
                         }>
                           {intervention.statut.replace('_', ' ')}
                         </span>
                      </div>
                   </div>

                   {intervention.technicien && (
                     <div className="mt-4 pt-2 border-t border-slate-50">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Assigné à</p>
                        <p className="text-xs font-bold text-slate-700">{intervention.technicien.utilisateur.prenom} {intervention.technicien.utilisateur.nom}</p>
                     </div>
                   )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      
      <div className="p-4 bg-slate-50/50 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
               <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Attente</span>
            </div>
            <div className="flex items-center gap-1.5">
               <div className="w-2.5 h-2.5 rounded-full bg-sky-500"></div>
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">En cours</span>
            </div>
            <div className="flex items-center gap-1.5">
               <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Terminé</span>
            </div>
         </div>
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {markers.length} Intervention{markers.length > 1 ? 's' : ''} localisée{markers.length > 1 ? 's' : ''}
         </p>
      </div>
    </div>
  )
}
