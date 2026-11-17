import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export interface RequestWithContext extends Request {
  requestId?: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
  public readonly operational = true;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class RevisionConflictError extends AppError {
  constructor(currentRevision: number, serverRecord: unknown) {
    super(
      409,
      'REVISION_CONFLICT',
      `Data proyek telah diubah di tempat lain (revisi server saat ini: ${currentRevision}). Muat ulang atau konfirmasi timpa.`,
      { currentRevision, serverRecord }
    );
    this.name = 'RevisionConflictError';
  }
}

export class StorageUnavailableError extends AppError {
  constructor(code: string, message: string) {
    super(503, code, message);
    this.name = 'StorageUnavailableError';
  }
}

export function requestIdMiddleware(
  req: RequestWithContext,
  res: Response,
  next: NextFunction
): void {
  const incoming = req.headers['x-request-id'];
  const requestId =
    typeof incoming === 'string' && /^[a-zA-Z0-9._-]{8,64}$/.test(incoming.trim())
      ? incoming.trim()
      : crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

export function asyncHandler<TReq extends Request = Request>(
  fn: (req: TReq, res: Response, next: NextFunction) => unknown | Promise<unknown>
) {
  return (req: TReq, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function centralErrorHandler(
  err: unknown,
  req: RequestWithContext,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.requestId || crypto.randomUUID();

  if (res.headersSent) {
    return;
  }

  // Malformed JSON request body from express.json()
  if (
    err instanceof SyntaxError &&
    'status' in err &&
    (err as unknown as { status?: number }).status === 400
  ) {
    res.status(400).json({
      error: 'Format JSON pada request body tidak valid.',
      code: 'INVALID_JSON',
      requestId,
    });
    return;
  }

  if (
    typeof err === 'object' &&
    err !== null &&
    (err as { type?: string }).type === 'entity.too.large'
  ) {
    res.status(413).json({
      error: 'Ukuran payload melebihi batas maksimal server.',
      code: 'PAYLOAD_TOO_LARGE',
      requestId,
    });
    return;
  }

  if (err instanceof AppError) {
    const payload: Record<string, unknown> = {
      error: err.message,
      code: err.code,
      requestId,
    };
    if (err.details) {
      Object.assign(payload, err.details);
    }
    res.status(err.statusCode).json(payload);
    return;
  }

  const errName = err instanceof Error ? err.name : 'UnknownError';
  const errMsg = err instanceof Error ? err.message : String(err);
  console.error(
    `[ERROR] requestId=${requestId} method=${req.method} path=${req.path} name=${errName} msg=${errMsg}`
  );

  res.status(500).json({
    error: 'Terjadi kesalahan internal pada server.',
    code: 'INTERNAL_ERROR',
    requestId,
  });
}

let processHandlersRegistered = false;

export function registerProcessErrorGuards(): void {
  if (processHandlersRegistered) return;
  processHandlersRegistered = true;

  process.on('unhandledRejection', (reason) => {
    const msg = reason instanceof Error ? reason.message : String(reason);
    console.error(`[PROCESS] Unhandled Rejection: ${msg}`);
  });

  process.on('uncaughtException', (err) => {
    console.error(`[PROCESS] Uncaught Exception (${err.name}): ${err.message}`);
  });
}
