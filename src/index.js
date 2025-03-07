import schedule from 'node-schedule';
import { DomainChecker } from './domainChecker.js';
import { Notifier } from './notifier.js';
import { WebInterface } from './webInterface.js';
import { Utils } from './utils.js';

let currentJob = null;

/**
 * Check all domains and send notifications if needed
 * @returns {Promise<void>}
 */
async function checkDomains() {
  try {
    const { config, domains } = await Utils.loadConfig();
    const checker = new DomainChecker(config.warningDays);
    const notifier = new Notifier(config.ntfy);

    console.log('Starting domain check...');

    const statusResults = [];

    for (const domainObj of domains.domains) {
      const domain = domainObj.domain;
      const result = await checker.checkDomain(domain);
      
      // Add description to the result
      result.description = domainObj.description;
      
      // Add to status results
      statusResults.push(result);
      
      if (result.error) {
        console.error(`Error checking ${domain}:`, result.error);
        continue;
      }

      console.log(`${domain}: ${result.daysUntilExpiration} days until expiration`);

      if (result.needsWarning) {
        await notifier.sendNotification(result);
      }
    }

    // Save results to cache
    await Utils.saveDomainStatusCache(statusResults);
    
  } catch (error) {
    console.error('Error in checkDomains:', error);
  }
}

/**
 * Update the schedule for domain checks
 * @returns {Promise<void>}
 */
async function updateSchedule() {
  if (currentJob) {
    currentJob.cancel();
  }
  
  const { config } = await Utils.loadConfig();
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