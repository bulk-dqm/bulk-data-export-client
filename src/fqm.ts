import { readFile } from 'fs/promises';
import { Calculator, CalculatorTypes } from 'fqm-execution';
import * as path from 'path';
import { CalculationOptions } from 'fqm-execution/build/types/Calculator';

export const loadBundleFromFile = async (filename: string): Promise<fhir4.Bundle> => {
  const data = await readFile(path.join(process.cwd(), filename), 'utf8');
  return JSON.parse(data) as fhir4.Bundle;
};

export const calculateMeasureReports = async (
  measureBundle: fhir4.Bundle,
  patientBundle: fhir4.Bundle[],
  options: CalculatorTypes.CalculationOptions = {}
) => {
  return await Calculator.calculateMeasureReports(measureBundle, patientBundle, options);
};

export { CalculatorTypes } from 'fqm-execution';
