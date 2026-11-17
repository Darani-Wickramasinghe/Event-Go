// Provides simple test helpers and an asset import substitute when running under Node.
if (typeof globalThis.require === 'undefined') {
  globalThis.require = (id) => ({ uri: id });
}

if (typeof globalThis.describe === 'undefined') {
  globalThis.describe = (name, fn) => {
    console.log(`\n--- ${name} ---`);
    fn();
  };
  globalThis.test = (name, fn) => {
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    }
  };
  globalThis.expect = (actual) => ({
    toBe: (expected) => {
      if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toEqual: (expected) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toHaveLength: (expected) => {
      if (!actual || actual.length !== expected) throw new Error(`Expected length ${expected}, got ${actual?.length}`);
    },
  });
}
