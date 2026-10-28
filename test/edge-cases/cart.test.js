const { CART_URL, getJSON, deleteReq, uniqueId, waitUntilHealthy, getAnyProduct } = require('../helpers');

let product;
const cartIds = [];

beforeAll(async () => {
    await waitUntilHealthy(`${CART_URL}/health`, (body) => body.redis === true);
    product = await getAnyProduct();
});

afterAll(async () => {
    await Promise.all(cartIds.map((id) => deleteReq(`${CART_URL}/cart/${id}`)));
});

describe('/add validation', () => {
    test('rejects a non-numeric quantity', async () => {
        const { status, body } = await getJSON(`${CART_URL}/add/${uniqueId('cart-badqty')}/${encodeURIComponent(product.sku)}/abc`);
        expect(status).toBe(400);
        expect(body).toMatch(/quantity must be a number/i);
    });

    test('rejects a zero quantity', async () => {
        const { status, body } = await getJSON(`${CART_URL}/add/${uniqueId('cart-zeroqty')}/${encodeURIComponent(product.sku)}/0`);
        expect(status).toBe(400);
        expect(body).toMatch(/greater than zero/i);
    });

    test('adding the same sku twice merges quantity instead of duplicating the line', async () => {
        const cartId = uniqueId('cart-merge');
        cartIds.push(cartId);

        await getJSON(`${CART_URL}/add/${cartId}/${encodeURIComponent(product.sku)}/1`);
        const { status, body } = await getJSON(`${CART_URL}/add/${cartId}/${encodeURIComponent(product.sku)}/2`);

        expect(status).toBe(200);
        const matching = body.items.filter((i) => i.sku === product.sku);
        expect(matching.length).toBe(1);
        expect(matching[0].qty).toBe(3);
        expect(matching[0].subtotal).toBe(product.price * 3);
    });
});

describe('/update validation', () => {
    test('rejects a negative quantity', async () => {
        const cartId = uniqueId('cart-update-neg');
        cartIds.push(cartId);
        await getJSON(`${CART_URL}/add/${cartId}/${encodeURIComponent(product.sku)}/1`);

        const { status, body } = await getJSON(`${CART_URL}/update/${cartId}/${encodeURIComponent(product.sku)}/-1`);
        expect(status).toBe(400);
        expect(body).toMatch(/negative quantity/i);
    });

    test('returns 404 for a sku that is not in the cart', async () => {
        const cartId = uniqueId('cart-update-missing');
        cartIds.push(cartId);
        await getJSON(`${CART_URL}/add/${cartId}/${encodeURIComponent(product.sku)}/1`);

        const { status, body } = await getJSON(`${CART_URL}/update/${cartId}/NOT-IN-CART-SKU/1`);
        expect(status).toBe(404);
        expect(body).toMatch(/not in cart/i);
    });

    test('setting quantity to zero removes the line item entirely', async () => {
        const cartId = uniqueId('cart-update-zero');
        cartIds.push(cartId);
        await getJSON(`${CART_URL}/add/${cartId}/${encodeURIComponent(product.sku)}/1`);

        const { status, body } = await getJSON(`${CART_URL}/update/${cartId}/${encodeURIComponent(product.sku)}/0`);
        expect(status).toBe(200);
        expect(body.items.find((i) => i.sku === product.sku)).toBeUndefined();
    });
});

describe('unknown cart handling', () => {
    test('GET on a cart id that was never created returns 404', async () => {
        const { status, body } = await getJSON(`${CART_URL}/cart/${uniqueId('cart-never-created')}`);
        expect(status).toBe(404);
        expect(body).toMatch(/cart not found/i);
    });

    test('DELETE on a cart id that was never created returns 404', async () => {
        const { status } = await deleteReq(`${CART_URL}/cart/${uniqueId('cart-never-created-del')}`);
        expect(status).toBe(404);
    });

    test('/rename on a cart id that was never created returns 404', async () => {
        const { status } = await getJSON(`${CART_URL}/rename/${uniqueId('cart-rename-missing')}/${uniqueId('cart-rename-to')}`);
        expect(status).toBe(404);
    });
});