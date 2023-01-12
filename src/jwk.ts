import * as jose from 'node-jose';
import { readFile } from 'fs/promises';
import * as path from 'path';

export const resolveJWK = async (keyLocation: string): Promise<jose.JWK.Key> => {
  const jwk = await readFile(path.join(process.cwd(), keyLocation), 'utf-8');
  const jwk_key = jose.JWK.asKey(jwk, 'json');
  return jwk_key;
};
