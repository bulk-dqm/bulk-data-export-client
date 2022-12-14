import { calculateMeasureReports, loadBundleFromFile, CalculatorTypes } from './fqm';

describe('loadBundleFromFile', () => {
  describe('given a Measure file that exists', () => {
    test('returns a FHIR Bundle object', async () => {
      const bundle = await loadBundleFromFile('src/__fixtures__/proportion-boolean-bundle.json');
      expect(bundle.resourceType).toBe('Bundle');
      expect(bundle.entry?.length).toBeGreaterThan(0);
      if (bundle.entry) {
        expect(bundle.entry[0]?.resource?.resourceType).toBe('Measure');
      }
    });
  });
});

describe('calculateMeasureReports', () => {
  let measureReports: CalculatorTypes.MRCalculationOutput;

  beforeAll(async () => {
    const calculationOptions: CalculatorTypes.CalculationOptions = {
      measurementPeriodStart: '2022-01-01',
      measurementPeriodEnd: '2022-12-31',
    };
    const measureBundle = await loadBundleFromFile('src/__fixtures__/proportion-boolean-bundle.json');
    const ippBundle = await loadBundleFromFile('src/__fixtures__/patient-ipp-bundle.json');
    const denomBundle = await loadBundleFromFile('src/__fixtures__/patient-denom-bundle.json');
    const numerBundle = await loadBundleFromFile('src/__fixtures__/patient-numer-bundle.json');
    measureReports = await calculateMeasureReports(
      measureBundle,
      [ippBundle, denomBundle, numerBundle],
      calculationOptions
    );
  });

  test('returns the expected number of reports', async () => {
    expect(Array.isArray(measureReports.results)).toBeTruthy();
    if (Array.isArray(measureReports.results)) {
      expect(measureReports.results.length).toBe(3);
    }
  });

  test('detects IPP populations correctly', () => {
    if (Array.isArray(measureReports.results) && measureReports.results[0] != null) {
      const populations = measureReports?.results?.[0].group?.[0]?.population;
      expect(populations?.find((pop) => pop?.code?.coding?.[0]?.code === 'initial-population')?.count).toBe(1);
      expect(populations?.find((pop) => pop?.code?.coding?.[0]?.code === 'numerator')?.count).toBe(0);
      expect(populations?.find((pop) => pop?.code?.coding?.[0]?.code === 'denominator')?.count).toBe(0);
    } else {
      fail('MeasureReport for IPP was not found');
    }
  });

  test('detects denominator populations correctly', () => {
    if (Array.isArray(measureReports.results) && measureReports.results[1] != null) {
      const populations = measureReports?.results?.[1].group?.[0]?.population;
      expect(populations?.find((pop) => pop?.code?.coding?.[0]?.code === 'initial-population')?.count).toBe(1);
      expect(populations?.find((pop) => pop?.code?.coding?.[0]?.code === 'numerator')?.count).toBe(0);
      expect(populations?.find((pop) => pop?.code?.coding?.[0]?.code === 'denominator')?.count).toBe(1);
    } else {
      fail('MeasureReport for IPP was not found');
    }
  });

  test('detects numerator populations correctly', () => {
    if (Array.isArray(measureReports.results) && measureReports.results[2] != null) {
      const populations = measureReports?.results?.[2].group?.[0]?.population;
      expect(populations?.find((pop) => pop?.code?.coding?.[0]?.code === 'initial-population')?.count).toBe(1);
      expect(populations?.find((pop) => pop?.code?.coding?.[0]?.code === 'numerator')?.count).toBe(1);
      expect(populations?.find((pop) => pop?.code?.coding?.[0]?.code === 'denominator')?.count).toBe(1);
    } else {
      fail('MeasureReport for IPP was not found');
    }
  });
});
