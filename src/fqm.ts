import { readFile, readdir } from 'fs/promises';
import { Calculator, CalculatorTypes } from 'fqm-execution';
import * as path from 'path';

/**
 * Asynchronously reads the contents of a given file containing a FHIR Bundle.
 * @param filename file name
 * @returns FHIR Bundle
 */
export const loadBundleFromFile = async (filename: string): Promise<fhir4.Bundle> => {
  const data = await readFile(path.join(process.cwd(), filename), 'utf8');
  return JSON.parse(data) as fhir4.Bundle;
};

/**
 * Asynchronously reads the contents of a given directory containing FHIR Patient Bundles.
 * @param path directory path
 * @returns FHIR Patient Bundles
 */
export const loadPatientBundlesFromDir = async (path: string) => {
  const patientJSONs = await readdir(path);
  const patientBundles = patientJSONs.map(async (file) => {
    return loadBundleFromFile(`${path}/${file}`) as Promise<fhir4.Bundle>;
  });
  return Promise.all(patientBundles);
};

/**
 * Generates a summary FHIR Measure Report using the fqm-execution calculateMeasureReports function.
 * @param measureBundle FHIR Measure Bundle
 * @param patientBundle array of FHIR Patient Bundles
 * @param options fqm-execution calculation options
 * @returns MeasureReport resource summary according to standard https://www.hl7.org/fhir/measurereport.html
 */
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
 * Populates the _typeFilter parameter used in a bulk data export request. Retrieves the data
 * requirements for the given measure bundle using the fqm-execution API function to use for
 * _typeFilter query construction. Throws error if data requirements are not defined on the results
 * of the API function.
 * @param measureBundle FHIR measure bundle
 * @param options fqm-execution calculation options
 */
export const retrieveTypeFilterFromMeasureBundle = async (
  measureBundle: fhir4.Bundle,
  options: CalculatorTypes.CalculationOptions = {}
) => {
  const dr = await Calculator.calculateDataRequirements(measureBundle, options);
  if (!dr.results.dataRequirement) {
    throw new Error('Data requirements array is not defined for the Library. Aborting $export request.');
  }
  return constructTypeFilterQueryFromRequirements(dr.results.dataRequirement);
};

/**
 * Constructs the _type parameter used in a bulk data export request by parsing the
 * data requirements for the measure bundle.
 * @param dataRequirements data requirements retrieved from measure bundle
 */
export const constructTypeQueryFromRequirements = (dataRequirements: fhir4.DataRequirement[]) => {
  const types: string[] = [];

  dataRequirements.forEach((dr) => {
    if (dr.type) {
      types.push(dr.type);
    }
  });

  // reduce queries to keep unique types
  const uniqueTypes = types.reduce((acc: string[], type) => {
    if (!acc.includes(type)) {
      acc.push(type);
    }
    return acc;
  }, []);

  const formattedTypeParam = uniqueTypes.join(',');
  return formattedTypeParam;
};

/**
 * Constructs the _typeFilter parameter used in a bulk data export request by parsing the
 * data requirements from the measure bundle.
 * @param dataRequirements data requirements retrieved from measure bundle
 */
export const constructTypeFilterQueryFromRequirements = (dataRequirements: fhir4.DataRequirement[]) => {
  const queries: Record<string, string>[] = [];
  dataRequirements.forEach((dr) => {
    if (dr.type) {
      const query: Record<string, string> = {};
      if (dr?.codeFilter?.[0]?.code?.[0].code) {
        const key = dr?.codeFilter?.[0].path;
        key && (query[key] = dr.codeFilter[0].code[0].code);
      } else if (dr?.codeFilter?.[0]?.valueSet) {
        const key = `${dr?.codeFilter?.[0].path}:in`;
        key && (query[key] = dr.codeFilter[0].valueSet);
      }
      queries.push(query);
    }
  });

  const typeFilterQueries = queries.reduce((acc: string[], e) => {
    if (Object.keys(e.params).length > 0) {
      acc.push(`${e.endpoint}%3F${new URLSearchParams(e.params).toString()}`);
    }
    return acc;
  }, []);
  const typeFilterParam = typeFilterQueries.join(',');
  return typeFilterParam;
};

export { CalculatorTypes } from 'fqm-execution';
