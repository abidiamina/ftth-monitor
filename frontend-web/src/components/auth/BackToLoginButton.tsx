import { ArrowLeft } from 'lucide-react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { logout } from '@/store/authSlice'

export const BackToLoginButton = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleBackToLogin = () => {
    dispatch(logout())
    navigate('/login', { replace: true })
  }

  return (
    <Button
      variant='outline'
      className='h-11 rounded-full border-slate-200 bg-white px-5 text-slate-800 hover:bg-slate-50'
      onClick={handleBackToLogin}
    >
      <ArrowLeft className='h-4 w-4' />
      Retour login
    </Button>
  )
}
