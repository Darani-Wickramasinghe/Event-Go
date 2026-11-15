globalThis.require = (path) => ({ uri: path });

async function main() {
  const { runAllTests } = await import('./businessLogic.test.js');
  runAllTests();
}

main().catch((err) => {
  console.error('\nTest Suite Failed:', err.message);
  process.exit(1);
});
