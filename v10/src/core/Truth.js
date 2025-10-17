export class Truth {
 constructor(f, c) {
   this._f = f;
   this._c = c;
   Object.freeze(this);
 }

 get f() { return this._f; }
 get c() { return this._c; }

 equals(other) {
   return other instanceof Truth && this.f === other.f && this.c === other.c;
 }
}