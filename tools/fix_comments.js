const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function walk(dir) {
  let results = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      results = results.concat(walk(p));
    } else {
      results.push(p);
    }
  }
  return results;
}

const exts = ['.ts', '.tsx', '.glsl'];
const allFiles = walk(root).filter(f => exts.includes(path.extname(f)) && f.includes(path.sep + 'src' + path.sep));

let changed = 0;
for (const filePath of allFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Replace leading lines that start with '/ ' to '/** '
  content = content.replace(/^(\s*)\/\s(?=\*?\S)/mg, '$1/** ');
  content = content.replace(/^(\s*)\/\s*\n(\s*\*)/mg, '$1/**\n$2');

  if (content !== original) {
    fs.copyFileSync(filePath, filePath + '.bak');
    fs.writeFileSync(filePath, content, 'utf8');
    changed++;
  }
}

console.log('Fixed files:', changed);
process.exit(0);
