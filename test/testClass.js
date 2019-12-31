
const createClass = require("../class");

module.exports = function() {
	const Animal = createClass("Animal", null, (Public, $, $$, Scope, Static) => {
		Public[$$].getSound = function(times=1) {
			let s = "";
			for (let i=0; i<times; ++i) {
				s += this.public[$$].sound;
				if (i+1 < times) {
					s += " ";
				}
			}
			return s;
		};

		Static.isAnimal = function() {
			return true;
		};

		function constructor(sound) {
			this[$$].sound = sound;
		}

		return [constructor];
	});

	const Duck = createClass("Duck", [Animal], (Public, $, $$, Scope, Static) => {
		Public.quack = function(times) {
			return this[Scope.Animal].getSound(times);
		};

		Static[$].isAnimal = function() {
			return "duck";
		};

		Static.isAnimal = function() {
			return this[$].isAnimal();
		};

		function constructor(name) {
			this[$].name = name;
		}

		function init() {
			this.super("Animal", "quack");
		}

		return [constructor, init];
	});

	const larry = Duck("larry");
	if (larry.quack(5) !== "quack quack quack quack quack") {
		return "failed";
	}

	const ben = new Duck("ben");
	if (ben.quack(3) !== "quack quack quack") {
		return "failed";
	}

	if (Animal.isAnimal() !== true) {
		return "failed";
	}
	if (Duck.isAnimal() !== "duck") {
		return "failed";
	}

	return "ok";
};
