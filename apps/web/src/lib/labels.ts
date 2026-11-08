export const INTEREST_LABELS: Record<string, string> = {
  art: 'Мистецтво',
  history: 'Історія',
  architecture: 'Архітектура',
  nature: 'Природа',
  food: 'Їжа',
  coffee: 'Кава',
  nightlife: 'Нічне життя',
};

export const ACTIVITY_LABELS: Record<string, string> = {
  LOW: 'Спокійний (мало ходити)',
  MEDIUM: 'Помірний',
  HIGH: 'Активний',
};

export const KIND_LABELS: Record<string, string> = {
  SIGHT: 'Пам’ятка',
  LUNCH: 'Обід',
  COFFEE: 'Кава',
};

export const CATEGORY_LABELS: Record<string, string> = {
  CAFE: 'Кафе',
  RESTAURANT: 'Ресторан',
  PHARMACY: 'Аптека',
  BAR: 'Бар',
};

export const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Очікує',
  PROCESSING: 'Генерується',
  COMPLETED: 'Готово',
  FAILED: 'Помилка',
};

export const km = (m: number | null): string => (m === null ? '—' : `${(m / 1000).toFixed(1)} км`);
