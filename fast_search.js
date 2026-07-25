import fs from 'fs';
import path from 'path';

const searchDir = 'C:/Users/ELCOT/Documents/New folder/marketplace';
const searchPhrase = 'experiencing'.toLowerCase();

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        results = results.concat(walk(filePath));
      }
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.html') || file.endsWith('.json')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

function run() {
  console.log('Starting search...');
  const files = walk(searchDir);
  console.log(`Found ${files.length} files to search.`);
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      if (content.toLowerCase().includes(searchPhrase)) {
        console.log(`MATCH: ${file}`);
        // print matching lines
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.toLowerCase().includes(searchPhrase)) {
            console.log(`  Line ${idx + 1}: ${line.trim()}`);
          }
        });
      }
    } catch (e) {
      // ignore read errors
    }
  }
  console.log('Search finished.');
}

run();
