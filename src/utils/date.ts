export function formatMessageTime(timestamp: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatFriendlyDate(timestamp: number): string {
  if (!timestamp) return '';
  const now = new Date();
  const date = new Date(timestamp);

  const isToday = now.toDateString() === date.toDateString();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = yesterday.toDateString() === date.toDateString();

  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (isToday) {
    return `Today, ${timeStr}`;
  }
  if (isYesterday) {
    return `Yesterday, ${timeStr}`;
  }

  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    const weekday = date.toLocaleDateString([], { weekday: 'short' });
    return `${weekday}, ${timeStr}`;
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function groupSessionsByDate<T extends { updatedAt: number }>(items: T[]): Record<string, T[]> {
  const groups: Record<string, T[]> = {
    'Today': [],
    'Yesterday': [],
    'Previous 7 Days': [],
    'Earlier': []
  };

  const now = new Date();
  const todayStr = now.toDateString();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);

  items.forEach(item => {
    const itemDate = new Date(item.updatedAt || Date.now());
    const itemDateStr = itemDate.toDateString();

    if (itemDateStr === todayStr) {
      groups['Today'].push(item);
    } else if (itemDateStr === yesterdayStr) {
      groups['Yesterday'].push(item);
    } else if (itemDate > sevenDaysAgo) {
      groups['Previous 7 Days'].push(item);
    } else {
      groups['Earlier'].push(item);
    }
  });

  return groups;
}
