
const test1 = require("./test1");

const result = test1();
if (result === "ok") {
	console.log("All tests passed.");
} else {
	throw new Error("Tests Failed: " + result);
}
