import WidgetApp from '@/components/WidgetApp';
import { AuthProvider } from '@/lib/auth-store';

export default function Home() {
  return (
    <AuthProvider>
      <WidgetApp />
    </AuthProvider>
  );
}