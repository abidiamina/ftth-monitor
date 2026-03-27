import { UsersRound } from 'lucide-react'
import { RoleWorkspacePage } from '@/components/dashboard/RoleWorkspacePage'

export const ResponsableDashboardPage = () => (
  <RoleWorkspacePage
    badge='Espace Responsable'
    title='Coordination des tickets et des equipes terrain'
    description='Ecran prevu pour prioriser les demandes, affecter les techniciens et suivre les engagements de service.'
    heroIcon={UsersRound}
    accent={{
      tint: 'from-blue-500/12 to-white/0',
      soft: 'border-blue-300/15 bg-blue-300/8',
      panel:
        'border-blue-300/15 bg-[linear-gradient(135deg,rgba(96,165,250,0.08),rgba(255,255,255,0.02))]',
      text: 'text-blue-200',
    }}
    highlights={[
      { label: 'Tickets ouverts', value: '34', change: '7 nouveaux ce matin' },
      { label: 'Techniciens dispo', value: '11', change: '2 en reserve' },
      { label: 'SLA critiques', value: '3', change: 'A traiter avant 14:00' },
    ]}
    actions={[
      {
        label: 'Prioriser les incidents',
        hint: 'Classer les interventions selon urgence, client et impact reseau.',
      },
      {
        label: 'Affecter les techniciens',
        hint: 'Distribuer la charge selon la zone et la disponibilite terrain.',
      },
      {
        label: 'Suivre les delais',
        hint: 'Surveiller les tickets proches de depasser les objectifs de traitement.',
      },
    ]}
    features={[
      {
        title: 'Vue kanban des demandes',
        description: 'Lecture rapide des tickets en attente, en cours, bloques ou clotures.',
      },
      {
        title: 'Charge equipe',
        description: 'Disponibilite des techniciens, repartition et suivi des interventions.',
      },
      {
        title: 'Tableau SLA',
        description: 'Synthese des echeances et du niveau de service par zone ou type de demande.',
      },
    ]}
    timeline={[
      {
        step: '1. Trier le backlog',
        detail: 'Identifier les demandes prioritaires et les incidents recurrents.',
      },
      {
        step: '2. Affecter les ressources',
        detail: 'Envoyer chaque intervention au bon technicien avec le bon contexte.',
      },
      {
        step: '3. Clore avec controle',
        detail: 'Verifier le retour terrain, la satisfaction client et la qualite du compte rendu.',
      },
    ]}
    queueTitle='Interventions prioritaires'
    queue={[
      {
        title: 'Ticket INC-241',
        meta: 'Perte de signal sur armoire FTTH secteur Hay Salam, 14 clients touches.',
        status: 'Urgent',
      },
      {
        title: 'Ticket INS-118',
        meta: 'Nouvelle installation entreprise a planifier avant vendredi.',
        status: 'Planif',
      },
      {
        title: 'Ticket SAV-087',
        meta: 'Reprise dossier client apres intervention incomplete la veille.',
        status: 'Suivi',
      },
    ]}
    focusTitle='Capteurs de pilotage'
    focus={[
      { label: 'Equipe la plus chargee', value: 'Equipe B - 6 missions' },
      { label: 'Retard moyen', value: '18 min' },
      { label: 'Clotures du jour', value: '12 interventions' },
      { label: 'Satisfaction estimee', value: '4.6 / 5' },
    ]}
    activityTitle='Flux de coordination'
    activity={[
      {
        time: '08:40',
        title: 'Affectation envoyee',
        detail: 'Mission INC-241 transmise a Karim avec note de priorite haute.',
      },
      {
        time: '09:55',
        title: 'Escalade client VIP',
        detail: 'Le dossier INS-118 passe en suivi direct avec delai contractuel renforce.',
      },
      {
        time: '11:10',
        title: 'Compte rendu valide',
        detail: 'Une intervention fibre a ete cloturee avec signature client complete.',
      },
    ]}
  />
)
