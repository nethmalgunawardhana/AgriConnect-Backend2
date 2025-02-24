import  {getCropSuggestions,getSavedSuggestions} from '../controller/geminicontroller';
import express, { Router } from 'express';



const suggestionRouter: Router = express.Router();
suggestionRouter.get('/:fieldId', getCropSuggestions);
suggestionRouter.get('/:fieldId/saved', getSavedSuggestions);

export default suggestionRouter;
