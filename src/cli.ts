#!/usr/bin/env node

import { Command, OptionValues } from 'commander';
import { resolve } from 'path';
import * as readline from 'readline/promises';
import fs from 'fs';
import 'colors';
import { BulkDataClient as Types } from 'bulk-data-client';
import BulkDataClient from 'bulk-data-client/built/lib/BulkDataClient';
import CLIReporter from 'bulk-data-client/built/reporters/cli';
import TextReporter from 'bulk-data-client/built/reporters/text';
import { resolveJWK } from './jwk';
import * as Logger from 'bulk-data-client/built/loggers/index';
import { createExportReport } from './reportGenerator';
import { assemblePatientBundle, getNDJSONFromDir } from './ndjsonToBundle';
import { writeFile } from 'fs';
import { CalculatorTypes } from 'fqm-execution';
import {
  calculateMeasureReports,
  loadBundleFromFile,
  loadPatientBundlesFromDir,
  retrieveTypeFromMeasureBundle,
} from './fqm';
import { setLoggingEvents } from './logEvents';

interface NormalizedOptions extends Omit<Types.NormalizedOptions, 'privateKey'> {
  from: string;
  to: string;
  logFile: string;
  outputPath: string;
  measureBundle: string;
  patientBundles: string;
  privateKey: any;
  autoPopulateType: boolean;
}

const program = new Command();

// specify options for bulk data request and retrieval
program
  .option('-f, --fhir-url <url>', 'Base URL of FHIR server used for data retrieval')
  .option('-g, --group <id>', 'FHIR Group ID used to query FHIR server for resources')
  .option('-m, --measure-bundle <measure-bundle>', 'Path to measure bundle.')
  .option('-b, --patient-bundles <patient-bundles>', 'Directory containing patient bundles.')
  .option(
    '-d, --destination <destination>',
    'Download destination relative to current working directory. Defaults to ./downloads'
  )
  .option('-p, --parallel-downloads <number>', 'Number of downloads to run in parallel. Defaults to 5.')
  .option('--token-url <tokenUrl>', 'Bulk Token Authorization Endpoint')
  .option('--client-id <clientId>', 'Bulk Data Client ID')
  .option('--private-key <url>', 'File containing private key used to sign authentication tokens')
  .option(
    '-l, --log-file <file-path>',
    'Path to a log file to write logs to. Defaults to log.ndjson (in the download destination directory) if not specified',
    'log.ndjson'
  )
  .option('-o, --output-path <path>', 'Output path for FHIR MeasureReports. Defaults to output.json.', 'output.json')
  .option(
    '--reporter [cli|text]',
    'Reporter to use to render the output. "cli" renders fancy progress bars and tables. "text" is better for log files. Defaults to "cli".'
  )
  .option(
    '--lenient',
    'Sets a "Prefer: handling=lenient" request header to tell the server to ignore unsupported parameters.'
  )
  .option(
    '-t, --_type <resourceTypes>',
    'String of comma-delimited FHIR resource types. If omitted, exports resources of all resource types.'
  )
  .option('-s, --_since <date>', 'Only include resources modified after the specified date.')
  .option(
    '-q, --_typeFilter <string>',
    'Experimental _typeFilter parameter. Represents a string of comma delimited FHIR REST queries.'
  )
  .option(
    '-a, --auto-populate-type',
    'Automatically populates _type using data requirements from the measure bundle. Requires a measure bundle path to be supplied. Overrides any input provided by the --_type flag.'
  )
  .option('--config <path>', 'Relative path to a config file. Otherwise uses default options.')
  .option('--from <string>', 'Measurement period start date')
  .option('--to <string>', 'Measurement period end date')
  .parseAsync(process.argv);

// use default options for parameters not set by the CLI
const { config, ...params } = program.opts();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const base: NormalizedOptions = require('../config/defaults');
const options: NormalizedOptions = { ...base };

if (config) {
  // use custom config file to populate parameter values
  const configPath = resolve(__dirname, 'config', config);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const cfg = require(configPath);
  Object.assign(options, cfg);
}
// assign parameter values set by the CLI
Object.assign(options, params);
// add required trailing slash to FHIR URL if not present
if (options.fhirUrl) {
  options.fhirUrl = options.fhirUrl.replace(/\/*$/, '/');
}

/**
 * If one of Token URL, Client ID, or Private Key are provided, checks that all three options are defined. If at least one of the inputs is missing, throws an error.
 * @param opts Record of option values from Commander program
 */
const validateInputs = (opts: OptionValues) => {
  if (opts.tokenUrl || opts.clientId || opts.privateKey) {
    const missingInputs: string[] = [];
    if (!opts.tokenUrl) missingInputs.push('Token URL');
    if (!opts.clientId) missingInputs.push('Client ID');
    if (!opts.privateKey) missingInputs.push('Private Key');

    if (missingInputs.length > 0) {
      throw new Error(
        `Token URL, Client ID, and Private Key must all be provided or all omitted. Missing ${missingInputs.join(', ')}`
      );
    }
  }
};

/**
 * Checks if the specified downloads directory exists. If not, prompts the user to specify whether a new directory should be created and written to.
 * @param destination Download destination relative to current working directory
 */
const checkDestinationExists = async (destination: string) => {
  if (!fs.existsSync(destination)) {
    console.log(`Destination ${destination} does not exist.`);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const answer = await rl.question('Make new directory? [y/n]');
    if (answer.toLowerCase() === 'y') {
      fs.mkdirSync(destination, { recursive: true });
    } else {
      console.error('Exiting due to non-existent destination.'.red);
      process.exit();
    }
    rl.close();
  }
};

/**
 * Completes "Step 1" of the pipeline.
 * Kicks off bulk data $export operation, saves downloaded ndjson to the
 * directory specified by the CLI options (-d flag), and generates HTML export report.
 */
const executeExport = async () => {
  if (!options.destination) options.destination = `${process.cwd()}/downloads`;
  await checkDestinationExists(options.destination);

  if (options.autoPopulateType) {
    if (!options.measureBundle) {
      console.log(
        '--auto-populate-type supplied without a measure bundle. Measure bundle path must be supplied with the -m/--measure-bundle flag in order to automatically populate the _type parameter.'
      );
      program.help();
    }
    const mb = await loadBundleFromFile(options.measureBundle);
    // override current value of _type with query from data requirements
    options._type = await retrieveTypeFromMeasureBundle(mb);
  }

  const client = new BulkDataClient(options as NormalizedOptions);
  if (options.reporter === 'text') {
    TextReporter(client);
  } else CLIReporter(client);

  const logFile = `${options.destination}/${options.logFile}`;
  const logger = Logger.createLogger({ enabled: true, file: logFile } as Types.LoggingOptions);
  setLoggingEvents(logger, client);

  const statusEndpoint = await client.kickOff();
  const manifest = await client.waitForExport(statusEndpoint);
  await client.downloadAllFiles(manifest);
  await createExportReport(logFile, options.destination);
};

/**
 * Completes "Step 2" of the pipeline.
 * Accesses the NDJSON from the downloads directory (-d flag) and uses them to
 * assemble FHIR patient bundles. Returns an array of patient bundles
 * to be used for measure calculation and saves to the patient bundles directory
 * specified in the CLI options (-b flag).
 */
const createPatientBundles = (patientBundleDir: string) => {
  const bundleDirectory = resolve(patientBundleDir);
  const parsedNDJSON = getNDJSONFromDir(options.destination, 'Patient');
  if (!fs.existsSync(bundleDirectory)) {
    fs.mkdirSync(bundleDirectory, { recursive: true });
  }
  const patientBundles = parsedNDJSON.map((patient) => {
    return assemblePatientBundle(patient as fhir4.Patient, options.destination);
  });
  patientBundles.forEach((bundle) => {
    const patientId = bundle.entry.find((res) => res.resource?.resourceType === 'Patient')?.resource?.id;
    writeFile(`${bundleDirectory}/Patient-${patientId}.json`, JSON.stringify(bundle, null, 2), (err) => {
      if (err) throw err;
    });
  });

  console.log(`FHIR Patient Bundles written to ${patientBundleDir}`);
};

/**
 * Completes "Step 3" of the pipeline.
 * Uses the FHIR patient bundles stored in the bundles directory (-b flag) and the
 * specified measure bundle to run measure calculation. Saves the resulting FHIR
 * Measure Reports to file.
 */
const runMeasureCalculation = async () => {
  const calculationOptions: CalculatorTypes.CalculationOptions = {
    measurementPeriodStart: options.from === undefined? '1000-01-01' : options.from,
    measurementPeriodEnd: options.to === undefined? '9999-12-31' : options.to,
    reportType: 'summary',
  };
  const measureBundle = await loadBundleFromFile(options.measureBundle);
  const patientBundles = await loadPatientBundlesFromDir(options.patientBundles ?? 'patientBundles');
  const result = await calculateMeasureReports(measureBundle, patientBundles, calculationOptions);
  writeFile(options.outputPath, JSON.stringify(result?.results, null, 2), (err) => {
    if (err) throw err;
  });
  console.log(`Output written to ${options.outputPath}`);
};

const main = async (options: NormalizedOptions) => {
  validateInputs(program.opts());

  if (options.privateKey) {
    options.privateKey = await resolveJWK(options.privateKey);
  }

  // execute "Step 1": bulk data export
  if (options.fhirUrl && options.group) {
    // execute "Step 2": generate patient bundles
    if (options.patientBundles || options.measureBundle) {
      createPatientBundles(options.patientBundles ?? 'patientBundles');
    }
    // execute "Step 3": measure calculation
    if (options.measureBundle) {
      await runMeasureCalculation();
    }
  } else if (options.measureBundle) {
    // execute "Step 2": generate patient bundles
    if (options.destination) {
      createPatientBundles(options.patientBundles ?? 'patientBundles');
    }
    await runMeasureCalculation();
  } else if (options.destination) {
    // only execute "Step 2": generate patient bundles
    createPatientBundles(options.patientBundles ?? 'patientBundles');
  } else {
    program.help();
  }
};

main(options);
