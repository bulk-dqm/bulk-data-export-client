import { loadCMS122, evaluateCMS122ForPatient } from './fqm';
import { readFile } from 'fs/promises';
import * as path from 'path';

const loadPatientBundle = async (filename: string): Promise<fhir4.Bundle[]> => {
  const data = await readFile(path.join(__dirname, '__fixtures__', filename), 'utf8');
  return [JSON.parse(data)] as fhir4.Bundle[];
};

test('loadCMS122 works', async () => {
  const cms122 = await loadCMS122();
  expect(cms122.resourceType).toBe('Bundle');
});

test('evaluateCMS122ForPatient against denom', async () => {
  const denom = await loadPatientBundle('tests-denom-CMS122-Patient-bundle.json');
  const results = await evaluateCMS122ForPatient(denom, {
    measurementPeriodStart: '2019-01-01T00:00:00-07:00',
    measurementPeriodEnd: '2019-12-31T00:00:00-07:00',
  });
  let mr;
  if (Array.isArray(results.results)) {
    expect(results.results.length).toBe(1);
    mr = results.results[0];
  } else {
    mr = results.results;
  }
  expect(mr.group).not.toBeUndefined();
  if (mr.group != undefined) {
    expect(mr.group.length).toBe(1);
    expect(mr.group[0]?.measureScore?.value).toBe(1);
  }
});

test('evaluateCMS122ForPatient works with default arguments', async () => {
  const denom = await loadPatientBundle('tests-denom-CMS122-Patient-bundle.json');
  const results = await evaluateCMS122ForPatient(denom);
  let mr;
  if (Array.isArray(results.results)) {
    expect(results.results.length).toBe(1);
    mr = results.results[0];
  } else {
    mr = results.results;
  }
  expect(mr.group).not.toBeUndefined();
  if (mr.group != undefined) {
    expect(mr.group.length).toBe(1);
    expect(mr.group[0]?.measureScore?.value).toBe(0);
  }
});
