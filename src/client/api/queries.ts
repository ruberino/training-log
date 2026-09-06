import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateEntryRequest,
  Entry,
  ExerciseDetail,
  ExerciseSummary,
  UpdateEntryRequest,
  UpdateExerciseRequest,
} from '../../shared/schemas.ts';
import { fetchJson } from './client.ts';

type MeResponse = { authenticated: true };

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => fetchJson<MeResponse>('/api/auth/me'),
    retry: false,
  });
}

export function useExercises(includeArchived = false) {
  return useQuery({
    queryKey: ['exercises', { includeArchived }],
    queryFn: () =>
      fetchJson<ExerciseSummary[]>(
        includeArchived ? '/api/exercises?includeArchived=true' : '/api/exercises',
      ),
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

export function useExercise(id: number) {
  return useQuery({
    queryKey: ['exercise', id],
    queryFn: () => fetchJson<ExerciseDetail>(`/api/exercises/${id}`),
  });
}

export function useUpdateExercise(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateExerciseRequest) =>
      fetchJson<ExerciseSummary>(`/api/exercises/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exercises'] });
      void queryClient.invalidateQueries({ queryKey: ['exercise', id] });
    },
  });
}

export function useUpdateEntry(exerciseId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & UpdateEntryRequest) =>
      fetchJson<Entry>(`/api/entries/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exercises'] });
      void queryClient.invalidateQueries({ queryKey: ['exercise', exerciseId] });
    },
  });
}

export function useDeleteEntry(exerciseId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => fetchJson<void>(`/api/entries/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exercises'] });
      void queryClient.invalidateQueries({ queryKey: ['exercise', exerciseId] });
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
