import { requireSupabaseConfig, supabase } from './supabase';

export type Meal = {
  id: string;
  name: string;
  description: string;
  course: 'starter' | 'main' | 'dessert';
  price_cents: number;
  image_url: string | null;
  is_available: boolean;
};

export type CartLine = { meal: Meal; quantity: number };

export async function fetchMeals() {
  requireSupabaseConfig();
  const { data, error } = await supabase
    .from('meals')
    .select('id, name, description, course, price_cents, image_url, is_available')
    .eq('is_available', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Meal[];
}

export async function fetchIsOwner(userId: string) {
  requireSupabaseConfig();
  const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).single();
  if (error) throw error;
  return data.role === 'owner';
}

export async function createMeal(input: {
  name: string;
  description: string;
  course: Meal['course'];
  price_cents: number;
  image_url: string | null;
  created_by: string;
}) {
  requireSupabaseConfig();
  const { error } = await supabase.from('meals').insert(input);
  if (error) throw error;
}

export async function removeMeal(mealId: string) {
  requireSupabaseConfig();
  const { error } = await supabase.from('meals').delete().eq('id', mealId);
  if (error) throw error;
}

export async function placeOrder(lines: CartLine[]) {
  requireSupabaseConfig();
  const { data, error } = await supabase.rpc('place_order', {
    items: lines.map(({ meal, quantity }) => ({ meal_id: meal.id, quantity })),
  });
  if (error) throw error;
  return data as string;
}
