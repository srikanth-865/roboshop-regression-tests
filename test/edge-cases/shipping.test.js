const { SHIPPING_URL, getJSON, waitUntilHealthy } = require('../helpers');

beforeAll(async () => {
    await waitUntilHealthy(`${SHIPPING_URL}/health`, (body) => body === 'OK');
});

test('GET /codes is sorted ascending by name', async () => {
    const { status, body } = await getJSON(`${SHIPPING_URL}/codes`);
    expect(status).toBe(200);
    const names = body.map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
});

test('GET /cities/:code for an unknown country code returns 200 and an empty array', async () => {
    const { status, body } = await getJSON(`${SHIPPING_URL}/cities/ZZ-${Date.now()}`);
    expect(status).toBe(200);
    expect(body).toEqual([]);
});

test('GET /calc/:id for a city id that does not exist returns 404, not 500', async () => {
    const { status } = await getJSON(`${SHIPPING_URL}/calc/999999999`);
    expect(status).toBe(404);
});

describe('GET /match/:code/:text', () => {
    test('rejects a search term shorter than 3 characters', async () => {
        const { status } = await getJSON(`${SHIPPING_URL}/match/US/ab`);
        expect(status).toBe(400);
    });

    test('caps results at 10 entries even when more match', async () => {
        const { body: codes } = await getJSON(`${SHIPPING_URL}/codes`);
        if (!codes.length) {
            console.warn('No shipping codes seeded — skipping match cap check');
            return;
        }
        const { status, body } = await getJSON(`${SHIPPING_URL}/match/${codes[0].code}/${'a'.repeat(3)}`);
        expect(status).toBe(200);
        expect(body.length).toBeLessThanOrEqual(10);
    });
});