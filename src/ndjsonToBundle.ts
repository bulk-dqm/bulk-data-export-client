import fs from 'fs';
import path from 'path';

/**
 * Retrieves NDJSON content for a specified resource type.
 * @param dir directory containing downloaded NDJSON
 * @param resourceType resource type for which NDJSON should be returned
 */
export const getNDJSONFromDir = (dir: string, resourceType: string) => {
    const ndjsonFile = path.join(dir, `${resourceType}.ndjson`);
    if (fs.existsSync(dir)) {
        console.log((fs.readFileSync(ndjsonFile, 'utf8').split('\n')));
    }
};