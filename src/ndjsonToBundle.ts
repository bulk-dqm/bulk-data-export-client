import fs from 'fs';
import path from 'path';
import { CollectionBundle } from './types/collectionBundle';
import * as patientRefs from './compartment-definition/patient-attribute-paths.json';

/**
 * Retrieves NDJSON content for a specified resource type from a given directory.
 * @param dir directory containing downloaded NDJSON
 * @param resourceType resource type to retrieve NDJSON for
 */
export const getNDJSONFromDir = (dir: string, resourceType: string): fhir4.FhirResource[] => {
  const ndjsonFile = path.join(dir, `${resourceType}.ndjson`);
  if (fs.existsSync(ndjsonFile)) {
    const ndjson = fs.readFileSync(ndjsonFile, 'utf8').split('\n');
    const parsedNDJSON = ndjson.map((resource) => {
      return JSON.parse(resource) as fhir4.FhirResource;
    });
    return parsedNDJSON;
  }
  return [];
};

/**
 * Creates FHIR collection bundle from given FHIR resources.
 * @param resources array of resources to include in the constructed bundle
 * @returns FHIR collection bundle
 */
export const mapResourcesToCollectionBundle = (resources: fhir4.FhirResource[]): CollectionBundle => {
  const bundle = new CollectionBundle();
  resources.forEach((resource) => {
    bundle.addEntryFromResource(resource);
  });
  return bundle;
};

/**
 * For a given FHIR Patient, filters all downloaded resources to those that reference the
 * patient, using the patient compartment definition as a reference map. Creates FHIR
 * patient collection bundle from the filtered resources.
 * @param patientResource FHIR Patient to use for resource filtering and bundle construction
 * @param dir directory containing downloaded NDJSON
 * @returns FHIR collection bundle for the given patient
 */
export const assemblePatientBundle = (patientResource: fhir4.Patient, dir: string): CollectionBundle => {
  const patientId = patientResource.id;
  const bundleResources: fhir4.FhirResource[] = [];

  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    // get resource type from the file name, assuming <resourceType>.ndjson format
    const resourceType = file.slice(0, -7);
    const resources = getNDJSONFromDir(dir, resourceType);
    // get all resources from the file that reference the patient
    const filteredResources = (resources as any[]).filter((res) => {
      // check whether resource references patient with valid reference key, which
      // requires checking all possible reference keys
      const definedReference = (patientRefs as any)[resourceType].filter((refKey: string) => {
        return res[refKey] && res[refKey].reference;
      });
      return res[definedReference?.[0]]?.reference === `Patient/${patientId}`;
    }) as fhir4.FhirResource[];
    bundleResources.push(...filteredResources);
  });
  bundleResources.push(patientResource);
  return mapResourcesToCollectionBundle(bundleResources);
};
