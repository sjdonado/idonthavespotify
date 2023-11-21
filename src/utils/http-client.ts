import axios from 'axios';

export default class HttpClient {
  static defaultHeaders = {
    'Accept-Encoding': 'gzip',
  };

  static async get(url: string) {
    const { data } = await axios.get(url, { headers: HttpClient.defaultHeaders });

    return data;
  }
}
