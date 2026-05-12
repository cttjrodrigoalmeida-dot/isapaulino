import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
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

const convertImages = async () => {
  const publicDir = path.join(__dirname, 'public', 'assets');
  const files = walkDir(publicDir);
  const imageFiles = files.filter(f => f.match(/\.(jpg|jpeg|png)$/i));
  
  console.log(`Found ${imageFiles.length} images to convert.`);
  let count = 0;
  for (const file of imageFiles) {
    const ext = path.extname(file);
    const basename = path.basename(file, ext);
    const dir = path.dirname(file);
    const outPath = path.join(dir, `${basename}.webp`);
    
    // Ignore if webp already exists
    if (!fs.existsSync(outPath)) {
      try {
        await sharp(file)
          .webp({ quality: 80 })
          .toFile(outPath);
        console.log(`Converted ${path.relative(publicDir, file)} -> .webp`);
        count++;
        fs.unlinkSync(file);
      } catch (err) {
        console.error(`Failed to convert ${file}`, err);
      }
    } else {
      console.log(`Webp already exists for ${file}, deleting original`);
      fs.unlinkSync(file);
    }
  }
  console.log(`Successfully converted ${count} images.`);
};

convertImages();
