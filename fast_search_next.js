import fs from 'fs';
import path from 'path';

const searchDir = 'C:/Users/ELCOT/Documents/New folder/marketplace/next_app/out';
const searchPhrase = 'Gemini brain'.toLowerCase();

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
        if (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.json')) {
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
  console.log('Starting search in .next...');
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
            console.log(`  Line ${idx + 1}: ${line.trim().slice(0, 150)}`);
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
