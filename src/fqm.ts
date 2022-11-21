import { readFile } from 'fs/promises';
import * as path from 'path';

export const loadCMS122 = async (): Promise<any> => {
  const data = await readFile(path.join(__dirname, 'measures', 'DiabetesHemoglobinA1cHbA1cPoorControl9FHIR-bundle.json'), 'utf8')

  return JSON.parse(data);
}

