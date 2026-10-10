import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';
import { CartLine, fetchIsOwner, fetchMeals, Meal, placeOrder } from './src/lib/menuApi';
import { supabase } from './src/lib/supabase';

import type { RootStackParamList } from './src/navigation';
type Props = StackScreenProps<RootStackParamList, 'Menu'>;

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function MenuScreen({ navigation }: Props) {
	const [meals, setMeals] = useState<Meal[]>([]);
	const [cart, setCart] = useState<Record<string, CartLine>>({});
	const [isOwner, setIsOwner] = useState(false);
	const [loading, setLoading] = useState(true);
	const [working, setWorking] = useState(false);

	const load = useCallback(async () => {
		try {
			setLoading(true);
			const [{ data: { user } }, mealRows] = await Promise.all([
				supabase.auth.getUser(),
				fetchMeals(),
			]);
			setMeals(mealRows);
			setIsOwner(user ? await fetchIsOwner(user.id) : false);
		} catch (error) {
			Alert.alert('Could not load menu', error instanceof Error ? error.message : 'Please try again.');
		} finally {
			setLoading(false);
		}
	}, []);

	useFocusEffect(useCallback(() => { void load(); }, [load]));

	const addToCart = (meal: Meal) => setCart(current => ({
		...current,
		[meal.id]: { meal, quantity: (current[meal.id]?.quantity ?? 0) + 1 },
	}));

	const changeQuantity = (mealId: string, amount: number) => setCart(current => {
		const line = current[mealId];
		if (!line) return current;
		const quantity = line.quantity + amount;
		if (quantity <= 0) {
			const next = { ...current };
			delete next[mealId];
			return next;
		}
		return { ...current, [mealId]: { ...line, quantity } };
	});

	const lines = Object.values(cart);
	const total = lines.reduce((sum, line) => sum + line.meal.price_cents * line.quantity, 0);

	const checkout = async () => {
		if (!lines.length || working) return;
		try {
			setWorking(true);
			const orderId = await placeOrder(lines);
			setCart({});
			Alert.alert('Order placed', `Your order number is ${orderId.slice(0, 8)}. Payment is not collected in this checkout.`);
		} catch (error) {
			Alert.alert('Checkout failed', error instanceof Error ? error.message : 'Please try again.');
			void load();
		} finally {
			setWorking(false);
		}
	};

	const signOut = async () => {
		const { error } = await supabase.auth.signOut();
		if (error) Alert.alert('Could not sign out', error.message);
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.heading}>Today’s menu</Text>
				<Button title="Sign out" onPress={signOut} />
			</View>
			{isOwner && <Button title="Manage meals" onPress={() => navigation.navigate('AddMeal')} />}
			{loading ? <ActivityIndicator style={styles.loader} size="large" /> : (
				<FlatList
					data={meals}
					keyExtractor={meal => meal.id}
					contentContainerStyle={styles.list}
					ListEmptyComponent={<Text style={styles.muted}>No meals are available right now.</Text>}
					renderItem={({ item }) => (
						<View style={styles.card}>
							{item.image_url ? <Image source={{ uri: item.image_url }} style={styles.image} /> : null}
							<View style={styles.mealDetails}>
								<Text style={styles.mealName}>{item.name}</Text>
								<Text style={styles.course}>{item.course}</Text>
								<Text style={styles.description}>{item.description}</Text>
								<Text style={styles.price}>{money(item.price_cents)}</Text>
							</View>
							{!isOwner && <Button title="Add" onPress={() => addToCart(item)} />}
						</View>
					)}
				/>
			)}
			{!isOwner && (
				<View style={styles.cart}>
					<Text style={styles.cartTitle}>Your order · {money(total)}</Text>
					{lines.map(({ meal, quantity }) => (
						<View style={styles.cartLine} key={meal.id}>
							<Text style={styles.cartName}>{meal.name} · {money(meal.price_cents)}</Text>
							<View style={styles.quantity}>
								<TouchableOpacity onPress={() => changeQuantity(meal.id, -1)}><Text style={styles.quantityButton}>−</Text></TouchableOpacity>
								<Text>{quantity}</Text>
								<TouchableOpacity onPress={() => changeQuantity(meal.id, 1)}><Text style={styles.quantityButton}>+</Text></TouchableOpacity>
							</View>
						</View>
					))}
					<Button title={working ? 'Placing order…' : 'Place order'} onPress={checkout} disabled={!lines.length || working} />
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#f7f5f0' },
	header: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
	heading: { fontSize: 26, fontWeight: '700', color: '#29271f' },
	loader: { marginTop: 32 },
	list: { padding: 16, paddingTop: 4, gap: 12 },
	card: { backgroundColor: 'white', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
	image: { width: 76, height: 76, borderRadius: 10 },
	mealDetails: { flex: 1, gap: 3 },
	mealName: { fontSize: 17, fontWeight: '700', color: '#29271f' },
	course: { color: '#9b6d39', textTransform: 'capitalize', fontSize: 12 },
	description: { color: '#68665e' },
	price: { fontWeight: '700', marginTop: 3 },
	muted: { color: '#68665e', textAlign: 'center', marginTop: 24 },
	cart: { backgroundColor: 'white', borderTopWidth: 1, borderColor: '#e5e1d8', padding: 16, gap: 8 },
	cartTitle: { fontSize: 18, fontWeight: '700', marginBottom: 3 },
	cartLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
	cartName: { flex: 1 },
	quantity: { flexDirection: 'row', gap: 14, alignItems: 'center' },
	quantityButton: { fontSize: 22, color: '#9b6d39', paddingHorizontal: 4 },
});
