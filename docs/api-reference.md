# API Reference
## CLI
Runs the client CLI.
### validateInputs
If one of Token URL, Client ID, or Private Key are provided, checks that all three options are defined. If at least one of the inputs is missing, throws an error.

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
Kicks off Bulk Data `$export` operation, saves downloaded ndjson to the directory specified by the CLI options (`-d` flag), and generates HTML export report.

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

## FHIR Quality Measure (FQM)

### loadBundleFromFile
Asynchronously reads the contents of a given file containing a FHIR Bundle.

| Param         | Type     | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
| filename | `String` | File name |
| **Returns**   | `Promise<fhir4.Bundle>`  | Parsed JSON as a FHIR Bundle

### loadPatientBundlesFromDir
Asynchronously reads the contents of a given directory containing FHIR Patient Bundles.

| Param         | Type     | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
| path | `String` | Directory path |
| **Returns**   | `Promise<Bundle<FhirResource>[]>`  | Array of parsed JSON as FHIR Bundles


### calculateMeasureReports
Generates a summary FHIR Measure Report using the [fqm-execution](https://github.com/projecttacoma/fqm-execution)`calculateMeasureReports` function.

| Param         | Type     | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
| measureBundle | `fhir4.Bundle` | FHIR Measure Bundle |
| patientBundle | `fhir4.Bundle[]` | Array of FHIR Patient Bundles |
| options | `CalculatorTypes.CalculationOptions` | fqm-execution calculation options |
| **Returns**   | `Promise<CalculatorTypes.MRCalculationOutput>`  | MeasureReport resource summary according to standard https://www.hl7.org/fhir/measurereport.html

### retrieveParamsFromMeasureBundle
Populates the _type/_typeFilter parameters used in a bulk data export request. Retrieves the data requirements for the given measure bundle using the fqm-execution API function to use for _type and _typeFilter query construction. Throws error if data requirements are not defined on the results of the API function.

| Param         | Type     | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
| measureBundle | `fhir4.Bundle` | FHIR Measure Bundle |
| autoType | `boolean` | boolean specifying whether we want to auto-generate _type |
| autoTypeFilter | `boolean` | boolean specifying whether we want to auto-generate _typeFilter |
| options | `CalculatorTypes.CalculationOptions` | fqm-execution calculation options |
| **Returns**   | `Promise<{_type: string, _typeFilter: string}>`  | Object containing the populated _type and _typeFilter values

### constructParamsFromRequirements
Constructs the _type and _typeFilter parameters used in a bulk data export request by parsing the
data requirements for the measure bundle.

| Param         | Type     | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
| dataRequirements | `fhir4.DataRequirement[]` | Data requirements retrieved from FHIR Measure Bundle |
| autoType | `boolean` | boolean specifying whether we want to auto-generate _type |
| autoTypeFilter | `boolean` | boolean specifying whether we want to auto-generate _typeFilter |
| **Returns**   | `Promise<{_type: string, _typeFilter: string}>`  | Object containing the populated _type and _typeFilter values

## JSON Web Key (JWK)

### resolveJWK
Resolves JWK as part of the authorization process.

| Param         | Type     | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
| keyLocation | `string` | Path to file containing key |
| **Returns**   | `Promise<jose.JWK.Key>`  | JWK Key

## Log Events
Sets logging events for logging responses and status updates throughout the export process.

### setLoggingEvents
| Param         | Type     | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
| logger | `any` | Client logger |
| client | `any` | Client instance |
| **Returns**   | `void`  | 

## NDJSON to Bundle
Converts downloaded NDJSON content to FHIR Bundles for each patient in the requested FHIR Group.

### getNDJSONFromDir
Retrieves NDJSON content for a given file from a given directory.

| Param         | Type     | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
| dir | `String` | Path to directory containing downloaded NDJSON. |
| file | `String` | file name containing the resources to convert to NDJSON
| **Returns**   | `fhir4.FhirResource[]`  | Returns array of parsed NDJSON, cast to FHIR Resources

### findPatientFiles
Loops over all files in a given directory to infer which files contain Patient resources.

| Param         | Type     | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
| dir | `String` | Path to directory containing downloaded NDJSON. |
| **Returns**   | `string[]`  | Array of file names for files containing Patient resources

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
Generates HTML report containing statistics from completed export.

### createExportReport
Generates HTML export report from data collected throughout the `$export` operation. Includes export URL, number of polling requests, export and download duration, and the created file names.

| Param         | Type     | Description                                                               |
| ------------- | -------- | ------------------------------------------------------------------------- |
| file | `String` | NDJSON log file containing bulk export results |
| downloadDir | `String` | Download directory from CLI options |
| **Returns**   | `Promise<void>`  | &nbsp;                                                                    |


