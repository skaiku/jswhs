import express from 'express';
import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bodyParser from 'body-parser';
import { createServer } from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class WebInterface {
  constructor(onConfigUpdate) {
    this.app = express();
    this.server = null;
    this.onConfigUpdate = onConfigUpdate;
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(bodyParser.json());
    this.app.use(express.static(join(__dirname, '../public')));
  }

  setupRoutes() {
    this.app.get('/api/config', async (req, res) => {
      try {
        const config = JSON.parse(
          await readFile(new URL('../config.json', import.meta.url))
        );
        const domains = JSON.parse(
          await readFile(new URL('../domains.json', import.meta.url))
        );
        res.json({ config, domains });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/config', async (req, res) => {
      try {
        const { config, domains } = req.body;
        
        await writeFile(
          new URL('../config.json', import.meta.url),
          JSON.stringify(config, null, 2)
        );
        await writeFile(
          new URL('../domains.json', import.meta.url),
          JSON.stringify(domains, null, 2)
        );

        if (this.onConfigUpdate) {
          await this.onConfigUpdate();
        }

        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  async start(initialPort = 3000, maxAttempts = 10) {
    for (let port = initialPort; port < initialPort + maxAttempts; port++) {
      try {
        await new Promise((resolve, reject) => {
          this.server = createServer(this.app);
          
          this.server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
              console.log(`Port ${port} is in use, trying next port...`);
              this.server.close();
              resolve(false);
            } else {
              reject(err);
            }
          });

          this.server.listen(port, () => {
            console.log(`Web interface running at http://localhost:${port}`);
            resolve(true);
          });
        });

        return port;
      } catch (error) {
        console.error(`Error starting server on port ${port}:`, error);
        if (port === initialPort + maxAttempts - 1) {
          throw new Error('Failed to find an available port');
        }
      }
    }
  }

  async stop() {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }
      this.server.close(() => resolve());
    });
  }
} 