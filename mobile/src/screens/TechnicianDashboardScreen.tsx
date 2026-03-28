import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { RoleBadge } from '../components/RoleBadge'
import { Screen } from '../components/Screen'
import { useAuth } from '../context/AuthContext'
import { listInterventions, updateIntervention } from '../services/interventionApi'
import { listNotifications, markNotificationAsRead } from '../services/notificationApi'
import { colors } from '../theme/colors'
import type {
  InterventionPriority,
  InterventionRecord,
  InterventionStatus,
  NotificationRecord,
} from '../types/intervention'

const statusLabels: Record<InterventionStatus, string> = {
  EN_ATTENTE: 'En attente',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminee',
  ANNULEE: 'Annulee',
}

const priorityLabels: Record<InterventionPriority, string> = {
  BASSE: 'Basse',
  NORMALE: 'Normale',
  HAUTE: 'Haute',
  URGENTE: 'Urgente',
}

const formatDate = (value?: string | null) => {
  if (!value) return 'Non renseignee'

  return new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function TechnicianDashboardScreen() {
  const { user, logout, refreshCurrentUser } = useAuth()
  const [interventions, setInterventions] = useState<InterventionRecord[]>([])
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [processingId, setProcessingId] = useState<number | null>(null)

  const loadData = async (silent = false) => {
    if (!silent) {
      setLoading(true)
    }

    try {
      await refreshCurrentUser()
      const [interventionData, notificationData] = await Promise.all([
        listInterventions(),
        listNotifications(),
      ])
      setInterventions(interventionData)
      setNotifications(notificationData)
    } catch (error: any) {
      Alert.alert(
        'Chargement impossible',
        error?.response?.data?.message ?? 'Impossible de recuperer les interventions assignees.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const stats = useMemo(() => {
    const total = interventions.length
    const enAttente = interventions.filter((item) => item.statut === 'EN_ATTENTE').length
    const enCours = interventions.filter((item) => item.statut === 'EN_COURS').length
    const unread = notifications.filter((item) => !item.lu).length

    return { total, enAttente, enCours, unread }
  }, [interventions, notifications])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData(true)
  }

  const handleAction = async (
    intervention: InterventionRecord,
    payload: { statut?: InterventionStatus; technicienId?: null }
  ) => {
    setProcessingId(intervention.id)

    try {
      const response = await updateIntervention(intervention.id, payload)
      setInterventions((current) => current.map((item) => (item.id === intervention.id ? response.data : item)))
      Alert.alert('Intervention mise a jour', response.message)
      await loadData(true)
    } catch (error: any) {
      Alert.alert(
        'Action impossible',
        error?.response?.data?.message ?? 'La mise a jour n a pas pu etre appliquee.'
      )
    } finally {
      setProcessingId(null)
    }
  }

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markNotificationAsRead(notificationId)
      setNotifications((current) =>
        current.map((item) => (item.id === notificationId ? { ...item, lu: true } : item))
      )
    } catch (error: any) {
      Alert.alert(
        'Mise a jour impossible',
        error?.response?.data?.message ?? 'Impossible de marquer cette notification comme lue.'
      )
    }
  }

  if (!user) {
    return null
  }

  return (
    <Screen
      scrollable
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Sprint 1 et 2 mobile</Text>
        <Text style={styles.title}>Pilotage terrain technicien</Text>
        <Text style={styles.subtitle}>
          Consultez vos interventions assignees, passez les statuts terrain et suivez les
          notifications metier depuis le mobile.
        </Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.profileTop}>
          <RoleBadge role={user.role} />
          <Pressable style={styles.outlineButton} onPress={() => void logout()}>
            <Text style={styles.outlineButtonText}>Se deconnecter</Text>
          </Pressable>
        </View>
        <Text style={styles.cardTitle}>
          {user.prenom} {user.nom}
        </Text>
        <Text style={styles.detail}>{user.email}</Text>
        <Text style={styles.detail}>{user.telephone ?? 'Telephone non renseigne'}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Mes tickets</Text>
          <Text style={styles.statValue}>{stats.total}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>En attente</Text>
          <Text style={styles.statValue}>{stats.enAttente}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>En cours</Text>
          <Text style={styles.statValue}>{stats.enCours}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Alertes</Text>
          <Text style={styles.statValue}>{stats.unread}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Mes interventions assignees</Text>
        <Text style={styles.sectionDescription}>
          Les actions respectent les regles backend: demarrer, terminer ou remettre en attente une
          mission refusee.
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : interventions.length === 0 ? (
          <Text style={styles.emptyText}>Aucune intervention affectee pour le moment.</Text>
        ) : (
          interventions.map((item) => {
            const isBusy = processingId === item.id

            return (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{item.titre}</Text>
                  <Text style={styles.badge}>{statusLabels[item.statut]}</Text>
                </View>
                <Text style={styles.itemDetail}>
                  Priorite: {priorityLabels[item.priorite]}
                </Text>
                <Text style={styles.itemDetail}>
                  Client: {item.client.prenom} {item.client.nom}
                </Text>
                <Text style={styles.itemDetail}>Telephone: {item.client.telephone}</Text>
                <Text style={styles.itemDetail}>Adresse: {item.adresse}</Text>
                <Text style={styles.itemDetail}>Planifiee: {formatDate(item.datePlanifiee)}</Text>
                <Text style={styles.itemDetail}>Debut: {formatDate(item.dateDebut)}</Text>
                <Text style={styles.itemDetail}>Fin: {formatDate(item.dateFin)}</Text>
                <Text style={styles.itemDescription}>{item.description}</Text>

                <View style={styles.actionsRow}>
                  {item.statut === 'EN_ATTENTE' ? (
                    <>
                      <Pressable
                        style={[
                          styles.actionButton,
                          styles.startButton,
                          isBusy ? styles.buttonDisabled : null,
                        ]}
                        onPress={() => void handleAction(item, { statut: 'EN_COURS' })}
                        disabled={isBusy}
                      >
                        <Text style={styles.actionButtonText}>Demarrer</Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.actionButton,
                          styles.rejectButton,
                          isBusy ? styles.buttonDisabled : null,
                        ]}
                        onPress={() =>
                          void handleAction(item, { statut: 'EN_ATTENTE', technicienId: null })
                        }
                        disabled={isBusy}
                      >
                        <Text style={styles.actionButtonText}>Refuser</Text>
                      </Pressable>
                    </>
                  ) : null}

                  {item.statut === 'EN_COURS' ? (
                    <Pressable
                      style={[
                        styles.actionButton,
                        styles.completeButton,
                        isBusy ? styles.buttonDisabled : null,
                      ]}
                      onPress={() => void handleAction(item, { statut: 'TERMINEE' })}
                      disabled={isBusy}
                    >
                      <Text style={styles.actionButtonText}>Marquer terminee</Text>
                    </Pressable>
                  ) : null}

                  {isBusy ? <ActivityIndicator color={colors.primary} /> : null}
                </View>
              </View>
            )
          })
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <Text style={styles.sectionDescription}>
          Chaque affectation, changement de priorite ou mise a jour de statut remonte ici.
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : notifications.length === 0 ? (
          <Text style={styles.emptyText}>Aucune notification.</Text>
        ) : (
          notifications.map((item) => (
            <View key={item.id} style={[styles.itemCard, !item.lu ? styles.unreadCard : null]}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>{item.titre}</Text>
                <Text style={[styles.badge, item.lu ? styles.readBadge : styles.unreadBadge]}>
                  {item.lu ? 'Lue' : 'Nouvelle'}
                </Text>
              </View>
              <Text style={styles.itemDescription}>{item.message}</Text>
              <Text style={styles.itemMeta}>{formatDate(item.createdAt)}</Text>
              {!item.lu ? (
                <Pressable
                  style={styles.inlineButton}
                  onPress={() => void handleMarkAsRead(item.id)}
                >
                  <Text style={styles.inlineButtonText}>Marquer comme lue</Text>
                </Pressable>
              ) : null}
            </View>
          ))
        )}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: {
    gap: 10,
    marginTop: 12,
    marginBottom: 18,
  },
  eyebrow: {
    color: colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 20,
    gap: 10,
    marginBottom: 16,
  },
  profileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 20,
    gap: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 22,
    lineHeight: 28,
    color: colors.text,
    fontWeight: '800',
  },
  detail: {
    color: colors.muted,
    lineHeight: 21,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flexGrow: 1,
    minWidth: '47%',
    backgroundColor: colors.primarySoft,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    color: colors.primary,
    fontWeight: '700',
    marginBottom: 8,
  },
  statValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  sectionDescription: {
    color: colors.muted,
    lineHeight: 22,
  },
  emptyText: {
    color: colors.muted,
    lineHeight: 22,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fbfcfe',
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  unreadCard: {
    borderColor: '#92d0ca',
    backgroundColor: '#f3fbfa',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  itemTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  badge: {
    color: colors.primary,
    fontWeight: '700',
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  readBadge: {
    backgroundColor: '#eef3f7',
    color: colors.muted,
  },
  unreadBadge: {
    backgroundColor: colors.primarySoft,
    color: colors.primary,
  },
  itemDetail: {
    color: colors.muted,
    lineHeight: 21,
  },
  itemDescription: {
    color: colors.text,
    lineHeight: 22,
  },
  itemMeta: {
    color: colors.muted,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
    alignItems: 'center',
  },
  actionButton: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  startButton: {
    backgroundColor: colors.primary,
  },
  completeButton: {
    backgroundColor: '#1d4ed8',
  },
  rejectButton: {
    backgroundColor: '#b42318',
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  outlineButtonText: {
    color: colors.text,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  inlineButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  inlineButtonText: {
    color: colors.primary,
    fontWeight: '700',
  },
})
