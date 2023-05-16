# API Reference
## CLI

### validateInputs
If one of Token URL, Client ID, or Private Key are provided, checks that all three options are defined. If at keast one of the inputs is missing, throws an error.

| Param         | Type     | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
| opts | [`OptionValues`](https://github.com/tj/commander.js/blob/33195f189b1ffa568c232503fb6ac0cf5548eb74/typings/index.d.ts#L277) | Record of option values from [Commander](https://www.npmjs.com/package/commander) program. |
| **Returns**   | `void`  | Returns error if Token URL, Client ID, or Private Key is missing and at least one of Token URL, Client ID, and Private Key is provided.                                              |

### checkDestinationExists
Checks if the specified downloads directory exists. If not, prompts the user to specify whether a new directory should be created and written to.

| Param         | Type     | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
| destination | `String` | Download destination relative to current working directory. |
| **Returns**   | `Promise<void>`  | &nbsp;                                                                    |

### executeExport
Completes "Step 1" of the pipeline.
Kicks off bulk data `$export` operation, saves downloaded ndjson to the directory specified by the CLI options (`-d` flag), and generates HTML export report.

| Param         | Type     | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
| **Returns**   | `Promise<void>`  | &nbsp;                                                                    |

### createPatientBundles
Completes "Step 2" of the pipeline.
Accesses the NDJSON from the downloads directory (`-d` flag) and uses them to assemble FHIR patient bundles. Returns an array of patient bundles to be used for measure calculation and saves to the patient bundles directory specified in the CLI options (`-b` flag).

| Param         | Type     | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
| patientBundleDir | `String` | Directory containing FHIR Patient Bundles, relative to current working directory. |
| **Returns**   | `void`  | &nbsp;                                                                    |

### runMeasureCalculation
Completes "Step 3" of the pipeline.
Uses the FHIR patient bundles stored in the bundles directory (-b flag) and the specified measure bundle to run measure calculation. Saves the resulting FHIR Measure Reports to file.

| Param         | Type     | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
| **Returns**   | `Promise<void>`  | &nbsp;                                                                    |


## NDJSON to Bundle

### getNDJSONFromDir
Retrieves NDJSON content for a specified resource type from a given directory.

| Param         | Type     | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
| dir | `String` | Path to directory containing downloaded NDJSON. |
| resourceType | `String` | Resource type to retrieve NDJSON for
| **Returns**   | `fhir4.FhirResource[]`  | Returns array of parsed NDJSON, cast to FHIR Resources       

### mapResourcesToCollectionBundle
Creates FHIR Collection [Bundle](https://www.hl7.org/fhir/bundle.html) from given FHIR resources.

| Param         | Type     | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
|resources | `fhir4.FhirResource[]` | Resources to include in the constructed bundle. |
| **Returns**   | `CollectionBundle`  | FHIR Collection Bundle

### assemblePatientBundle
For a given FHIR Patient, filters all downloaded resources to those that reference the
patient, using the [patient compartment definition](https://www.hl7.org/fhir/compartmentdefinition-patient.html) as a reference map. Creates FHIR
patient collection bundle from the filtered resources.

| Param         | Type     | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
| patientResource | `fhir4.Patient` | FHIR Patient to use for resource filtering and bundle construction |
| dir | `String` | Directory containing downloaded NDJSON |
| **Returns**   | `CollectionBundle`  | FHIR collection bundle for the given patient

## Report Generator

### createExportReport
Generates HTML export report from data collected throughout the `$export` operation. Includes export URL, number of polling requests, export and download duration, and the created file names.

| Param         | Type     | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
| file | `String` | NDJSON log file containing bulk export results |
| downloadDir | `String` | Download directory from CLI options |
| **Returns**   | `Promise<void>`  | &nbsp;                                                                    |


