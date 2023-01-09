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
