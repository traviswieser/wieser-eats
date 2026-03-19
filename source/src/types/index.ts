export interface PantryItem {
  id: string;
  name: string;
  quantity: string;
  category: string;
}

export interface MacroInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  cookTime: string;
  difficulty: string;
  mealType: string;
  cuisine: string;
  cookingMethod: string;
  servings: number;
  spiceLevel: string;
  macros: MacroInfo;
  kidFriendly: boolean;
}

export interface MealPlanEntry {
  id: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipe: Recipe;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  checked: boolean;
  category: string;
}

export type AIProvider = 'grok' | 'gemini' | 'claude' | 'openai';

export interface AIKeyEntry {
  provider: AIProvider;
  key: string;
  label: string;
}

export interface UserSettings {
  theme: 'dark' | 'light';
  allergies: string[];
  dietType: string;
  defaultServings: number;
  kidFriendly: boolean;
  aiKeys: AIKeyEntry[];
  activeAIProvider: AIProvider | null;
  aiImageGen: boolean;
  pexelsKey: string;
}

export interface AIFilters {
  mealType: string;
  cookTime: string;
  difficulty: string;
  cuisine: string;
  cookingMethod: string;
  servings: number;
  spiceLevel: string;
}

export type PageName = 'chef' | 'pantry' | 'mealplan' | 'shopping' | 'favorites' | 'settings' | 'updates';

export interface RecipeHistory {
  recipes: Recipe[];
  timestamp: number;
}
