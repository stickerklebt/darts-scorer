// Mini-Testrunner ohne Abhängigkeiten:  node tests/run.mjs
const tests = [];
globalThis.test = (name, fn) => tests.push({ name, fn });

const files = ['checkout.test.mjs', 'x01.test.mjs', 'party.test.mjs', 'stats.test.mjs', 'bulloff.test.mjs', 'fx.test.mjs', 'bots.test.mjs', 'demo.test.mjs', 'cricket.test.mjs', 'server.test.mjs', 'history.test.mjs', 'aimboard.test.mjs', 'caller.test.mjs', 'trophies.test.mjs', 'bruch.test.mjs'];
for (const f of files) {
  globalThis.__file = f;
  const before = tests.length;
  await import(new URL(f, import.meta.url));
  for (let i = before; i < tests.length; i++) tests[i].file = f;
}

let failed = 0;
for (const t of tests) {
  try { await t.fn(); console.log(`  ✓ ${t.file} › ${t.name}`); }
  catch (e) { failed++; console.log(`  ✗ ${t.file} › ${t.name}\n      ${e.message.split('\n').join('\n      ')}`); }
}
console.log(`\n${tests.length - failed}/${tests.length} Tests bestanden`);
process.exit(failed ? 1 : 0);
