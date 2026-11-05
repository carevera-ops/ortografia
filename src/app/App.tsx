import { useEffect } from 'react';
import { navigate, useRoute } from './router';
import { installSkipped, requestPersistentStorage, shouldSuggestInstall } from './platform';
import { TabBar } from '../components/TabBar';
import { UpdatePrompt } from '../components/UpdatePrompt';
import { Home } from '../screens/Home';
import { PathMap } from '../screens/PathMap';
import { Lesson } from '../screens/Lesson';
import { Result } from '../screens/Result';
import { Progress } from '../screens/Progress';
import { Theory } from '../screens/Theory';
import { Parents } from '../screens/Parents';
import { InstallHelp } from '../screens/InstallHelp';

export function App() {
  const route = useRoute();

  useEffect(() => {
    void requestPersistentStorage();
    // En Safari sin instalar, mostramos primero la ayuda de instalación.
    if (shouldSuggestInstall() && !installSkipped()) navigate({ name: 'install' }, true);
  }, []);

  // Al cambiar de pantalla, volvemos arriba.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.name]);

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
  }

  return (
    <>
      <UpdatePrompt />
      {screen}
      {tabs && <TabBar current={route.name} />}
    </>
  );
}
