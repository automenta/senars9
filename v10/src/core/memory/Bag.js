/**
 * Bag class - A collection of items with priorities, with a max size.
 * This is a helper class for Concept.
 */
export class Bag {
  constructor(maxSize) {
    this._items = new Map();
    this._maxSize = maxSize;
  }

  get size() {
    return this._items.size;
  }

  get maxSize() {
    return this._maxSize;
  }

  add(item, priority) {
    if (this._items.has(item)) {
      return false;
    }
    if (this.size >= this.maxSize) {
      this._removeLowestPriorityItem();
    }
    this._items.set(item, priority);
    return true;
  }

  remove(item) {
    return this._items.delete(item);
  }

  contains(item) {
    return this._items.has(item);
  }

  peek() {
    if (this.size === 0) {
      return null;
    }
    return this.getItemsInPriorityOrder()[0];
  }

  getItemsInPriorityOrder() {
    const sortedItems = [...this._items.entries()].sort((a, b) => b[1] - a[1]);
    return sortedItems.map(entry => entry[0]);
  }

  getAveragePriority() {
    if (this.size === 0) {
      return 0;
    }
    const totalPriority = [...this._items.values()].reduce((sum, priority) => sum + priority, 0);
    return totalPriority / this.size;
  }

  applyDecay(decayRate) {
    const newItems = new Map();
    for (const [item, priority] of this._items.entries()) {
      const newPriority = priority * (1 - decayRate);
      const newItem = item.withPriority(newPriority);
      newItems.set(newItem, newPriority);
    }
    this._items = newItems;
  }

  _removeLowestPriorityItem() {
    if (this.size === 0) {
      return;
    }
    const lowestPriorityItem = this.getItemsInPriorityOrder().pop();
    this.remove(lowestPriorityItem);
  }
}