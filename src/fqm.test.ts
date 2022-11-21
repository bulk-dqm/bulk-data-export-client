import { loadCMS122 } from './fqm';

test('loadCMS122 works', async () => {
  const cms122 = await loadCMS122()
  expect(cms122['resourceType']).toBe('Bundle');
})
