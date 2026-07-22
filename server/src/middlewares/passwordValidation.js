// passwordValidation.js
import { body, validationResult } from 'express-validator';

const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

export const validatePassword = (field = 'password') => [
  body(field)
    .matches(passwordRegex)
    .withMessage('Password must be 8+ characters with 1 uppercase letter and 1 number.'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];