import fs from 'fs';
import path from 'path';
import { getSearchParameters } from '@projecttacoma/node-fhir-server-core';

const compartmentDefPath = path.resolve(
  path.join(__dirname, '../src/compartment-definition/compartmentdefinition-patient.json')
);
const outputPath = path.resolve(path.join(__dirname, '../src/compartment-definition/patient-attribute-paths.json'));
const jsonStr = fs.readFileSync(compartmentDefPath, 'utf8');

/**
 * Parse Patient compartment definition for search parameter keywords
 * @param {string} compartmentJson the string content of the patient compartment definition json file
 * @return {Object} object whose keys are resourceTypes and values are arrays of strings to use to reference a patient
 */
const parse = async (compartmentJson) => {
  const compartmentDefinition = await JSON.parse(compartmentJson);
  const attrResults = {};

  compartmentDefinition.resource.forEach((resourceObj) => {
    if (resourceObj.param) {
      attrResults[resourceObj.code] = [];
      // gets the search parameters for a given resource on a specific version
      const searchParameterList = getSearchParameters(resourceObj.code, '4_0_0').filter((objs) =>
        resourceObj.param?.includes(objs.name)
      );
      searchParameterList.forEach((obj) => {
        // retrieve xpath and remove resource type from beginning
        attrResults[resourceObj.code].push(obj.xpath.substr(obj.xpath.indexOf('.') + 1));
      });
    }
  });
  return attrResults;
};

parse(jsonStr)
  .then((attrResults) => {
    fs.writeFileSync(outputPath, JSON.stringify(attrResults, null, 2), 'utf8');
    console.log(`Wrote file to ${outputPath}`);
  })
  .catch((e) => {
    console.error(e);
  });
