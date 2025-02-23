const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

module.exports = {
  genAI: new GoogleGenerativeAI(process.env.GEMINI_API_KEY),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY
};