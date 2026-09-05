type CategoryType = 'income' | 'expense';

interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon?: string;
}
