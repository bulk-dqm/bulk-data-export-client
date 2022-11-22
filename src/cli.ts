#!/usr/bin/env node

import { Command } from 'commander';
import { resolve } from 'path';
import prompt from 'prompt-sync';
import fs from 'fs';
import 'colors';
import { BulkDataClient as Types } from 'bulk-data-client';
import BulkDataClient from 'bulk-data-client/built/lib/BulkDataClient';
import CLIReporter from 'bulk-data-client/built/reporters/cli';
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
  .parseAsync(process.argv);

// add required trailing slash to FHIR URL if not present
program.opts().fhirUrl = program.opts().fhirUrl.replace(/\/*$/, '/');
// get absolute path for specified destination directory
program.opts().destination = resolve(program.opts().destination);

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

  if (!fs.existsSync(program.opts().destination)) {
    console.log( `Destination ${program.opts().destination} does not exist.`);
    const makeDir = prompt()('Make new directory? [y/n] '.cyan);
    if (makeDir.toLowerCase() === 'y') {
      fs.mkdirSync(program.opts().destination, { recursive: true });
    } else {
      console.error('Exiting due to non-existent destination.'.red);
      process.exit();
    }
  }

  const client = new BulkDataClient(options as Types.NormalizedOptions);
  CLIReporter(client);
  const statusEndpoint = await client.kickOff();
  const manifest = await client.waitForExport(statusEndpoint);
  await client.downloadAllFiles(manifest);
};

main();
