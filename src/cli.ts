#!/usr/bin/env node

import { Command } from 'commander';
import { BulkDataClient as Types } from 'bulk-data-client';
import BulkDataClient from 'bulk-data-client/built/lib/BulkDataClient';
import CLIReporter from 'bulk-data-client/built/reporters/cli';
import { assemblePatientBundle, getNDJSONFromDir } from './ndjsonToBundle';
import { evaluateCMS122ForPatient } from './fqm';
import { writeFile } from 'fs';
import { CalculatorTypes } from 'fqm-execution';

const program = new Command();

// specify options for bulk data request and retrieval
program
  .requiredOption('-f, --fhir-url <url>', 'Base URL of FHIR server used for data retrieval')
  .requiredOption('-g, --group <id>', 'FHIR Group ID used to query FHIR server for resources')
  .option('-d, --destination <destination>', 'Download destination. Defaults to ./downloads', './downloads')
  .option('-p, --parallel-downloads <number>', 'Number of downloads to run in parallel. Defaults to 1.', '1')
  .option(
    '-o, --output-path <path>',
    'Output path for FHIR MeasureReports produced from measure evaluation. Defaults to output.json.',
    'output.json'
  )
  .parseAsync(process.argv);

// add required trailing slash to FHIR URL if not present
program.opts().fhirUrl = program.opts().fhirUrl.replace(/\/*$/, '/');

const main = async () => {
  const requests = {
    https: {
      // reject self-signed certs
      rejectUnauthorized: true,
    },
    timeout: 30000,
    headers: {
      // pass custom headers
    },
  };

  const options = {
    ...program.opts(),
    requests,
  } as Types.NormalizedOptions;
  const client = new BulkDataClient(options as Types.NormalizedOptions);
  CLIReporter(client);
  const statusEndpoint = await client.kickOff();
  const manifest = await client.waitForExport(statusEndpoint);
  await client.downloadAllFiles(manifest);
  const parsedNDJSON = getNDJSONFromDir(program.opts().destination, 'Patient');
  const patientBundles = parsedNDJSON.map((patient) => {
    return assemblePatientBundle(patient as fhir4.Patient, program.opts().destination);
  });
  // TODO: remove specified measurement period start/end after CLI options are implemented for them
  const calculationOptions: CalculatorTypes.CalculationOptions = {
    measurementPeriodStart: '2019-01-01',
    measurementPeriodEnd: '2019-12-31',
  };
  const result = await evaluateCMS122ForPatient(patientBundles, calculationOptions);
  writeFile(program.opts().outputPath, JSON.stringify(result?.results, null, 2), (err) => {
    if (err) throw err;
  });
  console.log(`Output written to ${program.opts().outputPath}`);
};

main();
