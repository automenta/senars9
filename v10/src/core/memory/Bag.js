export class Bag {
 constructor(maxSize) {
   this._items = new Map();
   this._maxSize = maxSize;
 }

 get size() { return this._items.size; }
 get maxSize() { return this._maxSize; }

 add(item, priority) {
   if (this._items.has(item)) return false;
   this.size >= this.maxSize && this._removeLowestPriorityItem();
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
   return this.size === 0 ? null : this.getItemsInPriorityOrder()[0];
 }

 getItemsInPriorityOrder() {
   return [...this._items.entries()].sort((a, b) => b[1] - a[1]).map(([item]) => item);
 }

 getAveragePriority() {
   return this.size === 0 ? 0 : [...this._items.values()].reduce((sum, priority) => sum + priority, 0) / this.size;
 }

 applyDecay(decayRate) {
   const newItems = new Map();
   for (const [item, priority] of this._items.entries()) {
     const newPriority = priority * (1 - decayRate);
     newItems.set(item.withPriority(newPriority), newPriority);
   }
   this._items = newItems;
 }

 _removeLowestPriorityItem() {
   this.size > 0 && this.remove(this.getItemsInPriorityOrder().pop());
 }
}