import { generateInsightBundle } from './api/_lib/insightBundleHelper.js';
(async () => {
  try {
    const res = await generateInsightBundle('MTHFR Gene Mutations and Diet', 'social_listening', 'spike', 'Patient empathetic authoritative');
    console.log("Success! Bundle generated:", res.id);
  } catch(e) {
    console.error("Failed:", e);
  }
  process.exit(0);
})();
