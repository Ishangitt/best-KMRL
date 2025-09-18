import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  
  next();
};

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    handleValidationErrors(req, res, next);
  };
};

// Authentication validation rules
export const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'),
  body('first_name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('last_name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phone_number')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  body('date_of_birth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other')
];

export const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Schedule search validation
export const scheduleSearchValidation = [
  query('from_station')
    .notEmpty()
    .isUUID()
    .withMessage('From station ID is required and must be a valid UUID'),
  query('to_station')
    .notEmpty()
    .isUUID()
    .withMessage('To station ID is required and must be a valid UUID'),
  query('date')
    .notEmpty()
    .isISO8601()
    .withMessage('Date is required and must be in ISO format (YYYY-MM-DD)'),
  query('time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:MM format')
];

// Booking validation
export const bookingValidation = [
  body('schedule_id')
    .isUUID()
    .withMessage('Schedule ID must be a valid UUID'),
  body('departure_station')
    .isUUID()
    .withMessage('Departure station ID must be a valid UUID'),
  body('arrival_station')
    .isUUID()
    .withMessage('Arrival station ID must be a valid UUID'),
  body('journey_date')
    .isISO8601()
    .withMessage('Journey date must be in ISO format (YYYY-MM-DD)'),
  body('passengers')
    .isArray({ min: 1, max: 4 })
    .withMessage('Passengers array must contain 1-4 passengers'),
  body('passengers.*.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Passenger name must be between 2 and 100 characters'),
  body('passengers.*.age')
    .isInt({ min: 1, max: 120 })
    .withMessage('Passenger age must be between 1 and 120'),
  body('passengers.*.gender')
    .isIn(['male', 'female', 'other'])
    .withMessage('Passenger gender must be male, female, or other'),
  body('payment_method')
    .optional()
    .isIn(['online', 'card', 'upi', 'wallet'])
    .withMessage('Invalid payment method')
];

// UUID parameter validation
export const uuidParamValidation = (paramName: string) => [
  param(paramName)
    .isUUID()
    .withMessage(`${paramName} must be a valid UUID`)
];

export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Legacy function for backward compatibility
    next();
  };
};
