import { Request, Response } from 'express';
import { WeatherService } from '../services/weatherService';
import { IPDetailService } from '../services/ipDetailService';

const weatherService = new WeatherService(process.env.OPENWEATHER_API_KEY || '');

export const getWeatherByCoordinates = async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const weatherData = await weatherService.getWeatherByCoordinates(lat, lon);
    res.json(weatherData);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const getWeatherByLocation = async (req: Request, res: Response) => {
  try {
    const location = req.query.location as string;

    if (!location) {
      return res.status(400).json({ error: 'Location is required' });
    }

    const weatherData = await weatherService.getWeatherByLocation(location);
    res.json(weatherData);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const getWeatherByIP = async (req: Request, res: Response) => {
  try {
    console.log('Starting getWeatherByIP request');
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ipString = typeof ip === 'string' ? ip : Array.isArray(ip) ? ip[0] : '';
    
    console.log('Client IP detected:', ipString);
    const ipToUse = ipString.includes('127.0.0.1') || ipString.includes('::1') ? '' : ipString;
    console.log('IP to use for lookup:', ipToUse || 'Using default location');

    try {
      console.log('Fetching IP details...');
      const ipDetails = await IPDetailService.getIPDetails(ipToUse);
      console.log('IP details retrieved:', {
        city: ipDetails.city,
        country: ipDetails.country,
        coordinates: [ipDetails.lat, ipDetails.lon]
      });
      
      try {
        console.log('Fetching weather data for coordinates:', [ipDetails.lat, ipDetails.lon]);
        const weatherData = await weatherService.getWeatherByCoordinates(ipDetails.lat, ipDetails.lon);
        console.log('Weather data retrieved successfully');
        
        res.json({
          ...weatherData,
          ipDetails: {
            city: ipDetails.city,
            country: ipDetails.country,
            district: ipDetails.district
          }
        });
      } catch (weatherError) {
        console.error('Weather service error:', weatherError);
        // Provide fallback weather data instead of failing
        res.json({
          temperature: 20,
          humidity: 50,
          windSpeed: 5,
          rainfall: 0,
          location: 'Unknown',
          ipDetails: {
            city: ipDetails.city,
            country: ipDetails.country,
            district: ipDetails.district
          }
        });
      }
    } catch (ipError) {
      console.error('IP service error:', ipError);
      // Fallback to default weather
      res.json({
        temperature: 20,
        humidity: 50,
        windSpeed: 5,
        rainfall: 0,
        location: 'Unknown Location',
        ipDetails: {
          city: 'Unknown',
          country: 'Unknown',
          district: 'Unknown'
        }
      });
    }
  } catch (error) {
    console.error('Unexpected error in getWeatherByIP:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      fallbackData: {
        temperature: 20,
        humidity: 50,
        windSpeed: 5,
        rainfall: 0,
        location: 'Error Location',
      }
    });
  }
};
