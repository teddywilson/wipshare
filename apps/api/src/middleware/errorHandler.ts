import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export interface APIError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  error: APIError | Prisma.PrismaClientKnownRequestError,
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  console.error(`Error ${req.method} ${req.path}:`, error);

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': // Unique constraint violation
        const field = error.meta?.target as string[] | undefined;
        return res.status(409).json({
          error: 'Duplicate entry',
          message: `${field?.[0] || 'Field'} already exists`,
        });
      
      case 'P2025': // Record not found
        return res.status(404).json({
          error: 'Not found',
          message: 'The requested resource was not found',
        });
      
      case 'P2003': // Foreign key constraint violation
        return res.status(400).json({
          error: 'Invalid reference',
          message: 'Referenced resource does not exist',
        });
      
      default:
        return res.status(500).json({
          error: 'Database error',
          message: 'An unexpected database error occurred',
        });
    }
  }

  // Validation errors (from Joi)
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      message: error.message,
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'Please provide a valid authentication token',
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      message: 'Your session has expired. Please log in again',
    });
  }

  // Custom API errors
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal server error' : 'Request failed',
    message: statusCode === 500 ? 'An unexpected error occurred' : message,
  });
};