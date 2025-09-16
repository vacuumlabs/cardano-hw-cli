const fs = require('fs');
const path = require('path');

// Fix 1: @trezor/connect beta version missing firmware module
const firmwarePath = path.join(__dirname, '../node_modules/@trezor/connect-common/files/firmware');
const firmwareIndexPath = path.join(firmwarePath, 'index.js');

// Only create the firmware fix if the file doesn't exist
if (!fs.existsSync(firmwareIndexPath)) {
  const indexContent = `const fs = require('fs');
const path = require('path');

// Build firmwareAssets object by scanning the firmware directory structure
const firmwareAssets = {};

const deviceModels = ['t1b1', 't2b1', 't2t1', 't3b1', 't3t1'];
const firmwareTypes = ['universal', 'bitcoinonly'];

deviceModels.forEach(deviceModel => {
  firmwareAssets[deviceModel] = {};

  firmwareTypes.forEach(firmwareType => {
    const firmwareDir = path.join(__dirname, deviceModel, firmwareType);
    firmwareAssets[deviceModel][firmwareType] = {};

    if (fs.existsSync(firmwareDir)) {
      const files = fs.readdirSync(firmwareDir);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          const fileName = file.replace('.json', '');
          try {
            const filePath = path.join(firmwareDir, file);
            const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            firmwareAssets[deviceModel][firmwareType][fileName] = content;
          } catch (e) {
            // Skip invalid JSON files
          }
        }
      });
    }
  });
});

module.exports = { firmwareAssets };`;

  try {
    fs.writeFileSync(firmwareIndexPath, indexContent);
    console.log('✓ Fixed @trezor/connect-common firmware module');
  } catch (error) {
    console.warn('⚠ Could not create firmware index.js:', error.message);
  }
}

// Fix 2: @trezor/connect beta version trying to import .ts files instead of .js
const methodPath = path.join(__dirname, '../node_modules/@trezor/connect/lib/core/method.js');

if (fs.existsSync(methodPath)) {
  try {
    let methodContent = fs.readFileSync(methodPath, 'utf8');

    // Replace .ts extension with .js in the dynamic import
    const original = `\`../api/\${methodModule}/api/index.ts\``;
    const fixed = `\`../api/\${methodModule}/api/index.js\``;

    if (methodContent.includes(original)) {
      methodContent = methodContent.replace(original, fixed);
      fs.writeFileSync(methodPath, methodContent);
      console.log('✓ Fixed @trezor/connect method.js TypeScript import');
    }
  } catch (error) {
    console.warn('⚠ Could not fix method.js:', error.message);
  }
}