import React, { useEffect, useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import type { StackScreenProps } from '@react-navigation/stack';
import { createMeal } from './src/lib/menuApi';
import { supabase } from './src/lib/supabase';

import type { RootStackParamList } from './src/navigation';
type Props = StackScreenProps<RootStackParamList, 'AddMeal'>;

export default function AddMealScreen({ navigation }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [course, setCourse] = useState<'starter' | 'main' | 'dessert'>('main');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkOwner = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (error) throw error;
        if (data.role !== 'owner') {
          Alert.alert('Owner access required', 'Only approved owner accounts can manage menu items.');
          navigation.goBack();
          return;
        }
        if (mounted) {
          setUserId(user.id);
          setAuthorized(true);
        }
      } catch (error) {
        Alert.alert('Could not verify access', error instanceof Error ? error.message : 'Please try again.');
        navigation.goBack();
      }
    };
    void checkOwner();
    return () => { mounted = false; };
  }, [navigation]);

  const addMeal = async () => {
    const parsedPrice = Number(price);
    if (!name.trim() || !description.trim() || !price.trim() || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
      Alert.alert('Check the form', 'Enter a name, description, and valid non-negative price.');
      return;
    }
    if (!userId || !authorized) {
      Alert.alert('Not authorized', 'Only an approved owner account can add menu items.');
      return;
    }
    try {
      setSaving(true);
      await createMeal({
        name: name.trim(),
        description: description.trim(),
        course,
        price_cents: Math.round(parsedPrice * 100),
        image_url: imageUrl.trim() || null,
        created_by: userId,
      });
      Alert.alert('Meal added', `${name.trim()} is now on the menu.`);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could not add meal', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Add a meal</Text>
      <Text style={styles.hint}>Prices are entered in dollars. Only approved owner accounts can publish meals.</Text>
      <TextInput style={styles.input} placeholder="Meal name" value={name} onChangeText={setName} />
      <TextInput style={[styles.input, styles.multiline]} placeholder="Description" value={description} onChangeText={setDescription} multiline />
      <Text style={styles.label}>Course</Text>
      <Picker selectedValue={course} onValueChange={value => setCourse(value)} style={styles.picker}>
        <Picker.Item label="Starter" value="starter" />
        <Picker.Item label="Main" value="main" />
        <Picker.Item label="Dessert" value="dessert" />
      </Picker>
      <TextInput style={styles.input} placeholder="Price (e.g. 12.50)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
      <TextInput style={styles.input} placeholder="Image URL (optional)" value={imageUrl} onChangeText={setImageUrl} autoCapitalize="none" keyboardType="url" />
      <Button title={saving ? 'Saving…' : 'Publish meal'} onPress={addMeal} disabled={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f7f5f0', padding: 20, gap: 12 },
  title: { fontSize: 26, fontWeight: '700', color: '#29271f' },
  hint: { color: '#68665e', marginBottom: 4 },
  input: { backgroundColor: 'white', borderColor: '#d8d3c8', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  label: { fontWeight: '600', marginBottom: -10 },
  picker: { backgroundColor: 'white' },
});
