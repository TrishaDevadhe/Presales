import './globals.css';
import { AppProvider } from '@/context/AppContext';

export const metadata = {
  title: 'GravitySales - Presales Management System',
  description: 'Enterprise dashboard for tracking opportunities, effort logs, revisions, and resource capacity.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
