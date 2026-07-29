export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export const fetchUserActivities = async (limit = 10): Promise<ActivityItem[]> => {
  const token = localStorage.getItem('auth_token');
  if (!token) return [];

  try {
    const res = await fetch(`/api/activities?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.activities || [];
  } catch (err) {
    console.error('Error fetching activities:', err);
    return [];
  }
};

export const formatRelativeTime = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 60) return 'Just now';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 30) return `${diffInDays} days ago`;
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
