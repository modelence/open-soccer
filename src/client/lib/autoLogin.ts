import { useEffect, useRef } from 'react';
import { useSession, getConfig, loginWithPassword } from 'modelence/client';

const AUTO_LOGIN_DISABLED_KEY = 'modelence:autoLoginDisabled';

export function useAutoLogin() {
  const { user } = useSession();
  const attemptedRef = useRef(false);

  useEffect(() => {
    const envType = getConfig('_system.env.type') as string | undefined;
    if (envType !== 'sandbox') {
      return;
    }

    if (user || attemptedRef.current) {
      return;
    }
    if (localStorage.getItem(AUTO_LOGIN_DISABLED_KEY)) {
      return;
    }

    const email = getConfig('example.modelenceDemoUsername') as string;
    const password = getConfig('example.modelenceDemoPassword') as string;

    if (email && password) {
      attemptedRef.current = true;
      loginWithPassword({ email, password }).then(() => {
        localStorage.setItem(AUTO_LOGIN_DISABLED_KEY, '1');
      }).catch((error) => {
        console.error('Auto-login failed:', error);
        attemptedRef.current = false; // Allow retry on failure
      });
    }
  }, [user]);
}
