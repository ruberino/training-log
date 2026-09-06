import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateEntryRequest, Entry, ExerciseSummary } from '../../shared/schemas.ts';
import { fetchJson } from './client.ts';

type MeResponse = { authenticated: true };

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => fetchJson<MeResponse>('/api/auth/me'),
    retry: false,
  });
}

export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: () => fetchJson<ExerciseSummary[]>('/api/exercises'),
  });
}

export function useCreateExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { name: string; metric?: 'weight' | 'reps' }) =>
      fetchJson<ExerciseSummary>('/api/exercises', {
        method: 'POST',
        body: JSON.stringify({ metric: 'weight', ...body }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });
}

export function useCreateEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateEntryRequest) =>
      fetchJson<Entry>('/api/entries', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (_entry, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['exercises'] });
      void queryClient.invalidateQueries({ queryKey: ['exercise', variables.exerciseId] });
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (password: string) =>
      fetchJson<void>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => fetchJson<void>('/api/auth/logout', { method: 'POST' }),
    onSettled: () => {
      // A 401 here means the cookie was already invalid: logged out either way.
      queryClient.clear();
    },
  });
}
