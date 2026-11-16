import { NavLink, Outlet } from 'react-router';

import * as styles from './Layout.module.css';
import { sections } from './sections';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${styles.link} ${styles.active}` : styles.link;

/** Каркас страницы: шапка с разделами и место раздела под ней. */
export function Layout() {
  return (
    <>
      <header className={styles.header}>
        <span className={styles.brand}>FinFlow</span>
        <nav aria-label="Разделы">
          <ul className={styles.nav}>
            {sections.map(({ prefix, title, href }) => (
              <li key={prefix}>
                <NavLink to={href} className={navLinkClass}>
                  {title}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </>
  );
}
