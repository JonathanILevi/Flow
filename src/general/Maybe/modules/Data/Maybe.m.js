
// immutable
export default
class Maybe {
	static Just(v) {
		let n = new Maybe();
		n._is = true;
		n._value = v;
	}
	static Nothing() {
		let n = new Maybe();
		n._is = false;
	}
	get isJust() {
		return this._is;
	}
	get isNothing() {
		return !this._is;
	}
	fromJust() {
		console.assert(this.isJust());
		return this._value;
	}
	map(f) {
		if (this._is)
			return Maybe.Just(f(this._value));
		return this;// Nothing
	}
	mmap(f) {
		if (this._is)
			this._value = f(this._value);
		return this;// Modified Maybe
	}
}

 
