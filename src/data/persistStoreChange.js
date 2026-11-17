// Saves a proposed local change before applying it to visible state.
// A legacy immediate update can arrive while a confirmed write is in flight.
// Reapply the change to the latest state before publishing it to the UI.
export async function persistStoreChange(read, write, apply, change) {
  let current;
  let next;
  do {
    current = read();
    next = change(current);
    await write(next);
  } while (read() !== current);
  apply(next);
  return next;
}
