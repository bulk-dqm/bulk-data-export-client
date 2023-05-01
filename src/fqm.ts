import { readFile, readdir } from 'fs/promises';
import { Calculator, CalculatorTypes } from 'fqm-execution';
import { DataRequirementsQuery } from './types/DataRequirementsQuery';
import * as path from 'path';

export const loadBundleFromFile = async (filename: string): Promise<fhir4.Bundle> => {
  const data = await readFile(path.join(process.cwd(), filename), 'utf8');
  return JSON.parse(data) as fhir4.Bundle;
};

export const loadPatientBundlesFromDir = async (path: string) => {
  const patientJSONs = await readdir(path);
  const patientBundles = patientJSONs.map(async (file) => {
    return loadBundleFromFile(`${path}/${file}`) as Promise<fhir4.Bundle>;
  });
  return Promise.all(patientBundles);
};

export const calculateMeasureReports = async (
  measureBundle: fhir4.Bundle,
  patientBundle: fhir4.Bundle[],
  options: CalculatorTypes.CalculationOptions = {}
) => {
  console.log('Generating summary measure report...');
  return await Calculator.calculateMeasureReports(measureBundle, patientBundle, options);
};

/**
 * Populates the _type parameter used in a bulk data export request. Retrieves the data
 * requirements for the given measure bundle using the fqm-execution API function. Extracts
 * the resource types from the data requirements. Throws error if data requirements are not
 * defined on the results of the API function.
 * @param measureBundle FHIR measure bundle
 * @param options fqm-execution calculation options
 */
export const retrieveTypeFromMeasureBundle = async (
  measureBundle: fhir4.Bundle,
  options: CalculatorTypes.CalculationOptions = {}
) => {
  const dr = await Calculator.calculateDataRequirements(measureBundle, options);
  if (!dr.results.dataRequirement) {
    throw new Error('Data requirements array is not defined for the Library. Aborting $export request.');
  }
  return constructTypeQueryFromRequirements(dr.results.dataRequirement);
};

/**
 * Constructs the _type parameter used in a bulk data export request by parsing the
 * data requirements for the measure bundle.
 * @param dataRequirements data requirements retrieved from measure bundle
 */
export const constructTypeQueryFromRequirements = (dataRequirements: fhir4.DataRequirement[]) => {
  const queries: DataRequirementsQuery[] = [];

  dataRequirements.forEach((dr) => {
    if (dr.type) {
      const q: DataRequirementsQuery = { endpoint: dr.type, params: {} };
      if (dr.codeFilter?.[0]?.code?.[0].code) {
        const key = dr.codeFilter?.[0].path;
        key && (q.params[key] = dr.codeFilter[0].code[0].code);
      } else if (dr.codeFilter?.[0]?.valueSet) {
        const key = `${dr?.codeFilter?.[0].path}:in`;
        key && (q.params[key] = dr.codeFilter[0].valueSet);
      }
      queries.push(q);
    }
  });

  // reduce queries to keep unique types
  const uniqueTypes = queries.reduce((acc: string[], e) => {
    if (!acc.includes(e.endpoint)) {
      acc.push(e.endpoint);
    }
    return acc;
  }, []);

  const formattedTypeParam = uniqueTypes.join(',');
  return formattedTypeParam;
};

export { CalculatorTypes } from 'fqm-execution';
