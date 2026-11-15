if (typeof globalThis.require === 'undefined') {
  globalThis.require = (id) => ({ uri: id });
}
