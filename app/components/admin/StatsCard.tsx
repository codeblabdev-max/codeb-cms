import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: ReactNode;
  color: string;
}

export function StatsCard({ title, value, change, icon, color }: StatsCardProps) {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue': return 'text-blue-600';
      case 'green': return 'text-green-600';
      case 'purple': return 'text-purple-600';
      case 'orange': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={getColorClasses(color)}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <p className={`text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? '+' : ''}{change.toFixed(1)}% 지난달 대비
          </p>
        )}
      </CardContent>
    </Card>
  );
}