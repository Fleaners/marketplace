import fs from 'fs';
import path from 'path';

const searchDir = 'C:/Users/ELCOT/Documents/New folder/marketplace/web_app/next/_next';
const searchPhrase = 'connectivity'.toLowerCase();

function walk(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(walk(filePath));
      } else {
        if (filePath.endsWith('.js') || filePath.endsWith('.html')) {
          results.push(filePath);
        }
      }
    });
  } catch (e) {
    // ignore
  }
  return results;
}

function run() {
  console.log('Starting search in compiled assets...');
  const files = walk(searchDir);
  console.log(`Found ${files.length} files to search.`);
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      if (content.toLowerCase().includes(searchPhrase)) {
        console.log(`MATCH: ${file}`);
        const idx = content.toLowerCase().indexOf(searchPhrase);
        console.log(`  Context: ${content.slice(Math.max(0, idx - 100), Math.min(content.length, idx + 200))}`);
      }
    } catch (e) {
      // ignore
    }
  }
  console.log('Search finished.');
}

run();
