const fs = require('fs');
const path = require('path');

const base = 'C:\\Users\\Digo\\Desktop\\isapaulino';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function safeCopy(src, dest) {
  try {
    fs.copyFileSync(src, dest);
    console.log(`Copied: ${path.basename(src)} -> ${path.basename(dest)}`);
  } catch (e) {
    console.error(`Error copying ${src}: ${e.message}`);
  }
}

// Create directories
['images', 'icons', 'portfolio', 'testimonials', 'logo'].forEach(d => {
  ensureDir(path.join(base, 'public', 'assets', d));
});

// Hero photo
safeCopy(
  path.join(base, '02 - FOTOS', 'ISABELA PAULINO_FOTO.jpg'),
  path.join(base, 'public', 'assets', 'images', 'hero-photo.jpg')
);

// Logo files
const logoDir = path.join(base, '01. IDENTIDADE VISUAL', '01. LOGO', 'PNG');
if (fs.existsSync(logoDir)) {
  fs.readdirSync(logoDir).forEach((f, i) => {
    safeCopy(path.join(logoDir, f), path.join(base, 'public', 'assets', 'logo', `logo-${i+1}${path.extname(f)}`));
  });
}

// WhatsApp icon and all drawing icons
const iconsDrawDir = path.join(base, '01. IDENTIDADE VISUAL', '03. \u00cdCONES DESENHOS', 'PNG');
if (!fs.existsSync(iconsDrawDir)) {
  // Try alternative encoding
  const identidadeDir = path.join(base, '01. IDENTIDADE VISUAL');
  const subdirs = fs.readdirSync(identidadeDir);
  console.log('Subdirs in IDENTIDADE VISUAL:', subdirs);
  const iconeDir = subdirs.find(d => d.includes('CONES DESENHOS') || d.includes('\u00cdCONES'));
  if (iconeDir) {
    const fullIconeDir = path.join(identidadeDir, iconeDir, 'PNG');
    if (fs.existsSync(fullIconeDir)) {
      fs.readdirSync(fullIconeDir).forEach(f => {
        const safeName = f.replace(/[^a-zA-Z0-9._\-]/g, '-');
        safeCopy(path.join(fullIconeDir, f), path.join(base, 'public', 'assets', 'icons', safeName));
      });
    }
  }
} else {
  fs.readdirSync(iconsDrawDir).forEach(f => {
    const safeName = f.replace(/[^a-zA-Z0-9._\-]/g, '-');
    safeCopy(path.join(iconsDrawDir, f), path.join(base, 'public', 'assets', 'icons', safeName));
  });
}

// Portfolio 3D
const portfolioDir = path.join(base, '07. PORTFOLIOS');
if (fs.existsSync(portfolioDir)) {
  const subdirs = fs.readdirSync(portfolioDir);
  console.log('Portfolio subdirs:', subdirs);
  
  // 3D subfolder
  const threeDDir = subdirs.find(d => d === '3D');
  if (threeDDir) {
    fs.readdirSync(path.join(portfolioDir, threeDDir)).forEach(f => {
      const safeName = f.replace(/[^a-zA-Z0-9._\-]/g, '-');
      safeCopy(path.join(portfolioDir, threeDDir, f), path.join(base, 'public', 'assets', 'portfolio', safeName));
    });
  }
  
  // PRANCHAS subfolder
  const pranchasDir = subdirs.find(d => d === 'PRANCHAS');
  if (pranchasDir) {
    let idx = 1;
    fs.readdirSync(path.join(portfolioDir, pranchasDir)).sort().forEach(f => {
      const num = String(idx).padStart(2, '0');
      safeCopy(path.join(portfolioDir, pranchasDir, f), path.join(base, 'public', 'assets', 'portfolio', `prancha-${num}${path.extname(f)}`));
      idx++;
    });
  }
}

// Testimonials
const depoDir = path.join(base, '05. DEPOIMENTOS');
if (fs.existsSync(depoDir)) {
  const subdirs = fs.readdirSync(depoDir);
  console.log('Depoimentos subdirs:', subdirs);
  
  const feedbackDir = subdirs.find(d => d === 'FEEDBACK');
  if (feedbackDir) {
    let idx = 1;
    fs.readdirSync(path.join(depoDir, feedbackDir)).forEach(f => {
      const num = String(idx).padStart(2, '0');
      safeCopy(path.join(depoDir, feedbackDir, f), path.join(base, 'public', 'assets', 'testimonials', `feedback-${num}${path.extname(f)}`));
      idx++;
    });
  }
  
  const fotosDir = subdirs.find(d => d.includes('FOTOS'));
  if (fotosDir) {
    fs.readdirSync(path.join(depoDir, fotosDir)).forEach(f => {
      const safeName = f.replace(/[^a-zA-Z0-9._\-]/g, '-');
      safeCopy(path.join(depoDir, fotosDir, f), path.join(base, 'public', 'assets', 'testimonials', safeName));
    });
  }
}

console.log('\nDone!');
