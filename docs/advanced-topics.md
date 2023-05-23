# Advanced Topics

## Patient Bundle Assembly
`bulk-data-export-client` creates files in the specified downloads directory containing the exported [Newline delimited JSON (NDJSON)](http://ndjson.org) content for each resource type.

`bulk-data-export-client` is able to construct FHIR Patient Bundles for all patients defined as `member`s of the exported  group. The procedure for constructing FHIR Patient Bundles is as follows:
1. Retrieves the FHIR Patient NDJSON from the specified downloads directory.
2. For each retrieved FHIR Patient, the client extracts the patient id and gathers all the resources across all other NDJSON files that reference the patient.

The client uses the [FHIR Patient Compartment Definition](http://hl7.org/fhir/R4/compartmentdefinition-patient.json.html) to create a mapping of each FHIR resource type to the possible ways it may reference a FHIR Patient. See [patient-attribute-paths.json](https://github.com/bulk-dqm/bulk-data-export-client/blob/main/src/compartment-definition/patient-attribute-paths.json) for the constructed mapping.

3. For each patient, constructs a FHIR Collection Bundle containing the FHIR Patient resource and all downloaded resources that reference the patient.
4. Writes the collection bundles to the `patientBundles` directory or the user-specified patient bundles directory.