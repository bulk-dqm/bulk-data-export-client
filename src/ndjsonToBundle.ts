import fs from 'fs';
import path from 'path';
import { CollectionBundle } from './types/collectionBundle';

/**
 * Retrieves NDJSON content for a specified resource type.
 * @param dir directory containing downloaded NDJSON
 * @param resourceType resource type for which NDJSON should be returned
 */
export const getNDJSONFromDir = (dir: string, resourceType: string) => {
  const ndjsonFile = path.join(dir, `${resourceType}.ndjson`);
  if (fs.existsSync(ndjsonFile)) {
    const ndjson = fs.readFileSync(ndjsonFile, 'utf8').split('\n');
    const parsedNDJSON = ndjson.map((resource) => {
      return JSON.parse(resource);
    });
    return parsedNDJSON;
  }
  return [];
};

/**
 *
 * @param ndjsonArray
 * @param id
 */
export const filterResourcesById = (resources: fhir4.FhirResource[], id: string) => {
  const filteredResources = resources.filter((resource) => {
    return resource.id === id;
  });
  return filteredResources;
};

/**
 *
 * @param resources
 * @returns
 */
export const mapResourcesToCollectionBundle = (resources: fhir4.FhirResource[]) => {
  const bundle = new CollectionBundle();
  resources.forEach((resource) => {
    bundle.addEntryFromResource(resource);
  });
  return bundle;
};
