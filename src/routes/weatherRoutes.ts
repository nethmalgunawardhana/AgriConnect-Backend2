// src/routes/weatherRoutes.ts
import express, { Router } from 'express';
import { getWeatherByCoordinates, getWeatherByIP,getWeatherByLocation } from '../controller/weatherController';

const weatherRouter: Router = express.Router();

weatherRouter.get('/coordinates', getWeatherByCoordinates);
weatherRouter.get('/location', getWeatherByLocation);
weatherRouter.get('/current', getWeatherByIP);

export default weatherRouter;
