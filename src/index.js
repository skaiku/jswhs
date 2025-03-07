import { readFile } from 'fs/promises';
import schedule from 'node-schedule';
import { DomainChecker } from './domainChecker.js';
import { Notifier } from './notifier.js';
import { WebInterface } from './webInterface.js';

let currentJob = null;

async function loadConfig() {
  const config = JSON.parse(await readFile(new URL('../config.json', import.meta.url)));
  const domainsData = JSON.parse(await readFile(new URL('../domains.json', import.meta.url)));
  return { config, domains: domainsData.domains };
}

async function checkDomains() {
  try {
    const { config, domains } = await loadConfig();
    const checker = new DomainChecker(config.warningDays);
    const notifier = new Notifier(config.ntfy);

    console.log('Starting domain check...');

    for (const domain of domains) {
      const result = await checker.checkDomain(domain);
      
      if (result.error) {
        console.error(`Error checking ${domain}:`, result.error);
        continue;
      }

      console.log(`${domain}: ${result.daysUntilExpiration} days until expiration`);

      if (result.needsWarning) {
        await notifier.sendNotification(result);
      }
    }
  } catch (error) {
    console.error('Error in checkDomains:', error);
  }
}

async function updateSchedule() {
  if (currentJob) {
    currentJob.cancel();
  }
  
  const { config } = await loadConfig();
  currentJob = schedule.scheduleJob(config.checkInterval, checkDomains);
  console.log('Schedule updated. Running on schedule:', config.checkInterval);
  
  // Run an immediate check after config update
  await checkDomains();
}

async function main() {
  try {
    // Start web interface
    const webInterface = new WebInterface(updateSchedule);
    await webInterface.start();

    // Initial setup
    await updateSchedule();
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 