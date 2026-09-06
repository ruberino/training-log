import { ApiRequestError } from '../api/client.ts';

export function apiErrorMessage(error: unknown): string {
  return error instanceof ApiRequestError ? error.message : 'Noe gikk galt';
}
