import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { InterventionRecord } from '@/types/auth.types'
import { MapPin, User, Clock, CheckCircle2, Navigation } from 'lucide-react'
import { getSocket } from '@/services/socketService'

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

const createTechnicianIcon = () => {
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div class="technician-marker-pulse"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

// Helper to auto-fit bounds when interventions change
function ChangeView({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap()
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [bounds, map])
  return null
}

export function MapInterventionsView({ interventions }: MapInterventionsViewProps) {
  const [liveTechnicians, setLiveTechnicians] = useState<Record<number, { latitude: number, longitude: number, nom: string }>>({})

  useEffect(() => {
    const socket = getSocket()
    
    socket.on('technician_location_broadcast', (data: { technicienId: number, latitude: number, longitude: number, nom: string }) => {
      console.log('📍 Live location update received:', data)
      setLiveTechnicians(prev => ({
        ...prev,
        [data.technicienId]: {
          latitude: data.latitude,
          longitude: data.longitude,
          nom: data.nom
        }
      }))
    })

    return () => {
      socket.off('technician_location_broadcast')
    }
  }, [])

  // Filter interventions with valid coordinates
  const markers = interventions.filter(i => i.latitude !== null && i.longitude !== null)
  
  const bounds = markers.length > 0 
    ? L.latLngBounds(markers.map(m => [m.latitude!, m.longitude!])) 
    : null

  const center: L.LatLngExpression = markers.length > 0 
    ? [markers[0].latitude!, markers[0].longitude!] 
    : [36.8065, 10.1815] // Default to Tunis, Tunisia

  return (
    <div className="dashboard-card !p-2 animate-in fade-in zoom-in-95 duration-500 overflow-hidden dark:bg-slate-900/40 dark:border-slate-800">
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
                   <h4 className="font-extrabold text-slate-900 dark:text-white mb-2 border-b border-slate-100 dark:border-slate-800 pb-2">{intervention.titre}</h4>
                   
                   <div className="space-y-2 mt-3">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                         <MapPin className="h-3 w-3" />
                         <span className="truncate">{intervention.adresse}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                         <User className="h-3 w-3" />
                         <span>{(intervention.client.prenom + ' ' + intervention.client.nom) || 'Client Inconnu'}</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-bold mt-2">
                         {intervention.statut === 'EN_ATTENTE' && <Clock className="h-3 w-3 text-amber-500" />}
                         {intervention.statut === 'EN_COURS' && <div className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />}
                         {intervention.statut === 'TERMINEE' && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                         <span className={
                           intervention.statut === 'EN_ATTENTE' ? 'text-amber-600 dark:text-amber-400' : 
                           intervention.statut === 'EN_COURS' ? 'text-sky-600 dark:text-sky-400' : 
                           'text-emerald-600 dark:text-emerald-400'
                         }>
                           {intervention.statut.replace('_', ' ')}
                         </span>
                      </div>
                   </div>

                   {intervention.technicien && (
                     <div className="mt-4 pt-2 border-t border-slate-50 dark:border-slate-800">
                        <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Assigné à</p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{intervention.technicien.utilisateur.prenom} {intervention.technicien.utilisateur.nom}</p>
                     </div>
                   )}
                </div>
              </Popup>
            </Marker>
          ))}

          {Object.entries(liveTechnicians).map(([id, tech]) => (
            <Marker 
              key={`tech-${id}`} 
              position={[tech.latitude, tech.longitude]}
              icon={createTechnicianIcon()}
            >
              <Popup className="premium-popup">
                <div className="p-1 min-w-[150px]">
                   <div className="flex items-center gap-2 mb-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                      <Navigation className="h-3.5 w-3.5 text-sky-500 fill-sky-500" />
                      <h4 className="font-extrabold text-slate-900 dark:text-white">En direct : {tech.nom}</h4>
                   </div>
                   <p className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest animate-pulse">Position live • Technicien</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      
      <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
         <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
               <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
               <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Attente</span>
            </div>
            <div className="flex items-center gap-1.5">
               <div className="w-2.5 h-2.5 rounded-full bg-sky-500"></div>
               <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">En cours</span>
            </div>
            <div className="flex items-center gap-1.5">
               <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
               <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Terminé</span>
            </div>
            <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-800 pl-4 ml-2">
               <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
               <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight italic">Technicien Live</span>
            </div>
         </div>
         <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            {markers.length} Intervention{markers.length > 1 ? 's' : ''} localisée{markers.length > 1 ? 's' : ''}
         </p>
      </div>
    </div>
  )
}
