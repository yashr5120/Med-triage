import { createApp } from './app';
import { config } from './config';

const app = createApp();

app.listen(config.port, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║          TriageVoice AI — Backend Server                     ║
║  ⚠  PROTOTYPE ONLY — NOT FOR CLINICAL USE                   ║
╠══════════════════════════════════════════════════════════════╣
║  Port     : ${config.port}                                          ║
║  Mode     : ${config.demoMode ? 'DEMO (mock fixtures)         ' : 'LIVE (Gemma API)              '}                     ║
║  Model    : ${config.gemmaModel.padEnd(30)}  ║
║  Health   : http://localhost:${config.port}/api/health            ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
