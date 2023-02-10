import { readFile, writeFile } from 'fs/promises';

/**
 * Generates html export report from data collected throughout bulk export operation
 * @param file ndjson log file containing bulk export results
 * @param downloadDir download directory from CLI options
 */
export const createExportReport = async (file: string, downloadDir: string) => {
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
  const numPollingRequests = exportEvents.filter((log) =>
    ['status_progress', 'status_complete', 'status_error'].includes(log.eventId)
  ).length;

  const htmlContent = `
    <div>
      <h1>Export Results for Export ${exportId}</h1>
      <p>Export Timestamp: ${kickoffResults.timestamp}</p>
      <p>Export URL: ${kickoffResults.eventDetail.exportUrl}</p>
      <p>Number of Polling Requests: ${numPollingRequests}</p>
      <h2>Completed Export Information</h2>
      <p>Downloads Complete Timestamp: ${exportCompleteResults.timestamp}</p>
      <p>Event Details:
      <ul>
        <li>Files: ${exportCompleteResults.eventDetail.files}</li>
        <li>Resources: ${exportCompleteResults.eventDetail.resources}</li>
        <li>Duration: ${exportCompleteResults.eventDetail.duration} seconds</li>
      </ul>
      </p>
      <h2>Created Files:</h2>
      <ul>
        ${downloadResults
          .map(
            (event) => `<li>${event.eventDetail.fileUrl} (${event.eventDetail.resourceCount} resources)</li>
        `
          )
          .join('')}
      </ul>
    </div>
  `;

  writeFile(`${downloadDir}/export-report-${exportId}.html`, htmlContent);
};
