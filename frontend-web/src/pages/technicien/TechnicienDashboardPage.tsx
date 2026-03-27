import { Wrench } from 'lucide-react'
import { RoleWorkspacePage } from '@/components/dashboard/RoleWorkspacePage'

export const TechnicienDashboardPage = () => (
  <RoleWorkspacePage
    badge='Interface Technicien'
    title='Execution terrain et suivi des interventions FTTH'
    description='Page prevue pour consulter la feuille de route, gerer les visites et transmettre les comptes rendus d intervention.'
    heroIcon={Wrench}
    accent={{
      tint: 'from-emerald-500/12 to-white/0',
      soft: 'border-emerald-300/15 bg-emerald-300/8',
      panel:
        'border-emerald-300/15 bg-[linear-gradient(135deg,rgba(16,185,129,0.08),rgba(255,255,255,0.02))]',
      text: 'text-emerald-200',
    }}
    highlights={[
      { label: 'Interventions du jour', value: '6', change: '3 deja traitees' },
      { label: 'Zone active', value: 'Secteur Nord', change: 'Itineraire optimise' },
      { label: 'Urgences', value: '2', change: '1 client prioritaire' },
    ]}
    actions={[
      {
        label: 'Consulter la tournee',
        hint: 'Afficher la liste des interventions avec horaires, adresses et priorites.',
      },
      {
        label: 'Mettre a jour le statut',
        hint: 'Passer une mission en route, sur site, terminee ou a replanifier.',
      },
      {
        label: 'Envoyer le compte rendu',
        hint: 'Ajouter photos, signature client et conclusion de l intervention.',
      },
    ]}
    features={[
      {
        title: 'Carte et geolocalisation',
        description: 'Preparation de la navigation et de la lecture des interventions par zone.',
      },
      {
        title: 'Diagnostic terrain',
        description: 'Acces aux details du ticket, materiel necessaire et historique du site.',
      },
      {
        title: 'Cloture mobile',
        description: 'Capture de preuve, signature numerique et synchronisation avec le backend.',
      },
    ]}
    timeline={[
      {
        step: '1. Lire la fiche mission',
        detail: 'Verifier les informations client, l adresse et la nature du probleme.',
      },
      {
        step: '2. Intervenir sur site',
        detail: 'Mettre a jour le statut en direct pour informer le responsable et le client.',
      },
      {
        step: '3. Finaliser la visite',
        detail: 'Envoyer le compte rendu complet avec les elements de validation terrain.',
      },
    ]}
    queueTitle='Tournee du jour'
    queue={[
      {
        title: '08:30 - Client Benali',
        meta: 'Installation ONT et verification signal au quartier Palmier.',
        status: 'Termine',
      },
      {
        title: '11:00 - Client Atlas Com',
        meta: 'Diagnostic perte de debit et controle PTO en salle technique.',
        status: 'En cours',
      },
      {
        title: '14:15 - Client Meryem T.',
        meta: 'Reprise soudure fibre et validation signature en fin de visite.',
        status: 'A venir',
      },
    ]}
    focusTitle='Infos terrain'
    focus={[
      { label: 'Vehicule', value: 'FT-07' },
      { label: 'Materiel embarque', value: 'OK - 92%' },
      { label: 'Derniere synchro', value: '11:18' },
      { label: 'Temps estime restant', value: '3h 20' },
    ]}
    activityTitle='Journal mission'
    activity={[
      {
        time: '08:52',
        title: 'Debut intervention',
        detail: 'Presence sur site confirmee avec statut mis a jour dans la feuille de route.',
      },
      {
        time: '10:21',
        title: 'Photo technique ajoutee',
        detail: 'Capture de la PTO et du niveau optique pour le dossier Atlas Com.',
      },
      {
        time: '11:34',
        title: 'Client informe',
        detail: 'Notification envoyee apres estimation de fin d intervention revisee.',
      },
    ]}
  />
)
