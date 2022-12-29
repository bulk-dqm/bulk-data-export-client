#!/usr/bin/env node

import { Command, OptionValues } from 'commander';
import { resolve } from 'path';
import * as readline from 'readline/promises';
import fs from 'fs';
import 'colors';
import { BulkDataClient as Types } from 'bulk-data-client';
import BulkDataClient from 'bulk-data-client/built/lib/BulkDataClient';
import CLIReporter from 'bulk-data-client/built/reporters/cli';
import { resolveJWK } from './jwk';
import * as Logger from 'bulk-data-client/built/loggers/index';
import { DownloadComplete, KickOffEnd, ExportError, DownloadStart, DownloadError } from './logTypes';
import { createExportReport } from './reportGenerator';
import { assemblePatientBundle, getNDJSONFromDir } from './ndjsonToBundle';
import { evaluateCMS122ForPatient } from './fqm';
import { CalculatorTypes } from 'fqm-execution';

const program = new Command();

// specify options for bulk data request and retrieval
program
  .requiredOption('-f, --fhir-url <url>', 'Base URL of FHIR server used for data retrieval')
  .requiredOption('-g, --group <id>', 'FHIR Group ID used to query FHIR server for resources')
  .option(
    '-d, --destination <destination>',
    'Download destination relative to current working directory. Defaults to ./downloads',
    `${process.cwd()}/downloads`
  )
  .option('-p, --parallel-downloads <number>', 'Number of downloads to run in parallel. Defaults to 1.', '1')
  .option('--token-url <tokenUrl>', 'Bulk Token Authorization Endpoint')
  .option('--client-id <clientId>', 'Bulk Data Client ID')
  .option('--private-key <url>', 'File containing private key used to sign authentication tokens')
  .option(
    '-l, --log-file <file-path>',
    'Path to a log file to write logs to. Defaults to log.ndjson (in the download destination directory) if not specified',
    'log.ndjson'
  )
  .option('-o, --output-path <path>', 'Output path for FHIR MeasureReports. Defaults to output.json.', 'output.json')
  .parseAsync(process.argv);

// add required trailing slash to FHIR URL if not present
program.opts().fhirUrl = program.opts().fhirUrl.replace(/\/*$/, '/');
// get absolute path for specified destination directory
const destination = resolve(program.opts().destination);

const validateInputs = (opts: OptionValues) => {
  if (opts.tokenUrl || opts.clientId || opts.privateKey) {
    const missingInputs = [];
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

  validateInputs(program.opts());

  if (program.opts().privateKey) {
    program.opts().privateKey = await resolveJWK(program.opts().privateKey);
  }

  const options = {
    ...program.opts(),
    inlineDocRefAttachmentTypes: [],
    destination,
    requests,
  } as Types.NormalizedOptions;

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

  const client = new BulkDataClient(options as Types.NormalizedOptions);
  CLIReporter(client);

  const logFile = `${destination}/${program.opts().logFile}`;
  const logger = Logger.createLogger({ enabled: true, file: logFile } as Types.LoggingOptions);
  const startTime = Date.now();

  client.on('kickOffEnd', ({ requestParameters, capabilityStatement, response }: KickOffEnd) => {
    logger.log('info', {
      eventId: 'kickoff',
      eventDetail: {
        exportUrl: response.requestUrl,
        errorCode: response.statusCode >= 400 ? response.statusCode : null,
        errorBody: response.statusCode >= 400 ? response.body : null,
        softwareName: capabilityStatement.software?.name || null,
        softwareVersion: capabilityStatement.software?.version || null,
        softwareReleaseDate: capabilityStatement.software?.releaseDate || null,
        fhirVersion: capabilityStatement.fhirVersion || null,
        requestParameters,
      },
    });
  });

  client.on('exportProgress', (e: Types.ExportStatus) => {
    if (!e.virtual) {
      // skip the artificially triggered 100% event
      logger.log('info', {
        eventId: 'status_progress',
        eventDetail: {
          body: e.body,
          xProgress: e.xProgressHeader,
          retryAfter: e.retryAfterHeader,
        },
      });
    }
  });

  client.on('exportError', (eventDetail: ExportError) => {
    logger.log('error', {
      eventId: 'status_error',
      eventDetail,
    });
  });

  client.on('exportComplete', (manifest: Types.ExportManifest) => {
    logger.log('info', {
      eventId: 'status_complete',
      eventDetail: {
        transactionTime: manifest.transactionTime,
        outputFileCount: manifest.output.length,
        deletedFileCount: manifest.deleted?.length || 0,
        errorFileCount: manifest.error.length,
      },
    });
  });

  client.on('downloadStart', (eventDetail: DownloadStart) => {
    logger.log('info', { eventId: 'download_request', eventDetail });
  });

  client.on('downloadError', (eventDetail: DownloadError) => {
    logger.log('info', { eventId: 'download_error', eventDetail });
  });

  client.on('downloadComplete', (eventDetail: DownloadComplete) => {
    logger.log('info', { eventId: 'download_complete', eventDetail });
  });

  client.on('allDownloadsComplete', (downloads: Types.FileDownload[]) => {
    const eventDetail = {
      files: 0,
      resources: 0,
      bytes: 0,
      attachments: 0,
      duration: Date.now() - startTime,
    };

    downloads.forEach((d) => {
      eventDetail.files += 1;
      eventDetail.resources += d.resources;
      eventDetail.bytes += d.uncompressedBytes;
      eventDetail.attachments += d.attachments;
    });

    logger.log('info', { eventId: 'export_complete', eventDetail });
  });

  const statusEndpoint = await client.kickOff();
  const manifest = await client.waitForExport(statusEndpoint);
  await client.downloadAllFiles(manifest);

  await createExportReport(destination, logFile);
  const parsedNDJSON = getNDJSONFromDir(program.opts().destination, 'Patient');
  const patientBundles = parsedNDJSON.map((patient) => {
    return assemblePatientBundle(patient, program.opts().destination);
  });
  const calculationOptions: CalculatorTypes.CalculationOptions = {
    measurementPeriodStart: '2019-01-01',
    measurementPeriodEnd: '2019-12-31',
  };
  const result = await evaluateCMS122ForPatient(patientBundles, calculationOptions);
  fs.writeFile(program.opts().outputPath, JSON.stringify(result?.results, null, 2), (err) => {
    if (err) throw err;
  });
  console.log(`Output written to ${program.opts().outputPath}`);
};

main();
