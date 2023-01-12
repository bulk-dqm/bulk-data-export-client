# Bulk Data Export Client

CLI application for FHIR Bulk Data Export and FHIR-based quality measure calculation

- [Installation](#installation)

  - [Prerequisites](#prerequisites)
  - [Local Installation](#local-installation)
  - [Local Usage](#local-usage)
- [CLI Options](#cli-options)
- [License](#license)

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

## CLI Options
The supported options for making a request to a FHIR server are as follows:

```bash
-f, --fhir-url <FHIR URL>       FHIR server base URL.
-g, --group-id <id>             FHIR Group ID used to query FHIR server for resources.
-d, --destination <destination> Download destination of exported files.
-p, --parallel-downloads <number> Number of downloads to run in parallel.
--token-url <tokenUrl> Bulk Token Authorization Endpoint
--client-id <clientId> Bulk Data Client ID
--private-key <url> File containing private key used to sign authentication tokens
```
## License

Copyright 2022 The MITRE Corporation

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

```bash
http://www.apache.org/licenses/LICENSE-2.0
```

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
