import React, { useState } from 'react';
import { Alert, View, Text, TextInput, Button, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { requireSupabaseConfig, supabase } from './src/lib/supabase';

type SignUpFormData = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  requestedRole: 'customer' | 'owner';
};

const signUpSchema = yup.object().shape({
  name: yup.string().required('Name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
  requestedRole: yup.mixed<'customer' | 'owner'>().oneOf(['customer', 'owner']).required(),
});

const SignUpScreen = ({ navigation }: any) => {
  const { control, handleSubmit, formState: { errors } } = useForm<SignUpFormData>({
    resolver: yupResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', requestedRole: 'customer' },
  });
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (formData: SignUpFormData) => {
    try {
      setSubmitting(true);
      requireSupabaseConfig();
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { full_name: formData.name, requested_role: formData.requestedRole } },
      });
      if (error) throw error;
      if (!signUpData.session) {
        navigation.navigate('ConfirmEmail', { email: signUpData.user?.email ?? formData.email });
      }
    } catch (error) {
      Alert.alert('Could not create account', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      
      <Text style={styles.title}>Sign Up</Text>

    <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
          />
        )}
      />
      {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            placeholder="Email"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
          />
        )}
      />
      {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}

      <Text style={styles.roleLabel}>I want to use this app as:</Text>
      <Controller
        control={control}
        name="requestedRole"
        render={({ field: { onChange, value } }) => (
          <Picker selectedValue={value} onValueChange={onChange} style={styles.picker}>
            <Picker.Item label="Customer — browse and order meals" value="customer" />
            <Picker.Item label="Owner — request menu management access" value="owner" />
          </Picker>
        )}
      />
      <Text style={styles.roleHint}>Owner access is granted only after administrator approval.</Text>

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
          />
        )}
      />
      {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            secureTextEntry
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
          />
        )}
      />
      {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>}

      <TouchableOpacity>
        <Button title={submitting ? 'Creating account…' : 'Sign Up'} onPress={handleSubmit(onSubmit)} disabled={submitting} />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.switchText}>Already have an account? Login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container2: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#E6E6FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#E6E6FA',
  },
  contentContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  title: {
    fontSize: 24,
    textShadowColor: 'grey',
    color: '#26243a',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: 'black',
    padding: 10,
    marginBottom: 10,
    borderRadius: 25,
  },
  roleLabel: {
    alignSelf: 'center',
    marginTop: 6,
    fontWeight: '600',
    color: '#26243a',
  },
  picker: {
    width: '50%',
    marginBottom:10,
  },
  roleHint: {
    marginTop: 1,
    color: '#4b4960',
    textAlign: 'center',
    marginBottom: 19,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  switchText: {
    marginTop: 20,
    textAlign: 'center',
    color: '#007bff',
  },
});

export default SignUpScreen;

