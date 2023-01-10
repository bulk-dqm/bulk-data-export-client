import fs from 'fs';

/**
 * Generates html export report from data collected throughout bulk export operation
 * @param file ndjson log file containing bulk export results
 */
export const createExportReport = (file: string) => {
  const data = fs.readFileSync(file, 'utf8');
  const resultsArr = data
    .split('\n')
    .slice(0, -1)
    .map((d) => JSON.parse(d));
  // filter logs to those belonging to most recent export
  const exportId = resultsArr[resultsArr.length - 1].exportId;
  const exportEvents = resultsArr.filter((r) => r.exportId === exportId);
  const kickoffResults = exportEvents.filter((r) => r.eventId === 'kickoff')[0];
  const exportCompleteResults = exportEvents.filter((r) => r.eventId === 'export_complete')[0];
  const downloadResults = exportEvents.filter((r) => r.eventId === 'download_complete');

  let htmlContent = `<html><h1>Export Results for Export ${exportId}</h1>`;

  htmlContent += `<p>Export Timestamp: ${kickoffResults.timestamp}</p>`;
  htmlContent += `<p>Export URL: ${kickoffResults.eventDetail.exportUrl}</p>`;
  htmlContent += '<h2>Completed Export Information</h2>';
  htmlContent += `<p>Downloads Complete Timestamp: ${exportCompleteResults.timestamp}</p>`;
  htmlContent += `<p>Event Details:<ul><li>Files: ${exportCompleteResults.eventDetail.files}</li><li>Resources: ${exportCompleteResults.eventDetail.resources}</li><li>Duration: ${exportCompleteResults.eventDetail.duration} seconds</li></ul></p>`;
  htmlContent += '<h2>Created Files:</h2><ul>';
  downloadResults.forEach(event => htmlContent += `<li>${event.eventDetail.fileUrl} (${event.eventDetail.resourceCount} resources)</li>`);
  htmlContent += '</ul>';
  htmlContent += '</html>';
  // update this to be exportReport with the export url included
  fs.writeFileSync('my-page.html', htmlContent);
};
