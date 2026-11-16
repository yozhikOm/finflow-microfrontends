import { useLocation } from 'react-router';

/** Заглушка `./App` remote-приложения: показывает, какой адрес получила. */
export default function RemoteAppStub() {
  const { pathname } = useLocation();
  return <p>remote-приложение на {pathname}</p>;
}
