import { useEffect } from 'react';
import { logout } from 'modelence/client';

export default function LogoutPage() {
  useEffect(() => {
    logout().then(() => {
      window.location.href = '/login';
    });
  }, []);

  return null;
}

