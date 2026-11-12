const BASE = 'http://localhost:4000/api';

async function call(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* 204 */ }
  return { status: res.status, data };
}

let failures = 0;
const check = (name, cond, extra) => {
  if (cond) console.log(`PASS  ${name}`);
  else { failures++; console.log(`FAIL  ${name}`, extra ?? ''); }
};

// 1. Unauthenticated request must be rejected
check('unauthenticated GET rejected (401)', (await call('GET', '/procurement/suppliers')).status === 401);

// 2. Garbage token rejected (JWT verification works)
check('garbage token rejected (401)', (await call('GET', '/procurement/suppliers', null, 'not.a.token')).status === 401);

// 3. Login with seeded superadmin
const login = await call('POST', '/auth/login', { username: 'superadmin', password: 'Super@123' });
check('superadmin login (200 + token)', login.status === 200 && typeof login.data?.token === 'string', JSON.stringify(login));
const token = login.data.token;

// 4. Wrong password rejected
check('wrong password rejected (401)', (await call('POST', '/auth/login', { username: 'superadmin', password: 'nope' })).status === 401);

// 5. Validation: empty body rejected
check('empty POST body rejected (400)', (await call('POST', '/procurement/suppliers', {}, token)).status === 400);

// 6. Create supplier
const created = await call('POST', '/procurement/suppliers', { name: 'Test Supplier ' + Date.now(), phone_number: '123-456' }, token);
check('create supplier (201)', created.status === 201 && typeof created.data?.id === 'string', JSON.stringify(created));
const supId = created.data.id;

// 7. UUID format id (not Date.now())
check('id is a UUID', /^[0-9a-f-]{36}$/.test(supId));

// 8. Update supplier
const updated = await call('PUT', `/procurement/suppliers/${supId}`, { phone_number: 'updated' }, token);
check('update supplier (200, persisted)', updated.status === 200 && updated.data?.phone_number === 'updated');

// 9. List shows it
const list = await call('GET', '/procurement/suppliers', null, token);
check('list suppliers contains created one', Array.isArray(list.data) && list.data.some((s) => s.id === supId));

// 10. Users list must NOT contain password_hash
const users = await call('GET', '/users/users', null, token);
check('users list has no password_hash', users.status === 200 && Array.isArray(users.data) && users.data.every((u) => !('password_hash' in u)), JSON.stringify(users.data?.[0] ?? {}).slice(0, 200));

// 11. Cannot write password_hash through generic CRUD
const sneaky = await call('POST', '/procurement/suppliers', { name: 'sneaky', password_hash: 'hacked' }, token);
check('password_hash field ignored on POST', sneaky.status === 201 && !('password_hash' in (sneaky.data ?? {})));

// 12. Bulk delete
check('bulk DELETE suppliers (204)', (await call('DELETE', '/procurement/suppliers', null, token)).status === 204);
const afterClear = await call('GET', '/procurement/suppliers', null, token);
check('suppliers empty after bulk delete', afterClear.data.length === 0);

// 13. Delete individual (404 after clear)
check('DELETE missing id (404)', (await call('DELETE', `/procurement/suppliers/${supId}`, null, token)).status === 404);

// 14. Cleanup test user rows created by earlier tests
console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
