// Base happy-path flow, carried over from roboshop-integration-tests: shipping's real
// HTTP call out to cart (CartHelper.addToCart -> POST /shipping/:id) must keep working.
const {
    CART_URL,
    SHIPPING_URL,
    getJSON,
    postJSON,
    deleteReq,
    uniqueId,
    waitUntilHealthy,
    getAnyProduct,
} = require('../helpers');

const cartIds = [];

beforeAll(async () => {
    await waitUntilHealthy(`${SHIPPING_URL}/health`, (body) => body === 'OK');
});

afterAll(async () => {
    await Promise.all(cartIds.map((id) => deleteReq(`${CART_URL}/cart/${id}`)));
});

test('POST /confirm/:id pushes a SHIP line item into an existing cart', async () => {
    const cartId = uniqueId('shipping-confirm');
    cartIds.push(cartId);

    const product = await getAnyProduct();
    await getJSON(`${CART_URL}/add/${cartId}/${encodeURIComponent(product.sku)}/1`);

    const { status, body } = await postJSON(`${SHIPPING_URL}/confirm/${cartId}`, {
        distance: 250,
        cost: 12.5,
        location: 'Regression Test City',
    });

    expect(status).toBe(200);
    const shipItem = body.items.find((i) => i.sku === 'SHIP');
    expect(shipItem).toBeDefined();
    expect(shipItem.price).toBe(12.5);

    const cartNow = await getJSON(`${CART_URL}/cart/${cartId}`);
    expect(cartNow.body.items.find((i) => i.sku === 'SHIP').price).toBe(12.5);
});