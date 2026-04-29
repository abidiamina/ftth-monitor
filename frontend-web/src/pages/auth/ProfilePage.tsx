import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { User, Mail, Phone, MapPin, Loader2, Save, Camera, Shield, ArrowLeft } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { AppDashboardShell } from '@/components/dashboard/AppDashboardShell'
import type { RootState } from '@/store'
import { updateMe, changePassword } from '@/services/authApi'
import { setCredentials } from '@/store/authSlice'
import { useNavigate } from 'react-router-dom'

export const ProfilePage = () => {
  const { user, token } = useSelector((state: RootState) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
  })

  const [passwordForm, setPasswordForm] = useState({
    ancienMotDePasse: '',
    nouveauMotDePasse: '',
    confirmPassword: '',
  })

  useEffect(() => {
    if (user) {
      setForm({
        nom: user.nom || '',
        prenom: user.prenom || '',
        email: user.email || '',
        telephone: user.telephone || '',
        adresse: (user as any).client?.adresse || '',
      })
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await updateMe(form)
      dispatch(setCredentials({ token: token!, user: response.user }))
      toast.success('Profil mis à jour !')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.nouveauMotDePasse !== passwordForm.confirmPassword) {
      return toast.error('Les nouveaux mots de passe ne correspondent pas.')
    }
    setLoading(true)
    try {
      await changePassword({
        motDePasseActuel: passwordForm.ancienMotDePasse,
        nouveauMotDePasse: passwordForm.nouveauMotDePasse,
      })
      toast.success('Mot de passe mis à jour !')
      setPasswordForm({ ancienMotDePasse: '', nouveauMotDePasse: '', confirmPassword: '' })
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors du changement de mot de passe.')
    } finally {
      setLoading(false)
    }
  }

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrateur',
    RESPONSABLE: 'Responsable Opérations',
    TECHNICIEN: 'Technicien Terrain',
    CLIENT: 'Client FTTH',
  }

  return (
    <AppDashboardShell 
      role={user?.role as any}
      workspaceLabel='Espace Personnel'
      workspaceTitle='Mon Profil'
    >
      <div className='max-w-4xl mx-auto py-10 px-4'>
        <button 
          onClick={() => navigate(-1)}
          className='mb-8 flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-950 transition-colors'
        >
          <ArrowLeft className='h-4 w-4' />
          Retour
        </button>

        <div className='grid gap-8 lg:grid-cols-[1fr_2fr]'>
          {/* Sidebar Info */}
          <div className='space-y-6'>
            <div className='dashboard-card p-8 flex flex-col items-center text-center'>
              <div className='relative group'>
                <div className='h-32 w-32 rounded-[2.5rem] bg-slate-100 flex items-center justify-center border-4 border-white shadow-xl overflow-hidden'>
                  <User className='h-16 w-16 text-slate-300' />
                </div>
                <button className='absolute bottom-0 right-0 p-2 bg-slate-900 text-white rounded-xl shadow-lg hover:scale-110 transition-transform'>
                  <Camera className='h-4 w-4' />
                </button>
              </div>
              <h2 className='mt-6 text-2xl font-black text-slate-950'>{user?.prenom} {user?.nom}</h2>
              <span className='mt-2 px-4 py-1.5 rounded-full bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-200/50'>
                {roleLabels[user?.role || '']}
              </span>
            </div>

            <div className='dashboard-card p-6 space-y-4'>
              <div className='flex items-center gap-4 p-3 rounded-2xl bg-slate-50/50 border border-slate-100'>
                <Shield className='h-5 w-5 text-emerald-500' />
                <div>
                  <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>Statut Compte</p>
                  <p className='text-sm font-bold text-emerald-600'>Vérifié & Actif</p>
                </div>
              </div>
              <p className='text-[10px] text-slate-400 font-medium px-2'>
                Membre depuis le {user ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '-'}
              </p>
            </div>
          </div>

          {/* Form */}
          <div className='dashboard-card p-10'>
            <h3 className='text-xl font-black text-slate-950 mb-8 border-b border-slate-100 pb-4'>Informations Personnelles</h3>
            
            <form className='space-y-6' onSubmit={handleSubmit}>
              <div className='grid gap-6 sm:grid-cols-2'>
                <div className='space-y-2'>
                  <label className='text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1'>Prénom</label>
                  <input 
                    type='text' 
                    value={form.prenom} 
                    onChange={e => setForm(c => ({...c, prenom: e.target.value}))}
                    className='w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900 transition-all'
                  />
                </div>
                <div className='space-y-2'>
                  <label className='text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1'>Nom</label>
                  <input 
                    type='text' 
                    value={form.nom} 
                    onChange={e => setForm(c => ({...c, nom: e.target.value}))}
                    className='w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900 transition-all'
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <label className='text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1'>Email</label>
                <div className='relative'>
                  <Mail className='absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400' />
                  <input 
                    type='email' 
                    readOnly
                    value={form.email} 
                    className='w-full bg-slate-100 border-none rounded-2xl pl-14 pr-5 py-4 text-sm font-bold text-slate-500 cursor-not-allowed'
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <label className='text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1'>Téléphone</label>
                <div className='relative'>
                  <Phone className='absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400' />
                  <input 
                    type='tel' 
                    value={form.telephone} 
                    onChange={e => setForm(c => ({...c, telephone: e.target.value}))}
                    className='w-full bg-slate-50 border-none rounded-2xl pl-14 pr-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900 transition-all'
                  />
                </div>
              </div>

              {user?.role === 'CLIENT' && (
                <div className='space-y-2'>
                  <label className='text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1'>Adresse de Branchement</label>
                  <div className='relative'>
                    <MapPin className='absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400' />
                    <textarea 
                      rows={2}
                      value={form.adresse} 
                      onChange={e => setForm(c => ({...c, adresse: e.target.value}))}
                      className='w-full bg-slate-50 border-none rounded-2xl pl-14 pr-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900 transition-all'
                    />
                  </div>
                </div>
              )}

              <div className='pt-6'>
                <button
                  type='submit'
                  disabled={loading}
                  className='w-full flex justify-center items-center gap-3 py-5 px-4 bg-slate-950 text-white rounded-[1.8rem] text-sm font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xl shadow-slate-200'
                >
                  {loading ? <Loader2 className='h-5 w-5 animate-spin' /> : <Save className='h-5 w-5' />}
                  Enregistrer les modifications
                </button>
              </div>
            </form>

            <h3 className='text-xl font-black text-slate-950 mt-12 mb-8 border-b border-slate-100 pb-4'>Sécurité</h3>
            
            <form className='space-y-6' onSubmit={handlePasswordSubmit}>
              <div className='space-y-2'>
                <label className='text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1'>Ancien mot de passe</label>
                <input 
                  type='password' 
                  required
                  value={passwordForm.ancienMotDePasse} 
                  onChange={e => setPasswordForm(c => ({...c, ancienMotDePasse: e.target.value}))}
                  className='w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900 transition-all'
                />
              </div>

              <div className='grid gap-6 sm:grid-cols-2'>
                <div className='space-y-2'>
                  <label className='text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1'>Nouveau mot de passe</label>
                  <input 
                    type='password' 
                    required
                    value={passwordForm.nouveauMotDePasse} 
                    onChange={e => setPasswordForm(c => ({...c, nouveauMotDePasse: e.target.value}))}
                    className='w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900 transition-all'
                  />
                </div>
                <div className='space-y-2'>
                  <label className='text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1'>Confirmer le mot de passe</label>
                  <input 
                    type='password' 
                    required
                    value={passwordForm.confirmPassword} 
                    onChange={e => setPasswordForm(c => ({...c, confirmPassword: e.target.value}))}
                    className='w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900 transition-all'
                  />
                </div>
              </div>

              <div className='pt-6'>
                <button
                  type='submit'
                  disabled={loading}
                  className='w-full flex justify-center items-center gap-3 py-5 px-4 bg-slate-900 text-white rounded-[1.8rem] text-sm font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xl'
                >
                  {loading ? <Loader2 className='h-5 w-5 animate-spin' /> : <Shield className='h-5 w-5' />}
                  Changer le mot de passe
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppDashboardShell>
  )
}
