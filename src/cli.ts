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
    '-l, --log-items [file-path]',
    'Path to a log file (if logging is desired). Defaults to log.ndjson and is stored in the download destination directory (if logging enabled), false otherwise'
  )
  .parseAsync(process.argv);

// add required trailing slash to FHIR URL if not present
program.opts().fhirUrl = program.opts().fhirUrl.replace(/\/*$/, '/');
// get absolute path for specified destination directory
const destination = resolve(program.opts().destination);

const validateInputs = (opts: OptionValues) => {
  if (opts.tokenUrl || opts.cliendId || opts.privateKey) {
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

  if (program.opts().logItems) {
    let logFile;
    program.opts().logItems === true
      ? (logFile = `${destination}/log.ndjson`)
      : (logFile = `${destination}/${program.opts().logItems}`);
    const logger = Logger.createLogger({ enabled: true, file: logFile } as Types.LoggingOptions);
    const startTime = Date.now();

    client.on('kickOffEnd', ({ requestParameters, capabilityStatement, response }: any) => {
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

    client.on('allDownloadsComplete', (downloads: any[]) => {
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

    client.on('downloadComplete', (eventDetail: any) => {
      logger.log('info', { eventId: 'download_complete', eventDetail });
    });
  }

  const statusEndpoint = await client.kickOff();
  const manifest = await client.waitForExport(statusEndpoint);
  await client.downloadAllFiles(manifest);
};

main();
