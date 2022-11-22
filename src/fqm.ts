import { readFile } from 'fs/promises';
import { Calculator } from 'fqm-execution';
import * as path from 'path';
import { CalculationOptions } from 'fqm-execution/build/types/Calculator';

export const loadCMS122 = async (): Promise<fhir4.Bundle> => {
  const data = await readFile(path.join(__dirname, 'measures', 'DiabetesHemoglobinA1cHbA1cPoorControl9FHIR-bundle.json'), 'utf8')
  return JSON.parse(data) as fhir4.Bundle;
}

export const evaluateCMS122ForPatient = async (patientBundle: fhir4.Bundle[], options: CalculationOptions = {}) => {
  const measureBundle = await loadCMS122();
  return await Calculator.calculateMeasureReports(measureBundle, patientBundle, options)
}
