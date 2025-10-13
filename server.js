const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const staticDir = (() => {
  const customDir = process.env.STATIC_DIR;
  if (customDir) {
    return path.resolve(__dirname, customDir);
  }

  const distPath = path.join(__dirname, 'dist');
  return fs.existsSync(distPath) ? distPath : __dirname;
})();

app.use(express.static(staticDir));

app.listen(PORT, () => {
  console.log(`Serving static content from ${staticDir}`);
  console.log(`Server running on port ${PORT}`);
});
