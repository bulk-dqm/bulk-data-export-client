import * as jose from 'jose';
import { readFile } from 'fs/promises';
import * as path from 'path';
import * as http from 'http';

export const resolveJWK = (keyLocation: string): Promise<jose.JWK.Key> => {
  if (keyLocation.startsWith('http://') || keyLocation.startsWith('https://')) {
    return loadJWKFromURL(keyLocation);
  } else {
    return loadJWKFromFile(keyLocation);
  }
};

const loadJWKFromFile = async (filename: string): Promise<jose.JWK.Key> => {
  const jwk = await readFile(path.join(process.cwd(), filename), 'utf-8');
  const jwky = jose.JWK.asKey(JSON.parse(jwk));
  jwky.toPEM();
  return jwky;
};


const loadJWKFromURL = async (url: string): Promise<jose.JWK.Key> => {
  const promise = new Promise<jose.JWK.Key>((resolve) => {
    http.get(url, (res) => {
      res.setEncoding('utf8');
      let rawData = '';
      res.on('data', (chunk) => {
        rawData += chunk;
      });
      res.on('end', () => {
        resolve(jose.JWK.asKey(JSON.parse(rawData)));
      });
    });
  });
  return promise;
};
