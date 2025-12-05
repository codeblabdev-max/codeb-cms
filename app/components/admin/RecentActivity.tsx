import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Link } from "@remix-run/react";

interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  timestamp: string;
  status: string;
  meta: string;
}

interface RecentActivityProps {
  title: string;
  items: ActivityItem[];
  viewAllUrl: string;
}

export function RecentActivity({ title, items, viewAllUrl }: RecentActivityProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        <Link 
          to={viewAllUrl}
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
        >
          모두 보기
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-gray-500">최근 활동이 없습니다.</p>
          ) : (
            items.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.subtitle}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">
                      {item.timestamp}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                      {item.status === 'published' ? '발행됨' : 
                       item.status === 'draft' ? '임시저장' :
                       item.status === 'active' ? '활성' : '비활성'}
                    </span>
                  </div>
                  {item.meta && (
                    <p className="text-xs text-gray-400 mt-1">
                      {item.meta}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}