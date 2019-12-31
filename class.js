
const INTERNAL_KEY = Symbol("internal");
const PARENT_SCOPE_NAME = "super";
const THIS_PROPERTY_NAME = "public";

function _obj() {
	return Object.create(null);
}

function _assign(target, source, noOverwrite=false) {
	const keys = Object.getOwnPropertyNames(source)
		.concat(Object.getOwnPropertySymbols(source));
	for (const k of keys) {
		if (!noOverwrite || !(k in target)) {
			target[k] = source[k];
		}
	}
}

function _compose(objects) {
	const composed = _obj();
	for (const o of objects) {
		_assign(composed, o);
	}
	return composed;
}

function _getAllSuperClasses(classes) {
	const array = [];
	for (const cls of classes) {
		const supers = cls[INTERNAL_KEY].allSuperClasses;
		array.push(cls, ...supers);
	}
	return Array.from(new Set(array));
}

function _isValidClassName(name) {
	return (
		typeof name === "string" &&
		name.length > 0 &&
		name[0] !== "_" &&
		name !== PARENT_SCOPE_NAME &&
		name !== "anonymous"
	);
}

function _createProtectedScopesObject(superClasses, allSuperClasses) {
	const scope = _obj();
	for (const cls of allSuperClasses) {
		_addScope(scope, cls, cls.name);
	}
	if (superClasses.length === 1) {
		const main = superClasses[0];
		_addScope(scope, main, PARENT_SCOPE_NAME);
	}
	return Object.freeze(scope);
}

function _addScope(scope, cls, name) {
	if (typeof name !== "string") {
		throw new Error("Invalid argument.");
	} else if (name in scope) {
		throw new Error("Naming conflict in super classes.");
	}
	scope[name] = cls[INTERNAL_KEY].protectedKey;
}

function _createPrototype(superClasses, privateKey, protectedKey) {
	const parents = superClasses.map((cls) => cls.prototype).reverse();
	const prototype = _compose(parents);

	Object.defineProperties(prototype, {
		[privateKey]: { value: _obj() },
		[protectedKey]: { value: _obj() }
	});

	return prototype;
}

function _createStaticPrototype(privateKey, protectedKey) {
	return Object.create(null, {
		[privateKey]: { value: _obj() },
		[protectedKey]: { value: _obj() }
	});
}

function _extendStaticPrototype(staticPrototype, superClasses) {
	return _compose([staticPrototype, ...superClasses].reverse());
}

function _inheritStaticPrototype(cls, staticPrototype) {
	_assign(cls, staticPrototype, true);
}

function _extractScopesFromPrototype(prototype, keys) {
	const scopes = [];
	for (const k of keys) {
		scopes.push(prototype[k]);
		delete prototype[k];
	}
	return scopes;
}

function _defineScopesOnContext(self, key, prototype) {
	const scope = Object.create(prototype, {
		[THIS_PROPERTY_NAME]: { value: self }
	});
	Object.defineProperty(self, key, {
		value: scope, configurable: true
	});
}

function _formatCallbackReturn(value) {
	if (!Array.isArray(value)) {
		value = [value];
	}

	for (let i=0; i<3; ++i) {
		const item = value[i];
		if (item === undefined) {
			value[i] === null;
		} else if (typeof item !== "function" && item !== null) {
			throw new Error("Invalid callback return value.");
		}
	}

	return value;
}

function createClass(className, superClasses, callback) {
	if (!_isValidClassName(className)) {
		throw new Error("Invalid class name: '" + className + "'");
	}

	superClasses = superClasses ? superClasses.slice() : [];

	const privateKey = Symbol("private");
	const protectedKey = Symbol("protected");

	const allSuperClasses = _getAllSuperClasses(superClasses);
	const scopes =
		_createProtectedScopesObject(
			superClasses, allSuperClasses);

	const prototype = _createPrototype(
		superClasses, privateKey, protectedKey);

	let staticPrototype = _createStaticPrototype(
		privateKey, protectedKey);

	const [constructor, superInitializer, createContext] =
		_formatCallbackReturn(callback(
			prototype, privateKey, protectedKey,
			scopes, staticPrototype));

	staticPrototype = _extendStaticPrototype(
		staticPrototype, superClasses);

	const [privatePrototype, protectedPrototype] =
		_extractScopesFromPrototype(
			prototype, [privateKey, protectedKey]);

	const wrapper = function() {
		'use strict';

		let self;
		if (this) {
			self = this;
		} else if (createContext) {
			self = createContext();
			Object.setPrototypeOf(self, prototype);
		} else {
			self = Object.create(prototype);
		}

		_defineScopesOnContext(self, privateKey, privatePrototype);
		_defineScopesOnContext(self, protectedKey, protectedPrototype);

		const callCounter = _obj();
		function callSuperClass(name, ...args) {
			const cls = superClasses.find((cls) => cls.name === name);
			if (!cls) {
				throw new Error("No superclass named: '" + name + "'");
			} else if (cls.name in callCounter) {
				throw new Error("Superclass constructor already called.");
			}
			callCounter[cls.name] = true;
			cls.apply(self, args);
		}

		if (superInitializer) {
			superInitializer.apply({ super: callSuperClass }, arguments);
		}

		for (const cls of superClasses) {
			if (!(cls.name in callCounter)) {
				cls.call(self);
			}
		}
		if (constructor) {
			constructor.apply(self, arguments);
		}

		return self;
	};

	_inheritStaticPrototype(wrapper, staticPrototype);

	Object.defineProperty(wrapper, "name", {
		value: className
	});

	wrapper[INTERNAL_KEY] = Object.freeze({
		protectedKey,
		allSuperClasses
	});

	wrapper.prototype = prototype;
	prototype.constructor = wrapper;
	Object.freeze(prototype);
	
	Object.freeze(wrapper);

	return wrapper;
}

module.exports = createClass;
