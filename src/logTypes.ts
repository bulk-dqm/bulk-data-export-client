export interface DownloadComplete {
  fileUrl: string;
  fileSize: string;
  resourceCount: number | null;
}

export interface KickOffEnd {
  response: any;
  capabilityStatement: fhir4.CapabilityStatement;
  requestParameters: Record<string, any>;
}

export interface ExportError {
  body: string | fhir4.OperationOutcome | null;
  code: number | null;
  message?: string | undefined;
}

export interface DownloadStart {
  fileUrl: string;
  itemType: string;
  resourceType: string | null;
}

export interface DownloadError {
  body: string | fhir4.OperationOutcome | null;
  code: number | null;
  fileUrl: string;
  message?: string | undefined;
}
