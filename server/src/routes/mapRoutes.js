import express from 'express';
import { addressAutocomplete } from '../controllers/mapController.js';

const router = express.Router();

router.get('/address-autocomplete', addressAutocomplete);

export default router;