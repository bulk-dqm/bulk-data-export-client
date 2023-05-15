# API Reference
## CLI

### validateInputs
| Param         | Type     | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
| opts | [`OptionValues`](https://github.com/tj/commander.js/blob/33195f189b1ffa568c232503fb6ac0cf5548eb74/typings/index.d.ts#L277) | Record of option values from [Commander](https://www.npmjs.com/package/commander) program. |
| **Returns**   | `void`  | Returns error if Token URL, Client ID, or Private Key is missing and at least one of Token URL, Client ID, and Private Key is provided.                                              |

### checkDestinationExists
| Param         | Type     | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
| destination | `String` | Download destination relative to current working directory. |
| **Returns**   | `Promise<void>`  | &nbsp;                                                                    |

### executeExport
| Param         | Type     | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
| **Returns**   | `Promise<void>`  | &nbsp;                                                                    |

### createPatientBundles
| Param         | Type     | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
| patientBundleDir | `String` | Directory containing FHIR Patient Bundles, relative to current working directory. |
| **Returns**   | `void`  | &nbsp;                                                                    |

### runMeasureCalculation
| Param         | Type     | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
| **Returns**   | `Promise<void>`  | &nbsp;                                                                    |


## NDJSON to Bundle

### getNDJSONFromDir
| Param         | Type     | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
| dir | `String` | Path to directory containing downloaded NDJSON. |
| resourceType | `String` | Resource type to retrieve NDJSON for
| **Returns**   | `fhir4.FhirResource[]`  | Returns array of parsed NDJSON, cast to FHIR Resources       

### mapResourcesToCollectionBundle
| Param         | Type     | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
|resources | `fhir4.FhirResource[]` | Resources to include in the constructed bundle. |
| **Returns**   | `CollectionBundle`  | FHIR Collection Bundle

### assemblePatientBundle
| Param         | Type     | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
| patientResource | `fhir4.Patient` | FHIR Patient to use for resource filtering and bundle construction |
| dir | `String` | Directory containing downloaded NDJSON |
| **Returns**   | `CollectionBundle`  | FHIR collection bundle for the given patient

## Report Generator

### createExportReport
| Param         | Type     | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
| file | `String` | NDJSON log file containing bulk export results |
| downloadDir | `String` | Download directory from CLI options |
| **Returns**   | `Promise<void>`  | &nbsp;                                                                    |


