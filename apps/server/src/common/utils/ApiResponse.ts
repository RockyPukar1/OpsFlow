import { Response } from "express";

export class ApiResponse<T = unknown> {
  constructor(
    public success: boolean,
    public statusCode: number,
    public message?: string,
    public data?: T,
    public meta?: Record<string, unknown>,
  ) {}

  toJSON() {
    return {
      success: this.success,
      ...(this.message && { message: this.message }),
      ...(this.data && { data: this.data }),
      ...(this.meta && { meta: this.meta }),
    };
  }

  send(res: Response) {
    return res.status(this.statusCode).json(this.toJSON());
  }
}

export class ApiSuccess<T = unknown> extends ApiResponse<T> {
  constructor(
    data?: T,
    message?: string,
    statusCode = 200,
    meta?: Record<string, unknown>,
  ) {
    super(true, statusCode, message, data, meta);
  }
}

export class ApiError extends ApiResponse {
  constructor(message: string, statusCode = 500, data?: unknown) {
    super(false, statusCode, message, data);
  }
}
