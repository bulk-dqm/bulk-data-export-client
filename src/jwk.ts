import * as jose from 'jose';
import { readFile } from 'fs/promises';
import * as path from 'path';
import * as http from 'http';

export const resolveJWK = async (keyLocation: string): Promise<jose.JWK.Key> => {
  const jwk = await readFile(path.join(process.cwd(), keyLocation), 'utf-8');
  const jwk_key = jose.JWK.asKey(JSON.parse(jwk));
  jwk_key.toPEM();
  return jwk_key;
};

