<p align="center">
  <h1 align="center">Bulk Data Export Client</h1>
<div align="center">


CLI application for FHIR Bulk Data Export and FHIR-based quality measure calculation using the HL7® FHIR® standard<sup id="fn-1">[\[1\]](#fnref-1)</sup>

</div>
</p>

---

# Table of Contents
- [Introduction](#introduction)
- [Installation](#installation)
  - [Prerequisites](#prerequisites)
  - [Local Installation](#local-installation)
  - [Local Usage](#local-usage)
- [Quickstart Guide](#quickstart-guide)
  - [CLI Options](#cli-options)
  - [Three-Step Workflow](#three-step-workflow)
- [API Reference](#api-reference)
- [License](#license)

## Introduction
`bulk-data-export-client` is a reference implementation of a FHIR client that requests a bulk-data export from a server, receives status information regarding processing the requested files, and downloads the retrieved files. The capabilities of the client are restricted to Group-level data export.

Optionally, the client can perform calculation on FHIR-based Electronic Clinical Quality Measures (eCQMs) written in Clinical Quality Language (CQL) using the retrieved data from a successful bulk-data export operation. For more information on measure calculation, see the [fqm-execution](https://github.com/projecttacoma/fqm-execution) calculation library.

## Installation

### Prerequisites
- [Node.js Version 17](https://nodejs.org/en/)
- [Git](https://git-scm.com/)

### Local Installation

Clone the source code:

```bash
git clone git@github.com:bulk-dqm/bulk-data-export-client.git
```

Install dependencies:

```bash
npm install
```
### Local Usage
Run the CLI with ts-node:

```bash
npm run cli -- [options]
```

Or using the built JavaScript:

```bash
npm run build
node build/cli.js [options]
```

## Quickstart Guide

### CLI Options
The supported options for making a request to a FHIR server are as follows:

```bash
-f, --fhir-url <FHIR URL>       FHIR server base URL.
-g, --group-id <id>             FHIR Group ID used to query FHIR server for resources.
-m, --measure-bundle <measure-bundle> Path to measure bundle.
-b, --patient-bundles <patient-bundles> Directory containing patient bundles. Defaults to ./patientBundles.
-d, --destination <destination> Download destination of exported files. Defaults to ./downloads.
-p, --parallel-downloads <number> Number of downloads to run in parallel.
--token-url <tokenUrl> Bulk Token Authorization Endpoint
--client-id <clientId> Bulk Data Client ID
--private-key <url> File containing private key used to sign authentication tokens
-l, --log-file <file-path> Path to a log file to write logs to. Defaults to log.ndjson.
-o, --output-path <path> Output path for FHIR MeasureReports produced from measure evaluation. Defaults to output.json
--reporter [cli|text] Reporter to use to render the output. "cli" renders fancy progress bars and tables. "text" is better for log files. Defaults to "cli".
--lenient Sets a "Prefer: handling=lenient" request header to tell the server to ignore unsupported parameters.
-t, --_type <resourceTypes> String of comma-delimited FHIR resource types. If omitted, exports resources of all resource types.
-s, --_since <date> Only include resources modified after the specified date. The parameter can be provided as a partial date.
-q, --_typeFilter <string> Experimental _typeFilter parameter. Represents a string of comma delimited FHIR REST queries.
--config <path> Relative path to a config file. Otherwise uses default options.
```

### Three-Step Workflow
The CLI logic can be categorized into three main processes:

<ol>
  <li>Execute bulk data $export by interacting with a FHIR server. The exported NDJSON files are downloaded to the specified download directory.</li>
  <li>Create FHIR patient bundles from the exported NDJSON. The FHIR patient bundles are saved to the specified patient bundles directory.</li>
  <li>Run measure calculation on the FHIR patient bundles using the fqm-execution measure calculation library</li>
</ol>

The user can run the application end-to-end or run a subset of these steps. To run a subset of the steps, follow the CLI configuration options below.

#### Running Step 1 Only
Required CLI flags:
```bash
-f, --fhir-url <FHIR URL>
-g, --group-id <id>
```
This runs a bulk `$export` request and saves the exported NDJSON to the downloads directory, and then terminates.  The `-m` flag should *not* be provided, as it causes the workflow to continue with Steps 2 and 3.

#### Running Step 2 Only
Required CLI flags:
```bash
-d, --destination <destination>
```
This uses the specified download destination to gather the NDJSON and create FHIR patient bundles. The `-b` flag can be specified to indicate a custom patient bundles directory. The `-f`, `-g`, and `-m` flags should *not* be provided.

#### Running Step 3 Only
Required CLI flags:
```bash
-b, --patient-bundles <patient-bundles>
-m, --measure-bundle <measure-bundle>
```
This uses the FHIR patient bundles from the patient bundles directory along with the specified measure bundle to perform measure calculation with the [fqm-execution measure calculation library](https://github.com/projecttacoma/fqm-execution).

#### Running Steps 1 and 2
Required CLI flags:
```bash
-f, --fhir-url <FHIR URL>
-g, --group-id <id>
-b, --patient-bundles <patient-bundles>
```
The `-m` flag should not be provided, as it triggers Step 3.

#### Running Steps 2 and 3
Required CLI flags:
```bash
-d, --destination <destination>
-m, --measure-bundle <measure-bundle>
```

#### Running all 3 Steps
Required CLI flags:
```bash
-f, --fhir-url <FHIR URL>
-g, --group-id <id>
-m, --measure-bundle <measure-bundle>
```
The `-d` and `-b` flags may also be provideed to specify storage directories. If not provided, the end-to-end workflow will use the default directory paths.

## License

Copyright 2022 The MITRE Corporation

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

```bash
http://www.apache.org/licenses/LICENSE-2.0
```

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

---

<strong id="fnref-1">[\[1\]](#fn-1) FHIR® is the registered trademark of Health Level Seven International (HL7). </strong>
