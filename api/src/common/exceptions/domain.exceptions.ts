import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

/**
 * Domain-specific exceptions. Business logic throws these meaningful errors
 * instead of raw HTTP exceptions scattered with magic strings, and each maps
 * to the correct HTTP status via the Nest base class it extends. This keeps
 * the TransfersService readable and the HTTP mapping in one obvious place.
 */

export class InsufficientFundsException extends BadRequestException {
  constructor() {
    super('Insufficient treats to complete this transfer.');
  }
}

export class SelfTransferException extends BadRequestException {
  constructor() {
    super('A cat cannot send treats to itself.');
  }
}

export class RecipientNotFoundException extends NotFoundException {
  constructor(catName: string) {
    super(`No cat named "${catName}" was found.`);
  }
}

/** Two *different* transfers submitted with the same idempotency key. */
export class IdempotencyConflictException extends ConflictException {
  constructor() {
    super('This idempotency key was already used for a different transfer.');
  }
}
