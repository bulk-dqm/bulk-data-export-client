import {
  calculateMeasureReports,
  loadBundleFromFile,
  CalculatorTypes,
  constructParamsFromRequirements,
  retrieveParamsFromMeasureBundle,
} from './fqm';
import { Calculator } from 'fqm-execution';

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

describe('retrieveParamsFromMeasureBundle', () => {
  test('throws error for empty data requirements', async () => {
    const measureBundle = await loadBundleFromFile('src/__fixtures__/proportion-boolean-bundle.json');
    const drSpy = jest.spyOn(Calculator, 'calculateDataRequirements').mockImplementation(async () => {
      return {
        results: {
          resourceType: 'Library',
          type: {
            coding: [{ code: 'module-definition', system: 'http://terminology.hl7.org/CodeSystem/library-type' }],
          },
          status: 'draft',
        },
      };
    });

    try {
      await retrieveParamsFromMeasureBundle(measureBundle, true, true);
    } catch (e) {
      if (e instanceof Error)
        expect(e.message).toEqual('Data requirements array is not defined for the Library. Aborting $export request.');
    }
    expect(drSpy.mock.calls.length).toBe(1);
  });
});

describe('constructParamsFromRequirements', () => {
  const MULTIPLE_DR: fhir4.DataRequirement[] = [
    {
      type: 'Procedure',
      codeFilter: [
        {
          path: 'type',
          valueSet: 'TEST_VALUE_SET',
        },
      ],
    },
    {
      type: 'Encounter',
      codeFilter: [
        {
          path: 'code',
          valueSet: 'TEST_VALUE_SET',
        },
      ],
    },
  ];

  const DR_WITH_MULTIPLE_CODEFILTERS: fhir4.DataRequirement[] = [
    {
      type: 'Encounter',
      codeFilter: [
        {
          path: 'status',
          code: [
            {
              code: 'finished',
              system: 'http://hl7.org/fhir/encounter-status',
            },
          ],
        },
        {
          path: 'code',
          valueSet: 'TEST_VALUE_SET',
        },
      ],
    },
  ];

  const DR_WITH_DIRECT_REFERENCE_CODE: fhir4.DataRequirement[] = [
    {
      type: 'Observation',
      codeFilter: [
        {
          path: 'code',
          code: [
            {
              system: 'http://loinc.org',
              display: 'Functional Assessment of Chronic Illness Therapy - Palliative Care Questionnaire (FACIT-Pal)',
              code: '71007-9',
            },
          ],
        },
        {
          path: 'status',
          code: [
            {
              code: 'final',
              system: 'http://hl7.org/fhir/observation-status',
            },
            {
              code: 'amended',
              system: 'http://hl7.org/fhir/observation-status',
            },
            {
              code: 'corrected',
              system: 'http://hl7.org/fhir/observation-status',
            },
          ],
        },
      ],
    },
  ];
  const AUTO_TYPE_TRUE = true;
  const AUTO_TYPE_FALSE = false;
  const AUTO_TYPEFILTER_TRUE = true;
  const AUTO_TYPEFILTER_FALSE = false;
  test('generates _type query for a single resource type', () => {
    expect(constructParamsFromRequirements([{ type: 'Patient' }], AUTO_TYPE_TRUE, AUTO_TYPEFILTER_FALSE)).toEqual({
      _type: 'Patient',
    });
  });

  test('generates _type query for multiple resource types', () => {
    expect(constructParamsFromRequirements(MULTIPLE_DR, AUTO_TYPE_TRUE, AUTO_TYPEFILTER_FALSE)).toEqual({
      _type: 'Procedure,Encounter',
    });
  });

  test('generates _typeFilter query for multiple resource types', () => {
    expect(constructParamsFromRequirements(MULTIPLE_DR, AUTO_TYPE_FALSE, AUTO_TYPEFILTER_TRUE)).toEqual({
      _typeFilter: 'Procedure?type:in=TEST_VALUE_SET,Encounter?code:in=TEST_VALUE_SET',
    });
  });

  test('generates _type and _typeFilter for multiple resource types', () => {
    expect(constructParamsFromRequirements(MULTIPLE_DR, AUTO_TYPE_TRUE, AUTO_TYPEFILTER_TRUE)).toEqual({
      _type: 'Procedure,Encounter',
      _typeFilter: 'Procedure?type:in=TEST_VALUE_SET,Encounter?code:in=TEST_VALUE_SET',
    });
  });

  test('generates _typeFilter when multiple codeFilters are present on a data requirement', () => {
    expect(
      constructParamsFromRequirements(DR_WITH_MULTIPLE_CODEFILTERS, AUTO_TYPE_FALSE, AUTO_TYPEFILTER_TRUE)
    ).toEqual({
      _typeFilter: 'Encounter?code:in=TEST_VALUE_SET',
    });
  });

  test('generates _typeFilter for direct reference code', () => {
    expect(
      constructParamsFromRequirements(DR_WITH_DIRECT_REFERENCE_CODE, AUTO_TYPE_FALSE, AUTO_TYPEFILTER_TRUE)
    ).toEqual({
      _typeFilter: 'Observation?code=71007-9',
    });
  });

  test('generates _typeFilter for date filter with valueDateTime', () => {
    const DR_WITH_VALUE_DATETIME: fhir4.DataRequirement[] = [
      {
        type: 'Observation',
        dateFilter: [
          {
            path: 'testPath',
            valueDateTime: '2022-01-01T00:00:00.000Z',
          },
        ],
      },
    ];
    expect(constructParamsFromRequirements(DR_WITH_VALUE_DATETIME, AUTO_TYPE_FALSE, AUTO_TYPEFILTER_TRUE)).toEqual({
      _typeFilter: 'Observation?testPath=eq2022-01-01T00:00:00.000Z',
    });
  });

  test('generates _typeFilter for date filter with valuePeriod (no end)', () => {
    const DR_WITH_VALUE_PERIOD: fhir4.DataRequirement[] = [
      {
        type: 'Observation',
        dateFilter: [
          {
            path: 'testPath',
            valuePeriod: {
              start: '2022-01-01T00:00:00.000Z',
            },
          },
        ],
      },
    ];
    expect(constructParamsFromRequirements(DR_WITH_VALUE_PERIOD, AUTO_TYPE_FALSE, AUTO_TYPEFILTER_TRUE)).toEqual({
      _typeFilter: 'Observation?testPath=ge2022-01-01T00:00:00.000Z',
    });
  });

  test('generates _typeFilter for date filter with valuePeriod (no start)', () => {
    const DR_WITH_VALUE_PERIOD: fhir4.DataRequirement[] = [
      {
        type: 'Observation',
        dateFilter: [
          {
            path: 'testPath',
            valuePeriod: {
              end: '2022-01-01T00:00:00.000Z',
            },
          },
        ],
      },
    ];
    expect(constructParamsFromRequirements(DR_WITH_VALUE_PERIOD, AUTO_TYPE_FALSE, AUTO_TYPEFILTER_TRUE)).toEqual({
      _typeFilter: 'Observation?testPath=le2022-01-01T00:00:00.000Z',
    });
  });

  test('generates _typeFilter for date filter with valuePeriod (start and end)', () => {
    const DR_WITH_VALUE_PERIOD: fhir4.DataRequirement[] = [
      {
        type: 'Observation',
        dateFilter: [
          {
            path: 'testPath',
            valuePeriod: {
              start: '2022-01-01T00:00:00.000Z',
              end: '2022-12-31T00:00:00.000Z',
            },
          },
        ],
      },
    ];
    expect(constructParamsFromRequirements(DR_WITH_VALUE_PERIOD, AUTO_TYPE_FALSE, AUTO_TYPEFILTER_TRUE)).toEqual({
      _typeFilter: 'Observation?testPath=ge2022-01-01T00:00:00.000Z&testPath=le2022-12-31T00:00:00.000Z',
    });
  });

  test('generates _typeFilter for date filter with valuePeriod (invalid start and end)', () => {
    const DR_WITH_VALUE_PERIOD: fhir4.DataRequirement[] = [
      {
        type: 'Observation',
        dateFilter: [
          {
            path: 'testPath',
            valuePeriod: {
              start: '2022-12-31T00:00:00.000Z',
              end: '2022-01-01T00:00:00.000Z',
            },
          },
        ],
      },
    ];
    try {
      constructParamsFromRequirements(DR_WITH_VALUE_PERIOD, AUTO_TYPE_FALSE, AUTO_TYPEFILTER_TRUE);
    } catch (e) {
      if (e instanceof Error)
        expect(e.message).toEqual('Date filter start value SHALL have a lower or equal value than end.');
    }
  });

  test('generates _typeFilter for date filter for valueDuration with comparator defined', () => {
    const DR_WITH_VALUE_DURATION: fhir4.DataRequirement[] = [
      {
        type: 'Observation',
        dateFilter: [
          {
            path: 'testPath',
            valueDuration: {
              comparator: '>',
              value: 10,
            },
          },
        ],
      },
    ];
    expect(constructParamsFromRequirements(DR_WITH_VALUE_DURATION, AUTO_TYPE_FALSE, AUTO_TYPEFILTER_TRUE)).toEqual({
      _typeFilter: 'Observation?testPath=gt10',
    });
  });

  test('generates _typeFilter for date filter with valueDuration without comparator defined', () => {
    const DR_WITH_VALUE_DURATION: fhir4.DataRequirement[] = [
      {
        type: 'Observation',
        dateFilter: [
          {
            path: 'testPath',
            valueDuration: {
              value: 10,
            },
          },
        ],
      },
    ];
    expect(constructParamsFromRequirements(DR_WITH_VALUE_DURATION, AUTO_TYPE_FALSE, AUTO_TYPEFILTER_TRUE)).toEqual({
      _typeFilter: 'Observation?testPath=eq10',
    });
  });

  test('generates _typeFilter for date filter with valueDuration with value, system, and code', () => {
    const DR_WITH_VALUE_DURATION: fhir4.DataRequirement[] = [
      {
        type: 'Observation',
        dateFilter: [
          {
            path: 'testPath',
            valueDuration: {
              value: 10,
              system: 'testSystem',
              code: 'testCode',
            },
          },
        ],
      },
    ];
    expect(constructParamsFromRequirements(DR_WITH_VALUE_DURATION, AUTO_TYPE_FALSE, AUTO_TYPEFILTER_TRUE)).toEqual({
      _typeFilter: 'Observation?testPath=eq10|testSystem|testCode',
    });
  });

  test('generates _typeFilter for date filter with valueDuration with value and code', () => {
    const DR_WITH_VALUE_DURATION: fhir4.DataRequirement[] = [
      {
        type: 'Observation',
        dateFilter: [
          {
            path: 'testPath',
            valueDuration: {
              value: 10,
              code: 'testCode',
            },
          },
        ],
      },
    ];
    expect(constructParamsFromRequirements(DR_WITH_VALUE_DURATION, AUTO_TYPE_FALSE, AUTO_TYPEFILTER_TRUE)).toEqual({
      _typeFilter: 'Observation?testPath=eq10||testCode',
    });
  });
});
