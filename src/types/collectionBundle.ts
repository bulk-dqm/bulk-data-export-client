/* eslint-disable @typescript-eslint/no-explicit-any */
export class CollectionBundle implements fhir4.Bundle {
  resourceType: 'Bundle';
  entry: fhir4.BundleEntry[];
  type: 'collection';

  constructor() {
    this.resourceType = 'Bundle';
    this.type = 'collection';
    this.entry = [];
  }

  addEntryFromResource(resource: fhir4.FhirResource): void {
    const newEntry: fhir4.BundleEntry = {
      resource: { ...resource },
    };
    this.entry = [...this.entry, newEntry];
  }

  toJSON(): any {
    return {
      resourceType: this.resourceType,
      type: this.type,
      entry: [...this.entry],
    };
  }
}
