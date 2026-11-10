// Where the new items start, if `list` is `oldList` with items added at the
// end (items are never changed, only added). Else 0 = read everything again.
// newItemsStart([a, b], [a, b, c]) → 2      newItemsStart([a, b], [a, x]) → 0
export function newItemsStart(oldList, list) {
  const count = oldList?.length ?? 0;
  return count > 0 && list[count - 1] === oldList[count - 1] ? count : 0;
}
