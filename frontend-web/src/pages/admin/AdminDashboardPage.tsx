import { ShieldCheck } from 'lucide-react'
import { RoleWorkspacePage } from '@/components/dashboard/RoleWorkspacePage'

export const AdminDashboardPage = () => (
  <RoleWorkspacePage
    badge='Console Administrateur'
    title='Pilotage global de la plateforme FTTH'
    description='Espace prevu pour administrer les utilisateurs, la configuration generale et la supervision transverse du systeme.'
    heroIcon={ShieldCheck}
    accent={{
      tint: 'from-violet-500/12 to-white/0',
      soft: 'border-violet-300/15 bg-violet-300/8',
      panel:
        'border-violet-300/15 bg-[linear-gradient(135deg,rgba(167,139,250,0.08),rgba(255,255,255,0.02))]',
      text: 'text-violet-200',
    }}
    highlights={[
      { label: 'Utilisateurs', value: '128', change: '+12 ce mois' },
      { label: 'Roles actifs', value: '4', change: '100% provisionnes' },
      { label: 'Services suivis', value: '12', change: '2 alertes mineures' },
    ]}
    actions={[
      {
        label: 'Gerer les comptes',
        hint: 'Creer, suspendre ou reactiver les acces selon le role metier.',
      },
      {
        label: 'Verifier la sante plateforme',
        hint: 'Suivre les modules critiques et les integrations backend.',
      },
      {
        label: 'Superviser les droits',
        hint: 'Controler les profils, permissions et traces d administration.',
      },
    ]}
    features={[
      {
        title: 'Gestion des utilisateurs',
        description: 'Vue centrale pour les comptes admin, responsables, techniciens et clients.',
      },
      {
        title: 'Parametrage des referentiels',
        description: 'Zones, equipes, types d intervention et regles d escalade.',
      },
      {
        title: 'Audit et conformite',
        description: 'Historique des connexions, modifications sensibles et journaux systeme.',
      },
    ]}
    timeline={[
      {
        step: '1. Verifier les alertes',
        detail: 'Commencer par les erreurs critiques et les comptes en attente.',
      },
      {
        step: '2. Ajuster la configuration',
        detail: 'Mettre a jour les profils, workflows ou parametres globaux si necessaire.',
      },
      {
        step: '3. Suivre la stabilite',
        detail: 'Confirmer que les modules de monitoring et de ticketing restent operationnels.',
      },
    ]}
    queueTitle='Elements a surveiller'
    queue={[
      {
        title: 'Provisioning nouveaux comptes',
        meta: '8 utilisateurs attendent validation de role et attribution de zone.',
        status: 'En attente',
      },
      {
        title: 'Revision des permissions',
        meta: 'Le groupe technicien mobile doit recevoir le droit de cloture terrain.',
        status: 'Priorite',
      },
      {
        title: 'Journal des acces',
        meta: 'Deux connexions inhabituelles detectees hors plage horaire standard.',
        status: 'Analyse',
      },
    ]}
    focusTitle='Focus admin'
    focus={[
      { label: 'Dernier import utilisateurs', value: 'Aujourd hui 08:45' },
      { label: 'Version portail', value: 'Prototype v0.3' },
      { label: 'Zone la plus active', value: 'Casablanca Nord' },
      { label: 'Sauvegarde logique', value: 'OK - 02:00' },
    ]}
    activityTitle='Activite recente'
    activity={[
      {
        time: '09:12',
        title: 'Creation de compte responsable',
        detail: 'Nouveau profil affecte a la supervision de la zone Rabat Centre.',
      },
      {
        time: '10:04',
        title: 'Alerte de permission resolue',
        detail: 'Le module de reset mot de passe a retrouve son comportement attendu.',
      },
      {
        time: '11:26',
        title: 'Controle journal systeme',
        detail: 'Aucune erreur bloquante sur les services critiques depuis 24 heures.',
      },
    ]}
  />
)
