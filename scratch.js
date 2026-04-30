const fs = require('fs');
const path = require('path');

const files = [
  'queue.js', 'generate-content.js', 'generate-image.js', 'generate-video.js', 
  'generate.js', 'publish.js', 'schedule.js', 'trends.js', 'preview.js', 
  'extract-feedback.js', 'poll-video.js'
];

for (const file of files) {
  const filePath = path.join(__dirname, 'api', file);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Skip if already secured
  if (content.includes('verifyAuth')) continue;
  
  // Add import
  const importStatement = "import { verifyAuth } from './_lib/auth.js';\n";
  
  // Find handler function
  const handlerRegex = /export default async function handler\(req, res\) \{/;
  
  if (handlerRegex.test(content)) {
    const authCode = `
    try {
        await verifyAuth(req);
    } catch (e) {
        return res.status(403).json({ error: 'Forbidden', message: e.message });
    }
`;
    content = importStatement + content.replace(handlerRegex, `export default async function handler(req, res) {${authCode}`);
    fs.writeFileSync(filePath, content);
    console.log(`Secured ${file}`);
  }
}
