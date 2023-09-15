# Advanced Topics

## Patient Bundle Assembly
`bulk-data-export-client` creates files in the specified downloads directory containing the exported [Newline delimited JSON (NDJSON)](http://ndjson.org) content for each resource type.

`bulk-data-export-client` is able to construct FHIR Patient Bundles for all patients defined as `member`s of the exported  group. The procedure for constructing FHIR Patient Bundles is as follows:
1. Retrieves the FHIR Patient NDJSON from the specified downloads directory.
2. For each retrieved FHIR Patient, the client extracts the patient id and gathers all the resources across all other NDJSON files that reference the patient.

The client uses the [FHIR Patient Compartment Definition](http://hl7.org/fhir/R4/compartmentdefinition-patient.json.html) to create a mapping of each FHIR resource type to the possible ways it may reference a FHIR Patient. See [patient-attribute-paths.json](https://github.com/bulk-dqm/bulk-data-export-client/blob/main/src/compartment-definition/patient-attribute-paths.json) for the constructed mapping.

3. For each patient, constructs a FHIR Collection Bundle containing the FHIR Patient resource and all downloaded resources that reference the patient.
4. Writes the collection bundles to the `patientBundles` directory or the user-specified patient bundles directory.

## Automatic `_type` and `_typeFilter` Population
Optionally, the client can automatically populate the `_type` and/or `_typeFilter` parameters using the data requirements of a provided FHIR Measure.

To automatically populate the `_type` parameter prior to sending a Bulk Data Export kick-off request, the `--auto-populate-type` CLI flag must be specified, and a measure bundle path must also be specified. When present, the data requirements output will override any input provided by the `--_type` flag.

To automatically populate the `_typeFilter` parameter prior to sending a Bulk Data Export kick-off request, the `--auto-populate-typeFilter` CLI flag must be specified, and a measure bundle path must also be specified. When present, the data requirements output will override any input provided by the `--_typeFilter` flag.

The client retrieves the data requirements for the given measure using the [fqm-execution](https://github.com/projecttacoma/fqm-execution) `calculateDataRequirements` API function, and then extracts the `type`s from each data requirement that gets returned from the API function to populate the `_type` parameter. The client extracts the `codeFilter`s and `dateFilter`s from each data requirement to populate the `_typeFilter` parameter with the corresponding queries.

The `--auto-populate-type` and `--auto-populate-typeFilter` options can specified independently by the client. Note that specifying only one of these options may result in a server-side error if the server requires that `_type` be supplied alongside `_typeFilter`. The server may throw an error if it does not support the `:in` operator for `_typeFilter` queries.

## Measure Report Generation
When a path to a measure bundle is specified, the application runs measure calculation against all the patients that are members of the FHIR Group used for Group Export. The client uses the [fqm-execution](https://github.com/projecttacoma/fqm-execution) `calculateMeasureReports` API function to generate a FHIR MeasureReport of type `summary` that contains a measure score across all the patients.

## Export Report Generation
Upon successful export and download, an HTML report is generated for the completed export requests. This report is generated in the downloads directory and contains data about the export like the URL, the number of polling requests, the number of downloaded files and resources, and the export and download durations.