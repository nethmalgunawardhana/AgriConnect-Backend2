import express, { Router } from 'express';
import { createField, getFields } from '../controller/fieldcontroller';

const fieldRouter: Router = express.Router();
fieldRouter.post('/create', createField);
fieldRouter.get('/', getFields);

export default fieldRouter;
