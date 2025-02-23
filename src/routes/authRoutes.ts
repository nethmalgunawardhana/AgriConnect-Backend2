import { validateRequest } from '../middleware/auth';
import express, { Router } from 'express';
import { registerFarmer, loginFarmer ,getProfile } from '../controller/authcontroller';
import {verifyToken} from '../middleware/authMiddleware';


const authRouter: Router = express.Router();
authRouter.post('/register', validateRequest, registerFarmer);
authRouter.post('/login', validateRequest, loginFarmer);
authRouter.get('/get', verifyToken,getProfile);

export default authRouter;

