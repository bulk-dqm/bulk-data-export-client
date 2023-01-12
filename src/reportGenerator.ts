import { readFile, writeFile } from 'fs/promises';

/**
 * Generates html export report from data collected throughout bulk export operation
 * @param file ndjson log file containing bulk export results
 */
export const createExportReport = async (file: string) => {
  const data = await readFile(file, 'utf8');
  const jsonLogs = data
    .split('\n')
    .slice(0, -1)
    .map((d) => JSON.parse(d));

  // filter logs to those belonging to most recent export
  const exportId = jsonLogs[jsonLogs.length - 1].exportId;
  const exportEvents = jsonLogs.filter((log) => log.exportId === exportId);

  // there should be one kickoff log and one export log, and at least one download log
  const kickoffResults = exportEvents.filter((log) => log.eventId === 'kickoff')[0];
  const exportCompleteResults = exportEvents.filter((log) => log.eventId === 'export_complete')[0];
  const downloadResults = exportEvents.filter((log) => log.eventId === 'download_complete');

  let htmlContent = `<div><h1>Export Results for Export ${exportId}</h1>`;

  htmlContent += `\n<p>Export Timestamp: ${kickoffResults.timestamp}</p>`;
  htmlContent += `\n<p>Export URL: ${kickoffResults.eventDetail.exportUrl}</p>`;
  htmlContent += '\n<h2>Completed Export Information</h2>';
  htmlContent += `\n<p>Downloads Complete Timestamp: ${exportCompleteResults.timestamp}</p>`;
  htmlContent += `\n<p>Event Details:<ul><li>Files: ${exportCompleteResults.eventDetail.files}</li><li>Resources: ${exportCompleteResults.eventDetail.resources}</li><li>Duration: ${exportCompleteResults.eventDetail.duration} seconds</li></ul></p>`;
  htmlContent += '\n<h2>Created Files:</h2><ul>';
  downloadResults.forEach(
    (event) => (htmlContent += `\n<li>${event.eventDetail.fileUrl} (${event.eventDetail.resourceCount} resources)</li>`)
  );
  htmlContent += '</ul>';
  htmlContent += '</div>';

  writeFile(`export-report-${exportId}.html`, htmlContent);
};
