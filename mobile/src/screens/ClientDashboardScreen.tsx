import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { RoleBadge } from '../components/RoleBadge'
import { Screen } from '../components/Screen'
import { useAuth } from '../context/AuthContext'
import {
  createIntervention,
  listInterventions,
  submitInterventionClientApproval,
} from '../services/interventionApi'
import { listNotifications, markNotificationAsRead } from '../services/notificationApi'
import { colors } from '../theme/colors'
import type {
  CreateInterventionRequest,
  InterventionPriority,
  InterventionRecord,
  NotificationRecord,
} from '../types/intervention'

const priorities: InterventionPriority[] = ['BASSE', 'NORMALE', 'HAUTE', 'URGENTE']

const priorityLabels: Record<InterventionPriority, string> = {
  BASSE: 'Basse',
  NORMALE: 'Normale',
  HAUTE: 'Haute',
  URGENTE: 'Urgente',
}

const statusLabels = {
  EN_ATTENTE: 'En attente',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminee',
  ANNULEE: 'Annulee',
} as const

const emptyForm: CreateInterventionRequest = {
  titre: '',
  description: '',
  adresse: '',
  priorite: 'NORMALE',
}

const formatDate = (value?: string | null) => {
  if (!value) return 'Non planifiee'

  return new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function ClientDashboardScreen() {
  const { user, logout, refreshCurrentUser } = useAuth()
  const [interventions, setInterventions] = useState<InterventionRecord[]>([])
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [approvalSubmitting, setApprovalSubmitting] = useState(false)
  const [form, setForm] = useState<CreateInterventionRequest>(emptyForm)
  const [selectedInterventionId, setSelectedInterventionId] = useState<number | null>(null)
  const [signatureText, setSignatureText] = useState('')
  const [feedbackComment, setFeedbackComment] = useState('')
  const [feedbackRating, setFeedbackRating] = useState(5)

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
      if (!selectedInterventionId) {
        setSelectedInterventionId(interventionData.find((item) => item.statut === 'TERMINEE')?.id ?? interventionData[0]?.id ?? null)
      }
    } catch (error: any) {
      Alert.alert(
        'Chargement impossible',
        error?.response?.data?.message ?? 'Impossible de recuperer vos informations.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const selectedIntervention =
    interventions.find((item) => item.id === selectedInterventionId) ??
    interventions.find((item) => item.statut === 'TERMINEE') ??
    null

  const stats = useMemo(() => {
    const total = interventions.length
    const enCours = interventions.filter((item) => item.statut === 'EN_COURS').length
    const terminees = interventions.filter((item) => item.statut === 'TERMINEE').length
    const unread = notifications.filter((item) => !item.lu).length
    return { total, enCours, terminees, unread }
  }, [interventions, notifications])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData(true)
  }

  const handleCreate = async () => {
    if (!form.titre?.trim() || !form.description?.trim() || !form.adresse?.trim()) {
      Alert.alert('Champs requis', 'Merci de renseigner le titre, la description et l adresse.')
      return
    }

    setSubmitting(true)

    try {
      const response = await createIntervention({
        titre: form.titre.trim(),
        description: form.description.trim(),
        adresse: form.adresse.trim(),
        priorite: form.priorite ?? 'NORMALE',
      })

      Alert.alert('Demande enregistree', response.message)
      setForm(emptyForm)
      await loadData(true)
    } catch (error: any) {
      Alert.alert(
        'Creation impossible',
        error?.response?.data?.message ?? 'La demande n a pas pu etre enregistree.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitApproval = async () => {
    if (!selectedIntervention) {
      return
    }

    setApprovalSubmitting(true)

    try {
      const response = await submitInterventionClientApproval(selectedIntervention.id, {
        signature: signatureText,
        signatureBy: `${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim() || 'Client',
        feedbackRating,
        feedbackComment,
      })
      Alert.alert('Validation client', response.message)
      setSignatureText('')
      setFeedbackComment('')
      setFeedbackRating(5)
      await loadData(true)
    } catch (error: any) {
      Alert.alert(
        'Validation impossible',
        error?.response?.data?.message ?? 'La validation client a echoue.'
      )
    } finally {
      setApprovalSubmitting(false)
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} />}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Portail client</Text>
        <Text style={styles.title}>Interventions FTTH</Text>
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
        <Text style={styles.detail}>{user.client?.adresse ?? 'Adresse non renseignee'}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Demandes</Text>
          <Text style={styles.statValue}>{stats.total}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>En cours</Text>
          <Text style={styles.statValue}>{stats.enCours}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Terminees</Text>
          <Text style={styles.statValue}>{stats.terminees}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Alertes</Text>
          <Text style={styles.statValue}>{stats.unread}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Nouvelle demande</Text>
        <TextInput
          value={form.titre}
          onChangeText={(value) => setForm((current) => ({ ...current, titre: value }))}
          placeholder='Titre'
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <TextInput
          value={form.description}
          onChangeText={(value) => setForm((current) => ({ ...current, description: value }))}
          placeholder='Description'
          placeholderTextColor={colors.muted}
          multiline
          textAlignVertical='top'
          style={[styles.input, styles.textarea]}
        />
        <TextInput
          value={form.adresse}
          onChangeText={(value) => setForm((current) => ({ ...current, adresse: value }))}
          placeholder='Adresse'
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <View style={styles.chipsRow}>
          {priorities.map((priority) => {
            const isActive = (form.priorite ?? 'NORMALE') === priority
            return (
              <Pressable
                key={priority}
                style={[styles.chip, isActive ? styles.chipActive : null]}
                onPress={() => setForm((current) => ({ ...current, priorite: priority }))}
              >
                <Text style={[styles.chipText, isActive ? styles.chipTextActive : null]}>
                  {priorityLabels[priority]}
                </Text>
              </Pressable>
            )
          })}
        </View>
        <Pressable
          style={[styles.primaryButton, submitting ? styles.buttonDisabled : null]}
          onPress={() => void handleCreate()}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color='#ffffff' /> : <Text style={styles.primaryButtonText}>Envoyer</Text>}
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Mes interventions</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : interventions.length === 0 ? (
          <Text style={styles.emptyText}>Aucune intervention pour le moment.</Text>
        ) : (
          interventions.map((item) => (
            <Pressable key={item.id} onPress={() => setSelectedInterventionId(item.id)} style={[styles.itemCard, selectedIntervention?.id === item.id ? styles.selectedCard : null]}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>{item.titre}</Text>
                <Text style={styles.badge}>{statusLabels[item.statut]}</Text>
              </View>
              <Text style={styles.itemDetail}>Priorite: {priorityLabels[item.priorite]}</Text>
              <Text style={styles.itemDetail}>Adresse: {item.adresse}</Text>
              <Text style={styles.itemMeta}>Creation: {formatDate(item.dateCreation)}</Text>
            </Pressable>
          ))
        )}
      </View>

      {selectedIntervention ? (
        <>
          <View style={styles.card}>
            <Text style={styles.sectionEyebrow}>Validation</Text>
            <Text style={styles.sectionTitle}>Signature client</Text>
            <Text style={styles.itemDetail}>Derniere signature: {formatDate(selectedIntervention.clientSignatureAt)}</Text>
            <TextInput
              value={signatureText}
              onChangeText={setSignatureText}
              placeholder='Signature numerique (nom complet)'
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionEyebrow}>Qualite</Text>
            <Text style={styles.sectionTitle}>Evaluation</Text>
            <View style={styles.chipsRow}>
              {[1, 2, 3, 4, 5].map((value) => {
                const active = value <= feedbackRating
                return (
                  <Pressable
                    key={value}
                    style={[styles.chip, active ? styles.chipActive : null]}
                    onPress={() => setFeedbackRating(value)}
                  >
                    <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{value}</Text>
                  </Pressable>
                )
              })}
            </View>
            <TextInput
              value={feedbackComment}
              onChangeText={setFeedbackComment}
              placeholder='Votre commentaire'
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical='top'
              style={[styles.input, styles.textarea]}
            />
            <Pressable
              style={[styles.primaryButton, approvalSubmitting ? styles.buttonDisabled : null]}
              onPress={() => void handleSubmitApproval()}
              disabled={approvalSubmitting}
            >
              {approvalSubmitting ? <ActivityIndicator color='#ffffff' /> : <Text style={styles.primaryButtonText}>Valider</Text>}
            </Pressable>
            <View style={styles.subCard}>
              <Text style={styles.itemDetail}>Note: {selectedIntervention.clientFeedbackRating ?? '-'}/5</Text>
              <Text style={styles.itemDetail}>Commentaire: {selectedIntervention.clientFeedbackComment ?? 'Aucun'}</Text>
            </View>
          </View>
        </>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Notifications</Text>
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
              {!item.lu ? (
                <Pressable style={styles.inlineButton} onPress={() => void handleMarkAsRead(item.id)}>
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
  header: { gap: 8, marginTop: 8, marginBottom: 14 },
  eyebrow: { color: colors.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: '800' },
  profileCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 18, gap: 8, marginBottom: 14 },
  profileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 18, gap: 10, marginBottom: 14 },
  subCard: { borderWidth: 1, borderColor: colors.border, backgroundColor: '#fbfcfe', borderRadius: 16, padding: 12, gap: 4 },
  cardTitle: { fontSize: 21, lineHeight: 26, color: colors.text, fontWeight: '800' },
  detail: { color: colors.muted, lineHeight: 20 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statCard: { flexGrow: 1, minWidth: '47%', backgroundColor: colors.primarySoft, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.border },
  statLabel: { color: colors.primary, fontWeight: '700', marginBottom: 8 },
  statValue: { color: colors.text, fontSize: 26, fontWeight: '800' },
  sectionEyebrow: { color: colors.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 11 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13, color: colors.text, backgroundColor: '#fdfefe' },
  textarea: { minHeight: 100 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: '#ffffff' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '600' },
  chipTextActive: { color: '#ffffff' },
  primaryButton: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  primaryButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  outlineButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#ffffff' },
  outlineButtonText: { color: colors.text, fontWeight: '700' },
  buttonDisabled: { opacity: 0.7 },
  emptyText: { color: colors.muted, lineHeight: 21 },
  itemCard: { borderWidth: 1, borderColor: colors.border, backgroundColor: '#fbfcfe', borderRadius: 16, padding: 14, gap: 6 },
  selectedCard: { borderColor: colors.primary },
  unreadCard: { borderColor: '#92d0ca', backgroundColor: '#f3fbfa' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  itemTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text },
  badge: { color: colors.primary, fontWeight: '700', backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, overflow: 'hidden' },
  readBadge: { backgroundColor: '#eef3f7', color: colors.muted },
  unreadBadge: { backgroundColor: colors.primarySoft, color: colors.primary },
  itemDetail: { color: colors.muted, lineHeight: 20 },
  itemDescription: { color: colors.text, lineHeight: 21 },
  itemMeta: { color: colors.muted, lineHeight: 18, fontSize: 13 },
  inlineButton: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.primarySoft },
  inlineButtonText: { color: colors.primary, fontWeight: '700' },
})
