import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import type { Session } from '@supabase/supabase-js';
import LoginScreen from './Login';
import SignUpScreen from './SignUpScreen';
import MenuScreen from './Menu';
import AddMealScreen from './AddMeal';
import { supabase } from './src/lib/supabase';
import type { RootStackParamList } from './src/navigation';

const Stack = createStackNavigator<RootStackParamList>();

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" /><Text>Loading…</Text></View>;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator key={session?.user.id ?? 'auth'}>
        {session ? (
          <>
            <Stack.Screen name="Menu" component={MenuScreen} options={{ title: 'Menu' }} />
            <Stack.Screen name="AddMeal" component={AddMealScreen} options={{ title: 'Manage meals' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Welcome back' }} />
            <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: 'Create account' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;


const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
});
