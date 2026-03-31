import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { ClientDashboardScreen } from '../screens/ClientDashboardScreen'
import { LoadingScreen } from '../screens/LoadingScreen'
import { LoginScreen } from '../screens/LoginScreen'
import { RegisterScreen } from '../screens/RegisterScreen'
import { TechnicianDashboardScreen } from '../screens/TechnicianDashboardScreen'
import { UnauthorizedMobileScreen } from '../screens/UnauthorizedMobileScreen'
import { usePushNotificationsRegistration } from '../services/pushNotifications'

export type RootStackParamList = {
  Login: undefined
  Register: undefined
  Dashboard: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

function RootStack() {
  const { isAuthenticated, isReady, user } = useAuth()
  usePushNotificationsRegistration(user, isAuthenticated)

  if (!isReady) {
    return <LoadingScreen />
  }

  const dashboardScreen =
    user?.role === 'CLIENT'
      ? ClientDashboardScreen
      : user?.role === 'TECHNICIEN'
        ? TechnicianDashboardScreen
        : UnauthorizedMobileScreen

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Dashboard" component={dashboardScreen} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export function RootNavigator() {
  return (
    <AuthProvider>
      <RootStack />
    </AuthProvider>
  )
}
