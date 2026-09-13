import { BadRequestException } from '@nestjs/common';

/**
 * For `.catch()` on a write guarded by a unique index. The index is the real
 * guard — a pre-check would race a concurrent write — so its violation is
 * translated into a 400 here and anything else is rethrown untouched.
 */
export function onDuplicate(message: string) {
  return (err: unknown): never => {
    if ((err as { code?: number } | null)?.code === 11000) {
      throw new BadRequestException(message);
    }
    throw err;
  };
}
