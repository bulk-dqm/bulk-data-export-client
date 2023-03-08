import { createExportReport } from '../src/reportGenerator';
import { resolve } from 'path';
import fs from 'fs';

const logFile = process.argv[2];
const destination = process.argv[3] || process.cwd();

console.log(`Generating export report for ${logFile} and saving to the ${destination} directory...`);
if (!fs.existsSync(destination)) {
  fs.mkdirSync(destination, { recursive: true });
}
createExportReport(resolve(logFile), destination)
  .then(() => {
    console.log(`Successfully generated export report for log file ${logFile}`);
  })
  .catch(console.error);
