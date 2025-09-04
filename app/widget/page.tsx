import WidgetApp from '@/components/WidgetApp';

interface PageProps {
  searchParams: {
    sessionType?: 'intro' | 'architect';
    skipIntro?: string;
  };
}

export default function WidgetPage({ searchParams }: PageProps) {
  const skipIntro = searchParams.skipIntro !== 'false'; // Default to true
  const sessionType = searchParams.sessionType || 'architect'; // Default to architect

  return (
    <WidgetApp 
      defaultSessionType={sessionType}
      skipIntro={skipIntro}
    />
  );
}