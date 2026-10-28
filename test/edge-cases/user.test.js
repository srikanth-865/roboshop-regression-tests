const { USER_URL, getJSON, postJSON, uniqueId, waitUntilHealthy } = require('../helpers');

beforeAll(async () => {
    await waitUntilHealthy(`${USER_URL}/health`, (body) => body.mongo === true);
});

describe('/register validation', () => {
    test('rejects a payload missing required fields', async () => {
        const { status, body } = await postJSON(`${USER_URL}/register`, { name: uniqueId('user-incomplete') });
        expect(status).toBe(400);
        expect(body).toMatch(/insufficient data/i);
    });

    test('rejects registering the same name twice', async () => {
        const name = uniqueId('user-dup');
        const payload = { name, password: 'p@ssw0rd', email: `${name}@example.com` };

        const first = await postJSON(`${USER_URL}/register`, payload);
        expect(first.status).toBe(200);

        const second = await postJSON(`${USER_URL}/register`, payload);
        expect(second.status).toBe(400);
        expect(second.body).toMatch(/already exists/i);
    });
});

describe('/login validation', () => {
    test('rejects an unknown username', async () => {
        const { status, body } = await postJSON(`${USER_URL}/login`, { name: uniqueId('user-unknown'), password: 'whatever' });
        expect(status).toBe(404);
        expect(body).toMatch(/name not found/i);
    });

    test('rejects the wrong password for a real user', async () => {
        const name = uniqueId('user-wrongpw');
        await postJSON(`${USER_URL}/register`, { name, password: 'correct-password', email: `${name}@example.com` });

        const { status, body } = await postJSON(`${USER_URL}/login`, { name, password: 'wrong-password' });
        expect(status).toBe(404);
        expect(body).toMatch(/incorrect password/i);
    });
});

test('/check/:id returns 404 for an id with no user record', async () => {
    const { status } = await getJSON(`${USER_URL}/check/${uniqueId('user-nonexistent')}`);
    expect(status).toBe(404);
});

test('/history/:id returns 404 when no order history exists yet', async () => {
    const { status, body } = await getJSON(`${USER_URL}/history/${uniqueId('user-no-history')}`);
    expect(status).toBe(404);
    expect(body).toMatch(/history not found/i);
});

test('/order/:id for an unregistered user returns 404, not a silently created record', async () => {
    const { status, body } = await postJSON(`${USER_URL}/order/${uniqueId('user-unregistered-order')}`, { orderid: 'test-order' });
    expect(status).toBe(404);
    expect(body).toMatch(/name not found/i);
});

test('multiple orders for the same user accumulate in history rather than overwrite', async () => {
    const name = uniqueId('user-multi-order');
    await postJSON(`${USER_URL}/register`, { name, password: 'p@ssw0rd', email: `${name}@example.com` });

    await postJSON(`${USER_URL}/order/${name}`, { orderid: 'order-1' });
    await postJSON(`${USER_URL}/order/${name}`, { orderid: 'order-2' });

    const { status, body } = await getJSON(`${USER_URL}/history/${name}`);
    expect(status).toBe(200);
    expect(body.history.map((h) => h.orderid)).toEqual(['order-1', 'order-2']);
});

test('/uniqueid returns a distinct anonymous id on each call', async () => {
    const first = await getJSON(`${USER_URL}/uniqueid`);
    const second = await getJSON(`${USER_URL}/uniqueid`);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.uuid).not.toBe(second.body.uuid);
});