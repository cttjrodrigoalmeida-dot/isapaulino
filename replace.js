import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const walkDir = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(file));
    } else {
      results.push(file);
    }
  });
  return results;
};

const replaceExtensions = () => {
  const srcDir = path.join(__dirname, 'src');
  const files = [...walkDir(srcDir), path.join(__dirname, 'index.html')];
  const targetFiles = files.filter(f => f.match(/\.(tsx|ts|jsx|js|css|html)$/i));

  let replacedCount = 0;
  for (const file of targetFiles) {
    let content = fs.readFileSync(file, 'utf8');
    // We only want to replace references inside /assets/ or /CURSOR_small.png
    // We do not replace favicon.png
    let newContent = content.replace(/(\/assets\/[^"'\s]+)\.(jpg|jpeg|png)/gi, '$1.webp');
    newContent = newContent.replace(/(\/CURSOR_small)\.png/gi, '$1.webp');
    
    if (newContent !== content) {
      fs.writeFileSync(file, newContent, 'utf8');
      console.log(`Replaced extensions in ${path.relative(__dirname, file)}`);
      replacedCount++;
    }
  }
  console.log(`Replaced extensions in ${replacedCount} files.`);
};

replaceExtensions();
