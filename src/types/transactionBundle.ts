/* eslint-disable @typescript-eslint/no-explicit-any */
export class CollectionBundle implements fhir4.Bundle {
    resourceType: 'Bundle';
    entry: fhir4.BundleEntry[];
    type: 'transaction';
  
    constructor() {
      this.resourceType = 'Bundle';
      this.type = 'transaction';
      this.entry = [];
    }
  
    addEntryFromResource(resource: fhir4.FhirResource): void {
      const request: fhir4.BundleEntryRequest = { method: 'POST', url: resource.resourceType };
  
      const newEntry: fhir4.BundleEntry = {
        resource: { ...resource },
        request
      };
      this.entry = [...this.entry, newEntry];
    }
  
    toJSON(): any {
      return {
        resourceType: this.resourceType,
        type: this.type,
        entry: [...this.entry]
      };
    }
  }