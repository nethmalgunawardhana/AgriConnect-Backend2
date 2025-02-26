import axios from 'axios';

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  rainfall: number;
  isRaining: boolean;
  location: string;
  weatherCondition: string;
  weatherIcon: string;
}

export class WeatherService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    
    if (!apiKey || apiKey.length <= 5) {
      throw new Error('WeatherService requires a valid API key');
    }
  }

  public async getWeatherByCoordinates(lat: number, lon: number): Promise<WeatherData> {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`;
      console.log('Fetching weather from OpenWeather API...');
      
      const response = await axios.get(url, { timeout: 5000 });
      console.log('OpenWeather API response received:', response.status);
      
      const data = response.data;
      const rainData = this.extractRainfall(data);
      
      return {
        temperature: data.main.temp,
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
        rainfall: rainData.amount,
        isRaining: rainData.isRaining,
        location: data.name,
        weatherCondition: data.weather[0].description,
        weatherIcon: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`
      };
    } catch (error) {
      console.error('OpenWeather API error:', error);
      throw error;
    }
  }

  public async getWeatherByLocation(locationName: string): Promise<WeatherData> {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(locationName)}&appid=${this.apiKey}&units=metric`;
      console.log('Fetching weather for location:', locationName);
      
      const response = await axios.get(url, { timeout: 5000 });
      console.log('OpenWeather API response received:', response.status);
      
      const data = response.data;
      const rainData = this.extractRainfall(data);
      
      return {
        temperature: data.main.temp,
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
        rainfall: rainData.amount,
        isRaining: rainData.isRaining,
        location: data.name,
        weatherCondition: data.weather[0].description,
        weatherIcon: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`
      };
    } catch (error) {
      console.error('OpenWeather API error for location:', locationName, error);
      throw error;
    }
  }

  public async getCurrentDetailedWeather(lat: number, lon: number): Promise<WeatherData & { 
    feelsLike: number, 
    pressure: number, 
    visibility: number,
    sunrise: Date,
    sunset: Date,
    windDirection: number,
    cloudiness: number
  }> {
    try {
      // If you have access to the One Call API (paid plan)
      const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,daily,alerts&appid=${this.apiKey}&units=metric`;
      console.log('Fetching detailed weather data...');
      
      const response = await axios.get(url, { timeout: 5000 });
      console.log('OpenWeather One Call API response received:', response.status);
      
      const data = response.data;
      const current = data.current;
      const rainData = { 
        amount: current.rain ? (current.rain['1h'] || 0) : 0,
        isRaining: current.weather[0].id >= 200 && current.weather[0].id < 600
      };
      
      return {
        temperature: current.temp,
        feelsLike: current.feels_like,
        humidity: current.humidity,
        pressure: current.pressure,
        windSpeed: current.wind_speed,
        windDirection: current.wind_deg,
        rainfall: rainData.amount,
        isRaining: rainData.isRaining,
        visibility: current.visibility / 1000, // Convert to km
        cloudiness: current.clouds,
        sunrise: new Date(current.sunrise * 1000),
        sunset: new Date(current.sunset * 1000),
        location: data.timezone.split('/').pop().replace('_', ' '),
        weatherCondition: current.weather[0].description,
        weatherIcon: `https://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png`
      };
    } catch (error) {
      console.error('OpenWeather One Call API error:', error);
      
      // Fall back to standard API if One Call fails
      console.log('Falling back to standard weather API...');
      const basicWeather = await this.getWeatherByCoordinates(lat, lon);
      
      // Return basic weather with placeholder values for detailed fields
      return {
        ...basicWeather,
        feelsLike: basicWeather.temperature,
        pressure: 1013, // Standard atmospheric pressure
        visibility: 10, // Default 10km
        sunrise: new Date(),
        sunset: new Date(Date.now() + 12 * 3600 * 1000),
        windDirection: 0,
        cloudiness: 0
      };
    }
  }
  
  public async getHourlyForecast(lat: number, lon: number, hours: number = 24): Promise<Array<WeatherData & { time: Date }>> {
    try {
      const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`;
      console.log('Fetching hourly forecast...');
      
      const response = await axios.get(url, { timeout: 5000 });
      console.log('OpenWeather forecast API response received:', response.status);
      
      const data = response.data;
      const location = data.city.name;
      
      // The API returns forecasts in 3-hour intervals, limit to requested hours
      const forecasts = data.list.slice(0, Math.ceil(hours / 3))
        .map((item: any) => {
          const rainData = { 
            amount: item.rain ? (item.rain['3h'] || 0) / 3 : 0, // Convert to hourly rate
            isRaining: item.weather[0].id >= 200 && item.weather[0].id < 600
          };
          
          return {
            time: new Date(item.dt * 1000),
            temperature: item.main.temp,
            humidity: item.main.humidity,
            windSpeed: item.wind.speed,
            rainfall: rainData.amount,
            isRaining: rainData.isRaining,
            location: location,
            weatherCondition: item.weather[0].description,
            weatherIcon: `https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png`
          };
        });
      
      return forecasts;
    } catch (error) {
      console.error('OpenWeather forecast API error:', error);
      throw error;
    }
  }
  
  private extractRainfall(data: any): { amount: number, isRaining: boolean } {
    // Check if it's currently raining based on weather condition code
    const weatherId = data.weather && data.weather[0] ? data.weather[0].id : 0;
    const isRaining = weatherId >= 200 && weatherId < 600;
    
    // Get rainfall amount
    let amount = 0;
    if (data.rain) {
      if (data.rain['1h'] !== undefined) {
        amount = Number(data.rain['1h']);
      } else if (data.rain['3h'] !== undefined) {
        amount = Number(data.rain['3h']) / 3; // Convert to hourly rate
      } else if (typeof data.rain === 'number') {
        amount = Number(data.rain);
      }
    } else if (data.precipitation && typeof data.precipitation === 'number') {
      amount = Number(data.precipitation);
    }
    
    // If it's raining according to the condition but no rainfall amount is given,
    // set a minimum value to indicate at least some rain
    if (isRaining && amount === 0) {
      amount = 0.1; // Minimal rainfall
    }
    
    return { amount, isRaining };
  }
}