const { CATALOGUE_URL, getJSON, waitUntilHealthy } = require('../helpers');

beforeAll(async () => {
    await waitUntilHealthy(`${CATALOGUE_URL}/health`, (body) => body.mongo === true);
});

test('GET /product/:sku for an unknown sku returns 404, not 500', async () => {
    const { status } = await getJSON(`${CATALOGUE_URL}/product/NON-EXISTENT-SKU-${Date.now()}`);
    expect(status).toBe(404);
});

test('GET /products/:cat for a category with no products returns 200 and an empty array, not 404', async () => {
    const { status, body } = await getJSON(`${CATALOGUE_URL}/products/no-such-category-${Date.now()}`);
    expect(status).toBe(200);
    expect(body).toEqual([]);
});

test('GET /categories has no duplicate entries', async () => {
    const { status, body } = await getJSON(`${CATALOGUE_URL}/categories`);
    expect(status).toBe(200);
    expect(new Set(body).size).toBe(body.length);
});

test('GET /search/:text for a term nothing matches returns 200 and an empty array, not an error', async () => {
    const { status, body } = await getJSON(`${CATALOGUE_URL}/search/zzznomatchzzz-${Date.now()}`);
    expect(status).toBe(200);
    expect(body).toEqual([]);
});

test('GET /search/:text is case-insensitive', async () => {
    const { body: products } = await getJSON(`${CATALOGUE_URL}/products`);
    const withName = products.find((p) => p.name && /[a-zA-Z]/.test(p.name));
    if (!withName) {
        console.warn('No product with an alphabetic name — skipping case-insensitivity check');
        return;
    }
    const term = withName.name.split(' ')[0];
    const lower = await getJSON(`${CATALOGUE_URL}/search/${encodeURIComponent(term.toLowerCase())}`);
    const upper = await getJSON(`${CATALOGUE_URL}/search/${encodeURIComponent(term.toUpperCase())}`);
    expect(lower.status).toBe(200);
    expect(upper.status).toBe(200);
    expect(upper.body.map((p) => p.sku).sort()).toEqual(lower.body.map((p) => p.sku).sort());
});