/**
 * Bag class - Priority-based collection for tasks within concepts
 * Implements efficient priority queue with capacity management as specified in DESIGN.md
 */

export class Bag {
  constructor(maxSize = 100) {
    this._maxSize = maxSize;
    this._items = new Map(); // Map for O(1) lookups by item
    this._priorityQueue = []; // Array for priority ordering
    this._totalPriority = 0;
  }

  // Getters
  get size() { return this._items.size; }
  get maxSize() { return this._maxSize; }
  get isEmpty() { return this._items.size === 0; }
  get isFull() { return this._items.size >= this._maxSize; }

  /**
   * Add an item to the bag with the given priority
   * @param {any} item - The item to add
   * @param {number} priority - Priority value (0-1)
   * @returns {boolean} - True if item was added, false if bag is full and item not added
   */
  add(item, priority = 0.5) {
    if (this._items.has(item)) {
      // Update existing item's priority
      this._removeFromPriorityQueue(item);
      this._totalPriority -= this._items.get(item).priority;
    }

    if (this.isFull && priority < this._getLowestPriority()) {
      // Don't add if bag is full and priority is lower than current lowest
      return false;
    }

    // Create item wrapper with priority
    const itemWrapper = { item, priority: Math.max(0, Math.min(1, priority)) };

    // Add to collections
    this._items.set(item, itemWrapper);
    this._insertIntoPriorityQueue(itemWrapper);
    this._totalPriority += itemWrapper.priority;

    // Remove lowest priority item if over capacity
    if (this.isFull) {
      this._removeLowestPriority();
    }

    return true;
  }

  /**
   * Remove and return the highest priority item
   * @returns {any|null} - The highest priority item or null if empty
   */
  pop() {
    if (this.isEmpty) return null;

    const highestPriorityWrapper = this._priorityQueue[0];
    const item = highestPriorityWrapper.item;

    this._removeFromCollections(item);
    return item;
  }

  /**
   * Get the highest priority item without removing it
   * @returns {any|null} - The highest priority item or null if empty
   */
  peek() {
    if (this.isEmpty) return null;
    return this._priorityQueue[0].item;
  }

  /**
   * Remove a specific item from the bag
   * @param {any} item - The item to remove
   * @returns {boolean} - True if item was found and removed
   */
  remove(item) {
    if (!this._items.has(item)) return false;

    this._removeFromCollections(item);
    return true;
  }

  /**
   * Check if bag contains an item
   * @param {any} item - The item to check
   * @returns {boolean} - True if item is in bag
   */
  contains(item) {
    return this._items.has(item);
  }

  /**
   * Get the priority of an item
   * @param {any} item - The item to check
   * @returns {number|null} - Priority of item or null if not found
   */
  getPriority(item) {
    const wrapper = this._items.get(item);
    return wrapper ? wrapper.priority : null;
  }

  /**
   * Update the priority of an existing item
   * @param {any} item - The item to update
   * @param {number} newPriority - New priority value
   * @returns {boolean} - True if item was found and updated
   */
  updatePriority(item, newPriority) {
    if (!this._items.has(item)) return false;

    const newPriorityClamped = Math.max(0, Math.min(1, newPriority));

    // Remove and re-add with new priority
    this._removeFromPriorityQueue(item);
    this._totalPriority -= this._items.get(item).priority;

    this._items.get(item).priority = newPriorityClamped;
    this._insertIntoPriorityQueue(this._items.get(item));
    this._totalPriority += newPriorityClamped;

    return true;
  }

  /**
   * Get all items in priority order (highest first)
   * @returns {Array} - Array of items in priority order
   */
  getItemsInPriorityOrder() {
    return this._priorityQueue.map(wrapper => wrapper.item);
  }

  /**
   * Clear all items from the bag
   */
  clear() {
    this._items.clear();
    this._priorityQueue.length = 0;
    this._totalPriority = 0;
  }

  /**
   * Get average priority of all items
   * @returns {number} - Average priority or 0 if empty
   */
  getAveragePriority() {
    if (this.isEmpty) return 0;
    return this._totalPriority / this.size;
  }

  /**
   * Apply priority decay to all items
   * @param {number} decayRate - Rate to decay priorities (0-1)
   */
  applyDecay(decayRate = 0.01) {
    const decayFactor = 1 - Math.max(0, Math.min(1, decayRate));

    this._totalPriority = 0;
    for (const wrapper of this._priorityQueue) {
      wrapper.priority *= decayFactor;
      this._totalPriority += wrapper.priority;
    }
  }

  // Private helper methods

  _insertIntoPriorityQueue(wrapper) {
    // Insert in priority order (highest first)
    let insertIndex = 0;
    while (insertIndex < this._priorityQueue.length &&
           this._priorityQueue[insertIndex].priority > wrapper.priority) {
      insertIndex++;
    }
    this._priorityQueue.splice(insertIndex, 0, wrapper);
  }

  _removeFromPriorityQueue(item) {
    const index = this._priorityQueue.findIndex(wrapper => wrapper.item === item);
    if (index >= 0) {
      this._priorityQueue.splice(index, 1);
    }
  }

  _removeFromCollections(item) {
    const wrapper = this._items.get(item);
    if (wrapper) {
      this._totalPriority -= wrapper.priority;
      this._removeFromPriorityQueue(item);
      this._items.delete(item);
    }
  }

  _removeLowestPriority() {
    if (this.isEmpty) return;

    const lowestWrapper = this._priorityQueue[this._priorityQueue.length - 1];
    this._removeFromCollections(lowestWrapper.item);
  }

  _getLowestPriority() {
    if (this.isEmpty) return 0;
    return this._priorityQueue[this._priorityQueue.length - 1].priority;
  }
}