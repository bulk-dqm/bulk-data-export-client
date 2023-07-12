# Bulk Data Export Details

## Supported Bulk Data Export Endpoints
Only [Group Export](https://hl7.org/fhir/uv/bulkdata/export/index.html#endpoint---group-of-patients) is supported. The Group Export endpoint is used to export FHIR resources for all members of a [FHIR Group](https://hl7.org/fhir/R4/group.html), referenced by its id. The Group Export operation exports resources required for [United States Core Data for Interoperability V1 (USCDI)](https://www.healthit.gov/isa/united-states-core-data-interoperability-uscdi).

## Server Implementation Considerations
There are several factors that could impact the time needed to complete a Bulk Data Export request. These factors include:
- The size of the Group specified for export
- The number of resources and/or resource types being requested
- The time range being requested
- The FHIR server's implementation of Bulk Data Export and its allowable parameters

## Supported Bulk Data Export Client Parameters
The following parameters are supported by the client:

| Parameter         | Optional?    | Type |Description                                                               |
| ------------- | -------- | ----| ------------------------------------------------------------------------- |
| `_outputFormat` | yes | String | The format for the requested bulk data files to be generated. |
| `_since` | yes | FHIR instant | Resources will be included in the response if their state has changed after the supplied time. |
| `_type` | yes | String | Comma-delimited string of FHIR resoure types to be included in the response. |
| `_typeFilter` | yes | String | Comma-delimited string of FHIR REST queries. |
| `_elements` | yes | String | Comma-delimited string of FHIR elements. |
| `patient` | yes | [Reference](http://hl7.org/fhir/R4/references.html#Reference) | Reference to patient(s) to request resources for |
| `includeAssociatedData` | yes | String | Comma-delimited string of values. When provided, the Group Export will return or omit a pre-defined set of FHIR resources associated with the request. |

## Constraints on Bulk Data Export Client Parameters
- `_typeFilter` can be supplied without supplying `_type`, but a server error may be returned depending on constraints set by the server.
- The `_type` parameter can be automatically populated using the `--auto-populate-type` flag. See [Advanced Topics](/docs/advanced-topics.md) for more information.

## Authorization
The Bulk Data Export client can connect to secured Bulk Data servers using [SMART Backend Services](http://www.hl7.org/fhir/smart-app-launch/backend-services.html).

The required configuration parameters for connecting to secured servers are as follows:
- Token Url: the Bulk Data token authorization endpoint
- Client ID: the Bulk Data client ID
- Private Key: a path to a file containing the private key used to sign authentication tokens

These configuration parameters do not need to be specified when connecting to an unsecured server.

## Request Flow

### Bulk Data Kick-off Request
A bulk export request is kicked off for a specific group of patients using the following request format:

```
GET <Base URL>/Group/<Group id>/$export
```

The Group id must be specified as a configuration option (or specified via the CLI) at the time of kick-off. If request parameters are specified, they are appended to the request url.

Once the kick-off is completed, the status endpoint is available.

### Bulk Data Status Request
The client uses the URL returned from the `Content-Location` header from the kick-off request to check the job status.

If a `200` status code is returned, the export is complete.
If a `202` status code is returned, the export is still in progress. The elapsed time is reported to the user's terminal.

### File Request
After the export completes, download jobs are creaated to download all the exported resources from the returned file URLs.

Each exported NDJSON file contains a single resource type. Multiple files for the same resource type may exist.

For more details on the Bulk Data Export flow, consult the [HL7 Bulk Data specifications](https://hl7.org/fhir/uv/bulkdata/export/index.html).
