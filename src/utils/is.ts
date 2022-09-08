import { AxiosError } from 'axios'

// eslint-disable-next-line
export function isAxiosError(e: any): e is AxiosError {
  if (e.isAxiosError) {
    return e
  }
  return e
}
