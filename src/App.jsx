import AppRouter from './router/AppRouter.jsx'
import { BusinessProviders } from './context/BusinessProviders.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'

function App() {
  return (
    <SettingsProvider>
      <BusinessProviders>
        <AppRouter />
      </BusinessProviders>
    </SettingsProvider>
  )
}

export default App
