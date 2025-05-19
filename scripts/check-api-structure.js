const fs = require('fs');
const path = require('path');

const apiDir = path.join(process.cwd(), 'pages', 'api');
if (fs.existsSync(apiDir)) {
  const files = fs.readdirSync(apiDir);
  console.log("✅ API files found in /pages/api:", files);
} else {
  console.error("❌ /pages/api/ not found at project root!");
} 