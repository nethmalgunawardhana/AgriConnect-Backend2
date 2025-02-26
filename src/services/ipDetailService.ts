import axios from 'axios';

export interface IPDetails {
  country: string;
  city: string;
  district: string;
  lat: number;
  lon: number;
}

export class IPDetailService {
  public static async getIPDetails(ip: string): Promise<IPDetails> {
    try {
      console.log('Getting IP details for:', ip || 'default location');

      // If no IP is provided or it's a local IP, use a fallback method
      if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.')) {
        console.log('Using ipapi.co service for IP lookup');
        const response = await axios.get('https://ipapi.co/json/', { timeout: 3000 });
        console.log('ipapi.co service responded successfully');

        return {
          country: response.data.country_name,
          city: response.data.city,
          district: response.data.region,
          lat: response.data.latitude,
          lon: response.data.longitude
        };
      } else {
        console.log('Using ip-api.com for IP lookup with IP:', ip);
        const response = await axios.get(
          `http://ip-api.com/json/${ip}?fields=524497`,
          { timeout: 3000 }
        );
        console.log('ip-api.com service responded successfully');

        return {
          country: response.data.country,
          city: response.data.city,
          district: response.data.regionName,
          lat: response.data.lat,
          lon: response.data.lon
        };
      }
    } catch (error) {
      console.error('Failed to retrieve IP details:', error);
      throw new Error('Unable to fetch IP details.');
    }
  }
}
