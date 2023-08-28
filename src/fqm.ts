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
 * Populates the _type/_typeFilter parameters used in a bulk data export request. Retrieves the data
 * requirements for the given measure bundle using the fqm-execution API function to use for
 * _type and _typeFilter query construction. Throws error if data requirements are not defined on the results
 * of the API function.
 * @param measureBundle FHIR measure bundle
 * @param autoType boolean specifying whether we want to auto-generate _type
 * @param autoTypeFilter boolean specifying whether we want to auto-generate _typeFilter
 * @param options fqm-execution calculation options
 */
export const retrieveParamsFromMeasureBundle = async (
  measureBundle: fhir4.Bundle,
  autoType: boolean,
  autoTypeFilter: boolean,
  options: CalculatorTypes.CalculationOptions = {}
) => {
  const dr = await Calculator.calculateDataRequirements(measureBundle, options);
  if (!dr.results.dataRequirement) {
    throw new Error('Data requirements array is not defined for the Library. Aborting $export request.');
  }
  return constructParamsFromRequirements(dr.results.dataRequirement, autoType, autoTypeFilter);
};

/**
 * Constructs the _type and _typeFilter parameters used in a bulk data export request by parsing the
 * data requirements from the measure bundle.
 * @param dataRequirements data requirements retrieved from measure bundle
 * @param autoType boolean specifying whether we want to auto-generate _type
 * @param autoTypeFilter boolean specifying whether we want to auto-generate _typeFilter
 */
export const constructParamsFromRequirements = (
  dataRequirements: fhir4.DataRequirement[],
  autoType: boolean,
  autoTypeFilter: boolean
) => {
  const queries: { type: string; params: Record<string, string> }[] = [];
  const types: string[] = [];
  dataRequirements.forEach((dr) => {
    if (dr.type) {
      types.push(dr.type);
      const query: { type: string; params: Record<string, string> } = { type: dr.type, params: {} };

      dr?.codeFilter?.forEach((codeFilter) => {
        if (codeFilter.valueSet) {
          const key = `${codeFilter.path}:in`;
          key && (query.params[key] = codeFilter.valueSet);
        } else if (codeFilter.path === 'code' && codeFilter.code?.[0].code) {
          const key = codeFilter.path;
          key && (query.params[key] = codeFilter.code[0].code);
        }
      });
      queries.push(query);
    }
  });

  const uniqueTypes = types.reduce((acc: string[], type) => {
    if (!acc.includes(type)) {
      acc.push(type);
    }
    return acc;
  }, []);

  const formattedTypeParam = uniqueTypes.join(',');
  const typeFilterQueries = queries.reduce((acc: string[], e) => {
    if (Object.keys(e.params).length > 0) {
      const entry = Object.entries(e.params).map(([key, val]) => {
        return `${key}=${val}`;
      });
      acc.push(`${e.type}?${entry.join('&')}`);
    }
    return acc;
  }, []);

  const typeFilterParam = typeFilterQueries.join(',');
  return {
    ...(autoType ? { _type: formattedTypeParam } : {}),
    ...(autoTypeFilter ? { _typeFilter: typeFilterParam } : {}),
  };
};

export { CalculatorTypes } from 'fqm-execution';
