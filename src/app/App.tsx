import { useEffect, useState } from 'react';
import { navigate, parseHash, useRoute } from './router';
import { installSkipped, requestPersistentStorage, shouldSuggestInstall } from './platform';
import { TabBar } from '../components/TabBar';
import { UpdatePrompt } from '../components/UpdatePrompt';
import { ChampionCelebration, StreakUp } from '../components/Celebrations';
import { AchievementWatcher } from '../components/AchievementWatcher';
import { useSettings } from '../hooks';
import { Home } from '../screens/Home';
import { PathMap } from '../screens/PathMap';
import { Lesson } from '../screens/Lesson';
import { Result } from '../screens/Result';
import { Progress } from '../screens/Progress';
import { Theory } from '../screens/Theory';
import { Parents } from '../screens/Parents';
import { InstallHelp } from '../screens/InstallHelp';
import { ReportScreen, TrackingScreen } from '../screens/Tracking';

export function App() {
  const route = useRoute();
  const [streakShowing, setStreakShowing] = useState(false);
  const settings = useSettings();

  // Tema elegido en la zona de padres (automático = el del sistema).
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'auto') delete root.dataset.theme;
    else root.dataset.theme = settings.theme;
  }, [settings.theme]);

  useEffect(() => {
    void requestPersistentStorage();
    // En Safari sin instalar, mostramos primero la ayuda de instalación.
    // (salvo al abrir un informe de seguimiento: eso se ve en el navegador de los padres)
    const start = parseHash(location.hash).name;
    if (shouldSuggestInstall() && !installSkipped() && start !== 'report' && start !== 'tracking') navigate({ name: 'install' }, true);
  }, []);

  // Al cambiar de pantalla, volvemos arriba.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.name]);

  const inLesson = route.name === 'lesson' || route.name === 'practice' || route.name === 'placement' || route.name === 'install' || route.name === 'report' || route.name === 'tracking';
  let screen: React.ReactNode;
  let tabs = true;
  switch (route.name) {
    case 'home':
      screen = <Home />;
      break;
    case 'path':
      screen = <PathMap />;
      break;
    case 'lesson':
      screen = <Lesson key={`${route.unitId}/${route.level}`} mode={{ kind: 'lesson', unitId: route.unitId, level: route.level }} />;
      tabs = false;
      break;
    case 'placement':
      screen = <Lesson key={`p-${route.unitId}`} mode={{ kind: 'placement', unitId: route.unitId }} />;
      tabs = false;
      break;
    case 'result':
      screen = <Result sessionId={route.sessionId} />;
      tabs = false;
      break;
    case 'practice':
      screen = <Lesson key="practice" mode={{ kind: 'practice' }} />;
      tabs = false;
      break;
    case 'progress':
      screen = <Progress />;
      break;
    case 'theory':
      screen = <Theory ruleId={route.ruleId} />;
      break;
    case 'parents':
      screen = <Parents />;
      break;
    case 'install':
      screen = <InstallHelp />;
      tabs = false;
      break;
    case 'report':
      screen = <ReportScreen code={route.code} />;
      tabs = false;
      break;
    case 'tracking':
      screen = <TrackingScreen />;
      tabs = false;
      break;
  }

  return (
    <>
      <UpdatePrompt />
      {screen}
      {tabs && <TabBar current={route.name} />}
      {/* Las felicitaciones nunca interrumpen una lección */}
      <StreakUp paused={inLesson} onVisible={setStreakShowing} />
      {/* Primero la llama de la racha; después, la felicitación del día */}
      <ChampionCelebration paused={inLesson || streakShowing} />
      <AchievementWatcher paused={inLesson} />
    </>
  );
}
