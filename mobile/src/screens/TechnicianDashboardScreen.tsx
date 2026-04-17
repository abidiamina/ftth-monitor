import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import { DashboardTabs } from '../components/DashboardTabs'
import { RoleBadge } from '../components/RoleBadge'
import { Screen } from '../components/Screen'
import { useAuth } from '../context/AuthContext'
import {
  addInterventionEvidence,
  listInterventions,
  updateIntervention,
  updateInterventionFieldCheck,
} from '../services/interventionApi'
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

type TechnicianTab = 'overview' | 'interventions' | 'notifications' | 'profile'

const technicianTabs: Array<{ key: TechnicianTab; label: string }> = [
  { key: 'overview', label: 'Apercu' },
  { key: 'interventions', label: 'Interventions' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'profile', label: 'Profil' },
]

const formatDate = (value?: string | null) => {
  if (!value) return 'Non renseignee'

  return new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function TechnicianDashboardScreen() {
  const { user, logout, refreshCurrentUser } = useAuth()
  const [activeTab, setActiveTab] = useState<TechnicianTab>('overview')
  const [interventions, setInterventions] = useState<InterventionRecord[]>([])
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [selectedInterventionId, setSelectedInterventionId] = useState<number | null>(null)
  const [qrValue, setQrValue] = useState('')
  const [evidenceNote, setEvidenceNote] = useState('')
  const [evidencePhotoName, setEvidencePhotoName] = useState('')
  const [evidencePhoto, setEvidencePhoto] = useState<{
    uri: string
    base64: string
    fileName: string
  } | null>(null)
  const [scannerVisible, setScannerVisible] = useState(false)
  const [scanLocked, setScanLocked] = useState(false)
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()

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
      if (!selectedInterventionId && interventionData[0]) {
        setSelectedInterventionId(interventionData[0].id)
      }
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

  const selectedIntervention =
    interventions.find((item) => item.id === selectedInterventionId) ?? interventions[0] ?? null

  const stats = useMemo(() => {
    const total = interventions.length
    const enAttente = interventions.filter((item) => item.statut === 'EN_ATTENTE').length
    const enCours = interventions.filter((item) => item.statut === 'EN_COURS').length
    const unread = notifications.filter((item) => !item.lu).length
    const gps = interventions.filter((item) => item.gpsConfirmedAt).length
    return { total, enAttente, enCours, unread, gps }
  }, [interventions, notifications])

  const historicalInterventions = useMemo(
    () =>
      [...interventions]
        .sort(
          (left, right) =>
            new Date(right.dateFin ?? right.dateCreation).getTime() -
            new Date(left.dateFin ?? left.dateCreation).getTime()
        )
        .slice(0, 6),
    [interventions]
  )

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

  const handleAccept = (intervention: InterventionRecord) =>
    handleAction(intervention, { statut: 'EN_COURS' })

  const handleReject = (intervention: InterventionRecord) =>
    handleAction(intervention, { statut: 'EN_ATTENTE', technicienId: null })

  const handleComplete = (intervention: InterventionRecord) =>
    handleAction(intervention, { statut: 'TERMINEE' })

  const handleConfirmGps = async () => {
    if (!selectedIntervention) return

    setProcessingId(selectedIntervention.id)
    try {
      const response = await updateInterventionFieldCheck(selectedIntervention.id, { confirmGps: true })
      Alert.alert('GPS confirme', response.message)
      await loadData(true)
    } catch (error: any) {
      Alert.alert('GPS indisponible', error?.response?.data?.message ?? 'Confirmation impossible.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleSaveQr = async () => {
    if (!selectedIntervention) return

    setProcessingId(selectedIntervention.id)
    try {
      const response = await updateInterventionFieldCheck(selectedIntervention.id, {
        qrCodeValue: qrValue,
      })
      Alert.alert('QR enregistre', response.message)
      setQrValue('')
      await loadData(true)
    } catch (error: any) {
      Alert.alert('QR invalide', error?.response?.data?.message ?? 'Validation impossible.')
    } finally {
      setProcessingId(null)
    }
  }

  const openQrScanner = async () => {
    let permission = cameraPermission
    if (!permission?.granted) {
      permission = await requestCameraPermission()
    }

    if (!permission.granted) {
      Alert.alert(
        'Camera indisponible',
        permission.canAskAgain
          ? 'Autorise la camera pour scanner le QR code.'
          : 'Active la camera dans les reglages de ton iPhone pour scanner le QR code.',
        permission.canAskAgain
          ? [{ text: 'OK' }]
          : [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Reglages', onPress: () => void Linking.openSettings() },
            ]
      )
      return
    }

    setScanLocked(false)
    setScannerVisible(true)
  }

  const handleQrScanned = (value: string) => {
    if (scanLocked) {
      return
    }

    setScanLocked(true)
    setQrValue(value)
    setScannerVisible(false)
    Alert.alert('QR detecte', 'Le code a ete rempli automatiquement.')
  }

  const handleSaveEvidence = async () => {
    if (!selectedIntervention) return
    if (!evidencePhoto?.base64) {
      Alert.alert('Photo requise', 'Prends une photo avant d envoyer la preuve.')
      return
    }

    setProcessingId(selectedIntervention.id)
    try {
      const response = await addInterventionEvidence(selectedIntervention.id, {
        commentaire: evidenceNote,
        photoName: evidencePhotoName,
        photoData: evidencePhoto.base64,
      })
      Alert.alert('Preuve enregistree', response.message)
      setEvidenceNote('')
      setEvidencePhotoName('')
      setEvidencePhoto(null)
      await loadData(true)
    } catch (error: any) {
      Alert.alert('Preuve impossible', error?.response?.data?.message ?? 'Ajout impossible.')
    } finally {
      setProcessingId(null)
    }
  }

  const handlePickEvidencePhoto = async (mode: 'camera' | 'library') => {
    try {
      if (mode === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync()
        if (!permission.granted) {
          Alert.alert('Camera indisponible', 'Autorise la camera pour ajouter une preuve.')
          return
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!permission.granted) {
          Alert.alert('Acces refuse', 'Autorise la phototheque pour choisir une image.')
          return
        }
      }

      const result =
        mode === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              base64: true,
              quality: 0.25,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              base64: true,
              quality: 0.25,
            })

      if (result.canceled || !result.assets[0]?.base64) {
        return
      }

      const asset = result.assets[0]
      const base64 = asset.base64
      if (!base64) {
        return
      }
      const generatedName =
        asset.fileName ?? `preuve-${selectedInterventionId ?? 'terrain'}-${Date.now()}.jpg`

      setEvidencePhoto({
        uri: asset.uri,
        base64,
        fileName: generatedName,
      })
      setEvidencePhotoName((current) => current.trim() || generatedName)
    } catch (error) {
      Alert.alert('Photo impossible', 'Impossible d ouvrir la camera pour le moment.')
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
        <Text style={styles.eyebrow}>Operations technicien</Text>
        <Text style={styles.title}>Missions terrain</Text>
      </View>

      <DashboardTabs tabs={technicianTabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' ? (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Tickets</Text>
              <Text style={styles.statValue}>{stats.total}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>En cours</Text>
              <Text style={styles.statValue}>{stats.enCours}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>GPS</Text>
              <Text style={styles.statValue}>{stats.gps}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Alertes</Text>
              <Text style={styles.statValue}>{stats.unread}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Mission active</Text>
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
              <Text style={styles.emptyText}>Aucune intervention.</Text>
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
        </View>
      ) : null}

      {activeTab === 'interventions' ? (
        <>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Interventions</Text>
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : interventions.length === 0 ? (
              <Text style={styles.emptyText}>Aucune intervention.</Text>
            ) : (
              interventions.map((item) => {
                const isBusy = processingId === item.id

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.itemCard,
                      selectedIntervention?.id === item.id ? styles.selectedCard : null,
                    ]}
                  >
                    <Pressable
                      onPress={() => setSelectedInterventionId(item.id)}
                      style={({ pressed }) => [
                        styles.itemPressArea,
                        pressed ? styles.itemPressed : null,
                      ]}
                    >
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemTitle}>{item.titre}</Text>
                        <Text style={styles.badge}>{statusLabels[item.statut]}</Text>
                      </View>
                      <Text style={styles.itemDetail}>Priorite: {priorityLabels[item.priorite]}</Text>
                      <Text style={styles.itemDetail}>Adresse: {item.adresse}</Text>
                    </Pressable>

                    <View style={styles.actionsRow}>
                      {item.statut === 'EN_ATTENTE' ? (
                        <>
                          <Pressable
                            style={[
                              styles.actionButton,
                              styles.startButton,
                              styles.pressableAction,
                              isBusy ? styles.buttonDisabled : null,
                            ]}
                            onPress={() => void handleAccept(item)}
                            disabled={isBusy}
                          >
                            <Text style={styles.actionButtonText}>Accepter</Text>
                          </Pressable>
                          <Pressable
                            style={[
                              styles.actionButton,
                              styles.rejectButton,
                              styles.pressableAction,
                              isBusy ? styles.buttonDisabled : null,
                            ]}
                            onPress={() => void handleReject(item)}
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
                            styles.pressableAction,
                            isBusy ? styles.buttonDisabled : null,
                          ]}
                          onPress={() => void handleComplete(item)}
                          disabled={isBusy}
                        >
                          <Text style={styles.actionButtonText}>Terminer</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                )
              })
            )}
          </View>

          {selectedIntervention ? (
            <>
              <View style={styles.card}>
                <Text style={styles.sectionEyebrow}>Terrain</Text>
                <Text style={styles.sectionTitle}>Confirmation GPS</Text>
                <Text style={styles.itemDetail}>
                  Derniere confirmation: {formatDate(selectedIntervention.gpsConfirmedAt)}
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.primaryButton, pressed ? styles.buttonPressed : null]}
                  onPress={() => void handleConfirmGps()}
                >
                  <Text style={styles.primaryButtonText}>Confirmer ma presence</Text>
                </Pressable>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionEyebrow}>Controle</Text>
                <Text style={styles.sectionTitle}>Scan QR</Text>
                <Pressable
                  style={({ pressed }) => [styles.secondaryButton, pressed ? styles.buttonPressed : null]}
                  onPress={() => void openQrScanner()}
                >
                  <Text style={styles.secondaryButtonText}>Scanner avec la camera</Text>
                </Pressable>
                <TextInput
                  value={qrValue}
                  onChangeText={setQrValue}
                  placeholder='Saisir le code QR'
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                />
                <Text style={styles.itemDetail}>Dernier code: {selectedIntervention.qrCodeValue ?? 'Aucun'}</Text>
                <Pressable
                  style={({ pressed }) => [styles.primaryButton, pressed ? styles.buttonPressed : null]}
                  onPress={() => void handleSaveQr()}
                >
                  <Text style={styles.primaryButtonText}>Valider le code</Text>
                </Pressable>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionEyebrow}>Preuves</Text>
                <Text style={styles.sectionTitle}>Preuves terrain</Text>
                <View style={styles.photoActionsRow}>
                  <Pressable
                    style={({ pressed }) => [styles.secondaryButton, pressed ? styles.buttonPressed : null]}
                    onPress={() => void handlePickEvidencePhoto('camera')}
                  >
                    <Text style={styles.secondaryButtonText}>Prendre une photo</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.secondaryButton, pressed ? styles.buttonPressed : null]}
                    onPress={() => void handlePickEvidencePhoto('library')}
                  >
                    <Text style={styles.secondaryButtonText}>Galerie</Text>
                  </Pressable>
                </View>
                {evidencePhoto ? (
                  <View style={styles.previewCard}>
                    <Image source={{ uri: evidencePhoto.uri }} style={styles.previewImage} />
                    <Text style={styles.itemMeta}>{evidencePhoto.fileName}</Text>
                  </View>
                ) : (
                  <Text style={styles.itemDetail}>Aucune photo selectionnee.</Text>
                )}
                <TextInput
                  value={evidencePhotoName}
                  onChangeText={setEvidencePhotoName}
                  placeholder='Nom de la preuve'
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                />
                <TextInput
                  value={evidenceNote}
                  onChangeText={setEvidenceNote}
                  placeholder='Commentaire'
                  placeholderTextColor={colors.muted}
                  multiline
                  textAlignVertical='top'
                  style={[styles.input, styles.textarea]}
                />
                <Pressable
                  style={({ pressed }) => [styles.primaryButton, pressed ? styles.buttonPressed : null]}
                  onPress={() => void handleSaveEvidence()}
                >
                  <Text style={styles.primaryButtonText}>Ajouter la preuve</Text>
                </Pressable>
                {selectedIntervention.evidences.map((evidence) => (
                  <View key={evidence.id} style={styles.subCard}>
                    <Text style={styles.itemTitle}>{evidence.photoName}</Text>
                    <Text style={styles.itemDetail}>{evidence.commentaire}</Text>
                    <Text style={styles.itemMeta}>{formatDate(evidence.createdAt)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionEyebrow}>Suivi</Text>
                <Text style={styles.sectionTitle}>Historique</Text>
                {historicalInterventions.map((item) => (
                  <View key={item.id} style={styles.subCard}>
                    <Text style={styles.itemTitle}>{item.titre}</Text>
                    <Text style={styles.itemDetail}>{statusLabels[item.statut]}</Text>
                    <Text style={styles.itemMeta}>{formatDate(item.dateFin ?? item.dateCreation)}</Text>
                  </View>
                ))}
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
                    style={({ pressed }) => [styles.inlineButton, pressed ? styles.buttonPressed : null]}
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

      <Modal visible={scannerVisible} animationType='slide' onRequestClose={() => setScannerVisible(false)}>
        <View style={styles.scannerScreen}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Scanner le QR code</Text>
            <Pressable
              style={({ pressed }) => [styles.outlineButton, pressed ? styles.buttonPressed : null]}
              onPress={() => setScannerVisible(false)}
            >
              <Text style={styles.outlineButtonText}>Fermer</Text>
            </Pressable>
          </View>
          <Text style={styles.itemDetail}>Cadre le QR code de l equipement pour remplir le champ automatiquement.</Text>
          <View style={styles.cameraFrame}>
            <CameraView
              style={styles.cameraView}
              facing='back'
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }) => handleQrScanned(data)}
            />
          </View>
        </View>
      </Modal>
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
  emptyText: { color: colors.muted, lineHeight: 21 },
  itemCard: { borderWidth: 1, borderColor: colors.border, backgroundColor: '#f8fbff', borderRadius: 18, padding: 14, gap: 6 },
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
  itemPressArea: { gap: 6 },
  itemPressed: { transform: [{ scale: 0.992 }] },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6, alignItems: 'center' },
  actionButton: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11 },
  pressableAction: { shadowColor: colors.shadow, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  startButton: { backgroundColor: colors.info },
  completeButton: { backgroundColor: colors.success },
  rejectButton: { backgroundColor: '#b42318' },
  actionButtonText: { color: '#ffffff', fontWeight: '700' },
  outlineButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f8fbff' },
  outlineButtonText: { color: colors.text, fontWeight: '700' },
  buttonDisabled: { opacity: 0.7 },
  buttonPressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
  inlineButton: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.primarySoft },
  inlineButtonText: { color: colors.primary, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 14, color: colors.text, backgroundColor: '#f8fbff', fontSize: 16 },
  textarea: { minHeight: 96 },
  primaryButton: { backgroundColor: colors.info, borderRadius: 18, paddingVertical: 15, alignItems: 'center' },
  primaryButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 17 },
  secondaryButton: { flex: 1, minWidth: 140, borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingVertical: 13, alignItems: 'center', backgroundColor: '#f8fbff' },
  secondaryButtonText: { color: colors.text, fontWeight: '700' },
  photoActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  previewCard: { borderWidth: 1, borderColor: colors.border, backgroundColor: '#f8fbff', borderRadius: 16, padding: 12, gap: 8 },
  previewImage: { width: '100%', height: 160, borderRadius: 14, backgroundColor: '#e9eef2' },
  scannerScreen: { flex: 1, backgroundColor: colors.bg, padding: 20, gap: 16, justifyContent: 'center' },
  scannerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  scannerTitle: { flex: 1, fontSize: 24, fontWeight: '800', color: colors.text },
  cameraFrame: { overflow: 'hidden', borderRadius: 28, borderWidth: 1, borderColor: colors.border, backgroundColor: '#dfe8ee', minHeight: 420 },
  cameraView: { flex: 1, minHeight: 420 },
})
