import { useCallback, useEffect, useMemo, useState } from 'react'
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
import * as Location from 'expo-location'
import { Ionicons } from '@expo/vector-icons'
import { DashboardTabs } from '../components/DashboardTabs'
import { RoleBadge } from '../components/RoleBadge'
import { Screen } from '../components/Screen'
import { SignaturePad } from '../components/SignaturePad'
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
  latitude: '',
  longitude: '',
}

type ClientTab = 'overview' | 'interventions' | 'notifications' | 'profile'

const clientTabs: Array<{ key: ClientTab; label: string }> = [
  { key: 'overview', label: 'Apercu' },
  { key: 'interventions', label: 'Interventions' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'profile', label: 'Profil' },
]

const formatDate = (value?: string | null) => {
  if (!value) return 'Non planifiee'

  return new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function ClientDashboardScreen() {
  const { user, logout, refreshCurrentUser } = useAuth()
  const [activeTab, setActiveTab] = useState<ClientTab>('overview')
  const [interventions, setInterventions] = useState<InterventionRecord[]>([])
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [approvalSubmitting, setApprovalSubmitting] = useState(false)
  const [form, setForm] = useState<CreateInterventionRequest>(emptyForm)
  const [selectedInterventionId, setSelectedInterventionId] = useState<number | null>(null)
  const [signaturePayload, setSignaturePayload] = useState('')
  const [signatureReady, setSignatureReady] = useState(false)
  const [signatureClearSignal, setSignatureClearSignal] = useState(0)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [feedbackRating, setFeedbackRating] = useState(5)
  const [isDrawingSignature, setIsDrawingSignature] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  const handleSignatureChange = useCallback((payload: string, hasSignature: boolean) => {
    setSignaturePayload(payload)
    setSignatureReady(hasSignature)
  }, [])

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

  const handleGetLocation = async () => {
    setGettingLocation(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission refusee', 'L acces a la localisation est necessaire pour remplir les champs automatiquement.')
        return
      }

      const location = await Location.getCurrentPositionAsync({
         accuracy: Location.Accuracy.Balanced
      })
      
      setForm(prev => ({
        ...prev,
        latitude: location.coords.latitude.toString(),
        longitude: location.coords.longitude.toString()
      }))
      
      Alert.alert('Position recuperee', 'Les coordonnees ont ete mises a jour.')
    } catch (error) {
      Alert.alert('Erreur GPS', 'Impossible de recuperer votre position actuelle.')
    } finally {
      setGettingLocation(false)
    }
  }

  const handleCreate = async () => {
    if (!form.titre?.trim() || !form.description?.trim() || !form.adresse?.trim()) {
      Alert.alert('Champs requis', 'Merci de renseigner le titre, la description et l adresse.')
      return
    }

    if (!isConfirming) {
      setIsConfirming(true)
      return
    }

    setSubmitting(true)

    try {
      const response = await createIntervention({
        titre: form.titre.trim(),
        description: form.description.trim(),
        adresse: form.adresse.trim(),
        priorite: form.priorite ?? 'NORMALE',
        latitude: form.latitude,
        longitude: form.longitude,
      })

      Alert.alert('Demande enregistree', response.message)
      setForm(emptyForm)
      setIsConfirming(false)
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
    if (!signatureReady || !signaturePayload) {
      Alert.alert('Signature requise', 'Merci de dessiner votre signature.')
      return
    }

    setApprovalSubmitting(true)

    try {
      const response = await submitInterventionClientApproval(selectedIntervention.id, {
        signature: signaturePayload,
        signatureBy: `${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim() || 'Client',
        feedbackRating,
        feedbackComment,
      })
      Alert.alert('Validation client', response.message)
      setSignaturePayload('')
      setSignatureReady(false)
      setSignatureClearSignal((current) => current + 1)
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
      scrollEnabled={!isDrawingSignature}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} />}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Portail client</Text>
        <Text style={styles.title}>Interventions FTTH</Text>
      </View>

      <DashboardTabs tabs={clientTabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' ? (
        <>
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
            <Text style={styles.sectionTitle}>Derniere intervention</Text>
            {selectedIntervention ? (
              <View style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{selectedIntervention.titre}</Text>
                  <Text style={styles.badge}>{statusLabels[selectedIntervention.statut]}</Text>
                </View>
                <Text style={styles.itemDetail}>
                  Priorite: {priorityLabels[selectedIntervention.priorite]}
                </Text>
                <Text style={styles.itemDetail}>Adresse: {selectedIntervention.adresse}</Text>
                <Text style={styles.itemMeta}>
                  Mise a jour: {formatDate(selectedIntervention.dateFin ?? selectedIntervention.dateDebut ?? selectedIntervention.dateCreation)}
                </Text>
              </View>
            ) : (
              <Text style={styles.emptyText}>Aucune intervention pour le moment.</Text>
            )}
          </View>
        </>
      ) : null}

      {activeTab === 'profile' ? (
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <RoleBadge role={user.role} />
            <Pressable
              style={({ pressed }) => [styles.outlineButton, pressed ? styles.buttonPressed : null]}
              onPress={() => void logout()}
            >
              <Text style={styles.outlineButtonText}>Se deconnecter</Text>
            </Pressable>
          </View>
          <Text style={styles.cardTitle}>
            {user.prenom} {user.nom}
          </Text>
          <Text style={styles.detail}>{user.email}</Text>
          <Text style={styles.detail}>{user.client?.adresse ?? 'Adresse non renseignee'}</Text>
        </View>
      ) : null}

      {activeTab === 'interventions' ? (
        <>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              {!isConfirming ? 'Nouvelle demande' : 'Verification finale'}
            </Text>
            
            {!isConfirming ? (
              <>
                <Pressable
                  style={({ pressed }) => [
                    styles.outlineButton,
                    { borderStyle: 'dashed', backgroundColor: colors.primarySoft, borderColor: colors.primary, marginBottom: 10 },
                    pressed ? styles.buttonPressed : null,
                    gettingLocation ? styles.buttonDisabled : null
                  ]}
                  onPress={() => void handleGetLocation()}
                  disabled={gettingLocation}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {gettingLocation ? (
                      <ActivityIndicator size='small' color={colors.primary} />
                    ) : (
                      <Text style={[styles.outlineButtonText, { color: colors.primary }]}>📍 Utiliser ma position actuelle</Text>
                    )}
                  </View>
                </Pressable>

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
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TextInput
                    value={form.latitude?.toString()}
                    onChangeText={(value) => setForm((current) => ({ ...current, latitude: value }))}
                    placeholder='Latitude'
                    placeholderTextColor={colors.muted}
                    keyboardType='numeric'
                    style={[styles.input, { flex: 1 }]}
                  />
                  <TextInput
                    value={form.longitude?.toString()}
                    onChangeText={(value) => setForm((current) => ({ ...current, longitude: value }))}
                    placeholder='Longitude'
                    placeholderTextColor={colors.muted}
                    keyboardType='numeric'
                    style={[styles.input, { flex: 1 }]}
                  />
                </View>
                <View style={styles.chipsRow}>
                  {priorities.map((priority) => {
                    const isActive = (form.priorite ?? 'NORMALE') === priority
                    return (
                      <Pressable
                        key={priority}
                        style={({ pressed }) => [
                          styles.chip,
                          isActive ? styles.chipActive : null,
                          pressed ? styles.buttonPressed : null,
                        ]}
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
                  style={({ pressed }) => [
                    styles.primaryButton,
                    submitting ? styles.buttonDisabled : null,
                    pressed ? styles.buttonPressed : null,
                  ]}
                  onPress={() => void handleCreate()}
                  disabled={submitting}
                >
                  <Text style={styles.primaryButtonText}>Suivant</Text>
                </Pressable>
              </>
            ) : (
              <View style={{ gap: 16 }}>
                <View style={styles.summaryBox}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Sujet</Text>
                    <Text style={styles.summaryValue}>{form.titre}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Adresse</Text>
                    <Text style={styles.summaryValue}>{form.adresse}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 20 }}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Priorite</Text>
                      <Text style={[styles.summaryValue, { color: colors.primary }]}>{priorityLabels[form.priorite ?? 'NORMALE']}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>GPS</Text>
                      <Text style={styles.summaryValue}>{form.latitude ? '✅ Oui' : '❌ Non'}</Text>
                    </View>
                  </View>
                  <View style={[styles.summaryItem, { borderBottomWidth: 0 }]}>
                    <Text style={styles.summaryLabel}>Description</Text>
                    <Text style={[styles.summaryValue, { fontStyle: 'italic', color: colors.muted, fontSize: 14 }]}>
                      "{form.description}"
                    </Text>
                  </View>
                </View>

                <View style={{ gap: 10 }}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryButton,
                      { backgroundColor: colors.success },
                      submitting ? styles.buttonDisabled : null,
                      pressed ? styles.buttonPressed : null,
                    ]}
                    onPress={() => void handleCreate()}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color='#ffffff' />
                    ) : (
                      <Text style={styles.primaryButtonText}>Confirmer l'envoi</Text>
                    )}
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.outlineButton,
                      { borderColor: colors.muted, borderStyle: 'solid' },
                      pressed ? styles.buttonPressed : null,
                    ]}
                    onPress={() => setIsConfirming(false)}
                  >
                    <Text style={[styles.outlineButtonText, { textAlign: 'center', color: colors.muted }]}>Modifier les informations</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Mes interventions</Text>
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : interventions.length === 0 ? (
              <Text style={styles.emptyText}>Aucune intervention pour le moment.</Text>
            ) : (
              interventions.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => setSelectedInterventionId(item.id)}
                  style={({ pressed }) => [
                    styles.itemCard,
                    selectedIntervention?.id === item.id ? styles.selectedCard : null,
                    pressed ? styles.itemPressed : null,
                  ]}
                >
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
                <Text style={styles.itemDetail}>
                  Derniere signature: {formatDate(selectedIntervention.clientSignatureAt)}
                </Text>
                <SignaturePad
                  clearSignal={signatureClearSignal}
                  onChange={handleSignatureChange}
                  onDrawingChange={setIsDrawingSignature}
                />
                <View style={styles.signatureActions}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.outlineButton,
                      pressed ? styles.buttonPressed : null,
                    ]}
                    onPress={() => setSignatureClearSignal((current) => current + 1)}
                  >
                    <Text style={styles.outlineButtonText}>Effacer signature</Text>
                  </Pressable>
                  <Text style={styles.signatureState}>
                    {signatureReady ? 'Signature capturee' : 'Aucune signature'}
                  </Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionEyebrow}>Qualite</Text>
                <Text style={styles.sectionTitle}>Note d evaluation</Text>

                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((value) => {
                    const active = value <= feedbackRating
                    return (
                      <Pressable
                        key={value}
                        style={({ pressed }) => [
                          styles.starButton,
                          pressed ? styles.buttonPressed : null,
                        ]}
                        onPress={() => setFeedbackRating(value)}
                      >
                        <Ionicons 
                          name={active ? 'star' : 'star-outline'} 
                          size={32} 
                          color={active ? '#FFB800' : colors.muted} 
                        />
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
                  style={({ pressed }) => [
                    styles.primaryButton,
                    approvalSubmitting ? styles.buttonDisabled : null,
                    pressed ? styles.buttonPressed : null,
                  ]}
                  onPress={() => void handleSubmitApproval()}
                  disabled={approvalSubmitting}
                >
                  {approvalSubmitting ? (
                    <ActivityIndicator color='#ffffff' />
                  ) : (
                    <Text style={styles.primaryButtonText}>Valider l'intervention</Text>
                  )}
                </Pressable>
                
                {selectedIntervention.clientFeedbackRating !== null && (
                  <View style={styles.subCard}>
                    <Text style={[styles.sectionEyebrow, { marginBottom: 8 }]}>Votre évaluation enregistrée</Text>
                    <View style={styles.displayStarsRow}>
                      {[1, 2, 3, 4, 5].map((v) => (
                        <Ionicons 
                          key={v}
                          name={v <= (selectedIntervention.clientFeedbackRating || 0) ? 'star' : 'star-outline'} 
                          size={16} 
                          color={v <= (selectedIntervention.clientFeedbackRating || 0) ? '#FFB800' : colors.muted} 
                        />
                      ))}
                      <Text style={styles.ratingText}>({selectedIntervention.clientFeedbackRating}/5)</Text>
                    </View>
                    <Text style={styles.itemDetail}>
                      {selectedIntervention.clientFeedbackComment || 'Aucun commentaire.'}
                    </Text>
                  </View>
                )}
              </View>
            </>
          ) : null}
        </>
      ) : null}

      {activeTab === 'notifications' ? (
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
                  <Pressable
                    style={({ pressed }) => [
                      styles.inlineButton,
                      pressed ? styles.buttonPressed : null,
                    ]}
                    onPress={() => void handleMarkAsRead(item.id)}
                  >
                    <Text style={styles.inlineButtonText}>Marquer comme lue</Text>
                  </Pressable>
                ) : null}
              </View>
            ))
          )}
        </View>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { gap: 6, marginTop: 2, marginBottom: 14 },
  eyebrow: { color: colors.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: colors.text, fontSize: 32, lineHeight: 38, fontWeight: '800' },
  profileCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 18,
    gap: 8,
    marginBottom: 14,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  profileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 18,
    gap: 10,
    marginBottom: 14,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  subCard: { borderWidth: 1, borderColor: colors.border, backgroundColor: '#fbfcfe', borderRadius: 16, padding: 12, gap: 4 },
  cardTitle: { fontSize: 21, lineHeight: 26, color: colors.text, fontWeight: '800' },
  detail: { color: colors.muted, lineHeight: 20 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statCard: { flexGrow: 1, minWidth: '47%', backgroundColor: '#ecfeff', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: '#c9f2ee' },
  statLabel: { color: colors.primary, fontWeight: '700', marginBottom: 8 },
  statValue: { color: colors.text, fontSize: 28, fontWeight: '800' },
  sectionEyebrow: { color: colors.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 11 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 14, color: colors.text, backgroundColor: '#f8fbff', fontSize: 16 },
  textarea: { minHeight: 100 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: '#f9fbff' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '600' },
  chipTextActive: { color: '#ffffff' },
  primaryButton: { backgroundColor: colors.info, borderRadius: 18, paddingVertical: 15, alignItems: 'center' },
  primaryButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 17 },
  outlineButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f8fbff' },
  outlineButtonText: { color: colors.text, fontWeight: '700' },
  buttonDisabled: { opacity: 0.7 },
  buttonPressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
  emptyText: { color: colors.muted, lineHeight: 21 },
  itemCard: { borderWidth: 1, borderColor: colors.border, backgroundColor: '#f8fbff', borderRadius: 18, padding: 14, gap: 6 },
  itemPressed: { transform: [{ scale: 0.992 }] },
  selectedCard: { borderColor: colors.primary },
  unreadCard: { borderColor: '#92d0ca', backgroundColor: '#f3fbfa' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  itemTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text },
  badge: { color: colors.primary, fontWeight: '700', backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, overflow: 'hidden' },
  readBadge: { backgroundColor: '#eef3f7', color: colors.muted },
  unreadBadge: { backgroundColor: colors.primarySoft, color: colors.primary },
  itemDetail: { color: colors.muted, lineHeight: 20 },
  itemDescription: { color: colors.text, lineHeight: 21 },
  itemMeta: { color: colors.muted, lineHeight: 18, fontSize: 13 },
  inlineButton: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.primarySoft },
  inlineButtonText: { color: colors.primary, fontWeight: '700' },
  signatureActions: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  signatureState: { color: colors.muted, fontWeight: '600', flexShrink: 1 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginVertical: 12 },
  starButton: { padding: 4 },
  displayStarsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  ratingText: { fontSize: 13, fontWeight: '700', color: colors.text, marginLeft: 4 },
  summaryBox: { backgroundColor: '#f0f7ff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#dbeafe', gap: 12 },
  summaryItem: { borderBottomWidth: 1, borderBottomColor: '#e2e8f0', pb: 8, gap: 2 },
  summaryLabel: { fontSize: 10, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 16, fontWeight: '800', color: colors.text },
})
