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
import { fetchIsOwner } from './src/lib/menuApi';
import type { RootStackParamList } from './src/navigation';

const Stack = createStackNavigator<RootStackParamList>();

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthLoaded(true);
    }).catch(() => {
      if (mounted) setAuthLoaded(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoaded(true);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!authLoaded) return;
    if (!session) {
      setIsOwner(false);
      setRoleLoaded(true);
      return () => { mounted = false; };
    }

    setRoleLoaded(false);
    fetchIsOwner(session.user.id)
      .then(owner => { if (mounted) setIsOwner(owner); })
      .catch(() => { if (mounted) setIsOwner(false); })
      .finally(() => { if (mounted) setRoleLoaded(true); });

    return () => { mounted = false; };
  }, [authLoaded, session]);

  if (!authLoaded || (session && !roleLoaded)) {
    return <View style={styles.loading}><ActivityIndicator size="large" /><Text>Loading…</Text></View>;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator key={session?.user.id ?? 'auth'}>
        {session ? (
          <>
            <Stack.Screen name="Menu" component={MenuScreen} options={{ title: 'Menu' }} />
            {isOwner && <Stack.Screen name="AddMeal" component={AddMealScreen} options={{ title: 'Manage meals' }} />}
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
