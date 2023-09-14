import fs from 'fs';
import path from 'path';
import { CollectionBundle } from './types/collectionBundle';
import * as patientRefs from './compartment-definition/patient-attribute-paths.json';

/**
 * Retrieves NDJSON content for a given file from a given directory.
 * @param dir directory containing downloaded NDJSON
 * @param file file name containing the resources to convert to NDJSON
 */
export const getNDJSONFromDir = (dir: string, file: string): fhir4.FhirResource[] => {
  if (fs.existsSync(path.join(dir, file))) {
    const ndjson = fs.readFileSync(path.join(dir, file), 'utf8').split('\n');
    const parsedNDJSON = ndjson.map((resource) => {
      return JSON.parse(resource) as fhir4.FhirResource;
    });
    return parsedNDJSON;
  }
  return [];
};

/**
 * Loops over all files in a given directory to infer which files contain Patient resources
 * @param dir directory containing downloaded NDJSON
 * @returns array of file names for files containing Patient resources
 */
export const findPatientFiles = (dir: string): string[] => {
  const files = fs.readdirSync(dir).filter((f) => f !== 'log.ndjson' && f.slice(-7) === '.ndjson');
  const patientFiles = [];
  for (const file of files) {
    const fileContent = fs.readFileSync(path.join(dir, file), 'utf-8').split('\n');
    const firstResource = JSON.parse(fileContent[0]) as fhir4.FhirResource;
    if (firstResource.resourceType === 'Patient') {
      patientFiles.push(file);
    }
  }
  if (patientFiles.length === 0) {
    throw new Error('No files containing patient data were found in the directory.');
  }
  return patientFiles;
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

  const files = fs.readdirSync(dir).filter((f) => f !== 'log.ndjson' && f.slice(-7) === '.ndjson');
  files.forEach((file) => {
    // get resource type from the file name (assumes <resourceType>.ndjson or 1.<resourceType>.ndjson format)
    const resources = getNDJSONFromDir(dir, file);
    // infer the resource type from the first resource extracted from the file
    const resourceType = resources[0].resourceType;
    // get all resources from the file that reference the patient
    const filteredResources = (resources as any[])?.filter((res) => {
      // check whether resource references patient with valid reference key, which
      // requires checking all possible reference keys
      const definedReference = (patientRefs as any)[resourceType]?.filter((refKey: string) => {
        return res[refKey] && res[refKey].reference;
      });
      return res[definedReference?.[0]]?.reference === `Patient/${patientId}`;
    }) as fhir4.FhirResource[];
    bundleResources.push(...filteredResources);
  });
  bundleResources.push(patientResource);
  return mapResourcesToCollectionBundle(bundleResources);
};
