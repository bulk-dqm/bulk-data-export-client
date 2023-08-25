import fs from 'fs';
import * as path from 'path';
import {
  getNDJSONFromDir,
  mapResourcesToCollectionBundle,
  assemblePatientBundle,
  findPatientFiles,
} from './ndjsonToBundle';

const PATIENT_NDJSON = fs.readFileSync(path.join(__dirname, '__fixtures__', 'testPatient.ndjson'), 'utf8');
const ENCOUNTER_NDJSON = fs.readFileSync(path.join(__dirname, '__fixtures__', 'testEncounter.ndjson'), 'utf8');
const CONDITION_NDJSON = fs.readFileSync(path.join(__dirname, '__fixtures__', 'testCondition.ndjson'), 'utf8');

const cleanUpTestDir = () => {
  if (fs.existsSync('./testDir')) fs.rmSync('./testDir', { recursive: true });
};

const setUpTestDir = async () => {
  fs.mkdirSync('./testDir');
  try {
    fs.writeFileSync('./testDir/Patient.ndjson', PATIENT_NDJSON);
    fs.writeFileSync('./testDir/Encounter.ndjson', ENCOUNTER_NDJSON);
    fs.writeFileSync('./testDir/Condition.ndjson', CONDITION_NDJSON);
  } catch (err) {
    console.error(err);
  }
};

describe('getNDJSONFromDir', () => {
  beforeAll(async () => {
    await setUpTestDir();
  });

  test('retrieves and parses NDJSON for Patient resource type', () => {
    expect(getNDJSONFromDir('testDir', 'Patient.ndjson')).toEqual([JSON.parse(PATIENT_NDJSON)]);
  });

  test('Returns empty array if directory does not contain file for resource type', () => {
    expect(getNDJSONFromDir('testDir', 'invalid-file.ndjson')).toEqual([]);
  });

  afterAll(cleanUpTestDir);
});

describe('findPatientFiles', () => {
  test('throws error if no Patient files can be found', () => {
    fs.mkdirSync('./testDir');
    try {
      findPatientFiles('./testDir');
    } catch (e) {
      if (e instanceof Error)
        expect(e.message).toEqual('No files containing patient data were found in the directory.');
    }
  });

  test('returns array of file names containing Patient resources', async () => {
    await setUpTestDir();
    const fileNames = findPatientFiles('./testDir');
    expect(fileNames).toEqual(['Patient.ndjson']);
  });
  afterEach(cleanUpTestDir);
});

describe('mapResourcesToCollectionBundle', () => {
  test('Creates FHIR collection bundle given array of resources', () => {
    const resources: fhir4.FhirResource[] = [JSON.parse(PATIENT_NDJSON), JSON.parse(ENCOUNTER_NDJSON)];
    const bundle = mapResourcesToCollectionBundle(resources);
    expect(bundle.type).toEqual('collection');
    expect(bundle.resourceType).toEqual('Bundle');
    expect(bundle.entry.length).toEqual(2);
    expect(bundle.entry[0].resource).toEqual(resources[0]);
    expect(bundle.entry[1].resource).toEqual(resources[1]);
  });
});

describe('assemblePatientBundle', () => {
  beforeAll(async () => {
    await setUpTestDir();
  });

  test('Creates FHIR collection bundle from filtered resources', () => {
    // checks Patient, Encounter, and Condition ndjson
    // Condition resource does not reference patient
    const bundle = assemblePatientBundle(JSON.parse(PATIENT_NDJSON), 'testDir');
    expect(bundle.entry.length).toEqual(2);
  });

  afterAll(cleanUpTestDir);
});
