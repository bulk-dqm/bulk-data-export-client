import { BulkDataClient as Types } from 'bulk-data-client';
import { DownloadComplete, KickOffEnd, ExportError, DownloadStart, DownloadError } from './types/logTypes';

export const setLoggingEvents = (logger: any, client: any) => {
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
        errorFileCount: manifest.error?.length || 0,
        duration: Date.now() - startTime,
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
};
