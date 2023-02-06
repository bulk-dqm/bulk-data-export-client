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
import { calculateMeasureReports, loadBundleFromFile } from './fqm';
import { setLoggingEvents } from './logEvents';

interface NormalizedOptions extends Omit<Types.NormalizedOptions, 'privateKey'> {
  logFile: string;
  outputPath: string;
  measureBundle: string;
  privateKey: any;
}

const program = new Command();

// specify options for bulk data request and retrieval
program
  .option('-f, --fhir-url <url>', 'Base URL of FHIR server used for data retrieval')
  .option('-g, --group <id>', 'FHIR Group ID used to query FHIR server for resources')
  .option('-m, --measure-bundle <measure-bundle>', 'Path to measure bundle.')
  .option(
    '-d, --destination <destination>',
    'Download destination relative to current working directory. Defaults to ./downloads',
    `${process.cwd()}/downloads`
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
  .option('--config <path>', 'Relative path to a config file. Otherwise uses default options.')
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
// get absolute path for specified destination directory
const destination = resolve(options.destination);

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

const checkForDestination = async () => {
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

const main = async (options: NormalizedOptions) => {
  validateInputs(program.opts());

  if (options.privateKey) {
    program.opts().privateKey = await resolveJWK(options.privateKey);
  }

  if (options.fhirUrl && options.group) {
    // execute "Step 1": bulk data export
    await checkForDestination();
    const client = new BulkDataClient({ ...options, destination } as NormalizedOptions);
    if (options.reporter === 'text') {
      TextReporter(client);
    } else CLIReporter(client);

    const logFile = `${destination}/${options.logFile}`;
    const logger = Logger.createLogger({ enabled: true, file: logFile } as Types.LoggingOptions);

    setLoggingEvents(logger, client);
    

    const statusEndpoint = await client.kickOff();
    const manifest = await client.waitForExport(statusEndpoint);
    await client.downloadAllFiles(manifest);

    await createExportReport(destination, logFile);
    if (options.measureBundle) {
      // execute "Step 2": create patient ndjson bundles
      const parsedNDJSON = getNDJSONFromDir(options.destination, 'Patient');
      const patientBundles = parsedNDJSON.map((patient) => {
        return assemblePatientBundle(patient as fhir4.Patient, options.destination);
      });
      // execute "Step 3": perform measure calculation on measure and patient bundles
      const calculationOptions: CalculatorTypes.CalculationOptions = {
        measurementPeriodStart: '2019-01-01',
        measurementPeriodEnd: '2019-12-31',
      };
      const measureBundle = await loadBundleFromFile(options.measureBundle);
      const result = await calculateMeasureReports(measureBundle, patientBundles, calculationOptions);
      writeFile(options.outputPath, JSON.stringify(result?.results, null, 2), (err) => {
        if (err) throw err;
      });
      console.log(`Output written to ${options.outputPath}`);
    }
  } else if (options.measureBundle) {
    // execute "Step 2": create patient ndjson bundles
    const parsedNDJSON = getNDJSONFromDir(options.destination, 'Patient');
    const patientBundles = parsedNDJSON.map((patient) => {
      return assemblePatientBundle(patient as fhir4.Patient, options.destination);
    });
    // TODO: throw error if no ndjson present?? --> already throw error for empty patient bundles
    // but could potentially do something more detailed here
    // execute "Step 3": perform measure calculation on measure and patient bundles
    const calculationOptions: CalculatorTypes.CalculationOptions = {
      measurementPeriodStart: '2019-01-01',
      measurementPeriodEnd: '2019-12-31',
    };
    const measureBundle = await loadBundleFromFile(options.measureBundle);
    const result = await calculateMeasureReports(measureBundle, patientBundles, calculationOptions);
    writeFile(options.outputPath, JSON.stringify(result?.results, null, 2), (err) => {
      if (err) throw err;
    });
    console.log(`Output written to ${options.outputPath}`);
  } else if ((options.fhirUrl && !options.group) || (!options.fhirUrl && options.group)) {
    throw new Error('A FHIR server URL and FHIR Group id must both be provided to kick off $export');
  }
};

main(options);
