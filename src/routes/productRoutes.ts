
import { createHarvest, getHarvests,buyHarvest } from '../controller/productcontroller';
import express, { Router } from 'express';

const productRouter: Router = express.Router();
productRouter.post('/create', createHarvest);
productRouter.get('/', getHarvests);
productRouter.post('/harvests/:id/buy', buyHarvest);

export default productRouter;