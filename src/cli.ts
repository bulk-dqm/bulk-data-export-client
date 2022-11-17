#!/usr/bin/env node

import { Command } from 'commander';
import { BulkDataClient as Types } from 'bulk-data-client';
import BulkDataClient from 'bulk-data-client/built/lib/BulkDataClient';
import CLIReporter from 'bulk-data-client/built/reporters/cli';
const program = new Command();

// specify options for bulk data request and retrieval
program
  .requiredOption('-f, --fhir-url <url>', 'Base URL of FHIR server used for data retrieval')
  .requiredOption('-g, --group <id>', 'FHIR Group ID used to query FHIR server for resources')
  .option('-d, --destination <destination>', 'Download destination. Defaults to ./downloads', './downloads')
  .option('-p, --parallel-downloads <number>', 'Number of downloads to run in parallel. Defaults to 1.', '1')
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
};

main();
