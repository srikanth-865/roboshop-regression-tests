const { PAYMENT_URL, postJSON, uniqueId, waitUntilHealthy } = require('../helpers');

beforeAll(async () => {
    await waitUntilHealthy(`${PAYMENT_URL}/health`, (body) => body === 'OK');
});

test('rejects an empty cart as not valid', async () => {
    const { status, body } = await postJSON(`${PAYMENT_URL}/pay/${uniqueId('pay-empty')}`, { total: 0, tax: 0, items: [] });
    expect(status).toBe(400);
    expect(body).toMatch(/cart not valid/i);
});

test('rejects a cart with a nonzero total but no SHIP line', async () => {
    const { status, body } = await postJSON(`${PAYMENT_URL}/pay/${uniqueId('pay-noship')}`, {
        total: 25,
        tax: 5,
        items: [{ sku: 'SOME-SKU', qty: 1, price: 25, subtotal: 25 }],
    });
    expect(status).toBe(400);
    expect(body).toMatch(/cart not valid/i);
});

test('a malformed cart body (missing items) fails as a handled error, not a hang', async () => {
    const { status } = await postJSON(`${PAYMENT_URL}/pay/${uniqueId('pay-malformed')}`, { total: 10 });
    expect(status).toBeGreaterThanOrEqual(400);
});