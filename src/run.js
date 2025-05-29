// run.js

const fs = require('fs');
const {parseMiltov} = require('./parser.js');
const Interpreter = require('./interpreter.js');

const filename = process.argv[2];
if (!filename) {
  console.error("Usage: node run.js <file.miltov>");
  process.exit(1);
}

const sourceCode = fs.readFileSync(filename, 'utf-8');

try {
  const ast = parseMiltov(sourceCode);
  const interpreter = new Interpreter();
  interpreter.eval(ast);
} catch(e) {
  console.error("Error:", e.message);
}
