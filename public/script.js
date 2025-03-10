/**
 * Client-side logging function
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {...any} args - Additional arguments
 */
function log(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  switch (level) {
    case 'debug':
      console.debug(formattedMessage, ...args);
      break;
    case 'info':
      console.info(formattedMessage, ...args);
      break;
    case 'warn':
      console.warn(formattedMessage, ...args);
      break;
    case 'error':
      console.error(formattedMessage, ...args);
      break;
    default:
      console.log(formattedMessage, ...args);
  }
}

// Add these variables at the top of the file
let currentView = 'card'; // Default view
let allDomains = []; // Store all domains
let searchTimeout = null; // For debouncing search

/**
 * Filter domains based on search term
 * @param {string} searchTerm - The search term to filter by
 * @returns {Array} Filtered domains
 */
function filterDomains(searchTerm) {
    if (!searchTerm) return allDomains;
    
    const term = searchTerm.toLowerCase();
    return allDomains.filter(domain => {
        return domain.domain.toLowerCase().includes(term) ||
               (domain.description && domain.description.toLowerCase().includes(term)) ||
               (domain.error && domain.error.toLowerCase().includes(term));
    });
}

/**
 * Handle search input changes
 */
function handleSearch(event) {
    const searchTerm = event.target.value.trim();
    
    // Clear previous timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // Debounce the search to avoid too many updates
    searchTimeout = setTimeout(() => {
        const filteredDomains = filterDomains(searchTerm);
        updateDashboard(filteredDomains);
        
        // Show feedback if no results
        if (filteredDomains.length === 0) {
            toast.info('No Results', 'No domains match your search criteria');
        }
    }, 300);
}

/**
 * Update the dashboard with filtered domains
 * @param {Array} domains - Domains to display
 */
function updateDashboard(domains) {
    const dashboard = document.getElementById('dashboard');
    dashboard.innerHTML = '';
    
    if (domains.length === 0) {
        // If currentView is list, still show headers but with a message below
        if (currentView === 'list') {
            const headerRow = document.createElement('div');
            headerRow.className = 'list-header';
            headerRow.innerHTML = `
                <div class="header-domain">Domain</div>
                <div class="header-description">Description</div>
                <div class="header-expiration">Expiration</div>
                <div class="header-actions">Actions</div>
            `;
            dashboard.appendChild(headerRow);
            
            const emptyRow = document.createElement('div');
            emptyRow.className = 'empty-list';
            emptyRow.innerHTML = '<div class="no-data">No domains match your search criteria.</div>';
            dashboard.appendChild(emptyRow);
        } else {
            dashboard.innerHTML = '<div class="no-data">No domains match your search criteria.</div>';
        }
        return;
    }
    
    // Add column headers for list view
    if (currentView === 'list') {
        const headerRow = document.createElement('div');
        headerRow.className = 'list-header';
        headerRow.innerHTML = `
            <div class="header-domain">Domain</div>
            <div class="header-description">Description</div>
            <div class="header-expiration">Expiration</div>
            <div class="header-actions">Actions</div>
        `;
        dashboard.appendChild(headerRow);
    }
    
    domains.forEach(domain => {
        dashboard.appendChild(createDomainCard(domain));
    });
}

/**
 * Load domain status data from cache
 * @param {boolean} showToasts - Whether to show status toasts or not
 */
async function loadDashboard(showToasts = true) {
    try {
        log('info', 'Loading dashboard data');
        const response = await fetch('/api/domains/status');
        allDomains = await response.json();
        
        const searchTerm = document.getElementById('searchInput').value.trim();
        const filteredDomains = filterDomains(searchTerm);
        updateDashboard(filteredDomains);
        
        if (allDomains.length === 0) {
            log('warn', 'No domain data available');
            if (showToasts) {
                toast.warning('No Data', 'No domain data available. Please add domains in the configuration and wait for the first check to complete.');
            }
            return;
        }
        
        // Show summary toast only if showToasts is true
        if (showToasts) {
            const expiringSoon = allDomains.filter(d => d.needsWarning).length;
            if (expiringSoon > 0) {
                log('warn', `${expiringSoon} domains expiring soon`);
                toast.warning('Domains Expiring Soon', `${expiringSoon} domain${expiringSoon > 1 ? 's' : ''} will expire soon`);
            } else {
                log('info', 'All domains in good standing');
                toast.success('Domains Checked', 'All domains are in good standing');
            }
        }
    } catch (error) {
        log('error', 'Error loading dashboard:', error);
        if (showToasts) {
            toast.error('Loading Error', 'Failed to load domain status');
        }
    }
}

/**
 * Get emoji based on days until expiration
 */
function getStatusEmoji(daysUntilExpiration) {
    if (daysUntilExpiration <= 7) return '🚨'; // Critical
    if (daysUntilExpiration <= 30) return '⚠️'; // Warning
    return '✅'; // OK
}

/**
 * Toggle between card and list views
 */
function toggleView() {
    const dashboard = document.getElementById('dashboard');
    const viewToggle = document.getElementById('viewToggle');
    
    currentView = currentView === 'card' ? 'list' : 'card';
    
    // Update dashboard class
    dashboard.className = `dashboard ${currentView}-view`;
    
    // Update toggle button - fix for the span element reference
    const iconElement = viewToggle.querySelector('.icon');
    const spanElement = viewToggle.querySelector('span');
    
    if (iconElement) {
        // We could update the SVG path here if needed
    }
    
    if (spanElement) {
        spanElement.textContent = currentView === 'card' ? 'List View' : 'Card View';
    }
    
    // Reload the dashboard to apply the new view, but don't show toasts
    loadDashboard(false);
}

/**
 * Create a card for a domain
 */
function createDomainCard(domain) {
    const card = document.createElement('div');
    card.className = 'domain-card';
    
    // Handle error case
    if (domain.error) {
        if (currentView === 'list') {
            // Compact error display for list view with description column
            card.innerHTML = `
                <div class="card-header">
                    <h3 title="${domain.domain}">${domain.domain}</h3>
                    <span class="status-emoji">❌</span>
                </div>
                <p class="description" title="${domain.description || ''}">${domain.description || ''}</p>
                <div class="card-body">
                    <p class="error" title="Error: ${domain.error}">Error: ${domain.error}</p>
                </div>
                <button onclick="showDetails('${domain.domain}')" class="btn-details">Details</button>
            `;
        } else {
            // Original card view for errors
            card.innerHTML = `
                <div class="card-header">
                    <h3>${domain.domain}</h3>
                    <span class="status-emoji">❌</span>
                </div>
                <div class="card-body">
                    <p class="description">${domain.description || ''}</p>
                    <p class="error">Error: ${domain.error}</p>
                </div>
                <button onclick="showDetails('${domain.domain}')" class="btn-details">Show Details</button>
            `;
        }
        return card;
    }
    
    const expiryDate = new Date(domain.expirationDate).toLocaleDateString();
    const statusEmoji = getStatusEmoji(domain.daysUntilExpiration);
    
    // Create different layouts based on current view
    if (currentView === 'list') {
        // More compact structure for list view with description column
        card.innerHTML = `
            <div class="card-header">
                <h3 title="${domain.domain}">${domain.domain}</h3>
                <span class="status-emoji">${statusEmoji}</span>
            </div>
            <p class="description" title="${domain.description || ''}">${domain.description || ''}</p>
            <div class="card-body">
                <p title="Expires on ${expiryDate}">Expires: ${expiryDate}</p>
                <p title="${domain.daysUntilExpiration} days until expiration">Days: ${domain.daysUntilExpiration}</p>
            </div>
            <button onclick="showDetails('${domain.domain}')" class="btn-details">Details</button>
        `;
    } else {
        card.innerHTML = `
            <div class="card-header">
                <h3>${domain.domain}</h3>
                <span class="status-emoji">${statusEmoji}</span>
            </div>
            <div class="card-body">
                <p class="description">${domain.description || ''}</p>
                <p>Expires: ${expiryDate}</p>
                <p>Days remaining: ${domain.daysUntilExpiration}</p>
            </div>
            <button onclick="showDetails('${domain.domain}')" class="btn-details">Show Details</button>
        `;
    }
    
    return card;
}

/**
 * Show WHOIS details for a domain
 */
async function showDetails(domain) {
    try {
        log('info', `WHOIS details requested for domain: ${domain}`);
        console.time(`WHOIS query for ${domain}`);
        
        toast.info('Loading...', `Fetching WHOIS data for ${domain}`);
        
        const response = await fetch(`/api/domains/${encodeURIComponent(domain)}/whois`);
        const data = await response.json();

        console.timeEnd(`WHOIS query for ${domain}`);
        log('info', `WHOIS data received for ${domain}`);
        
        // Log key information separately for quick reference
        if (data.domainName) log('debug', `Domain Name: ${data.domainName}`);
        if (data.registrar) log('debug', `Registrar: ${data.registrar}`);
        if (data.registrarUrl) log('debug', `Registrar URL: ${data.registrarUrl}`);
        if (data.updatedDate) log('debug', `Updated Date: ${data.updatedDate}`);
        if (data.creationDate) log('debug', `Creation Date: ${data.creationDate}`);
        if (data.expirationDate || data.registryExpiryDate || data.expiresOn) {
            log('debug', `Expiration Date: ${data.expirationDate || data.registryExpiryDate || data.expiresOn}`);
        }
        if (data.nameServers) log('debug', `Name Servers: ${data.nameServers}`);
        
        // Log the full response
        log('debug', 'Full WHOIS Response:', data);
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>WHOIS Details - ${domain}</h2>
                <pre>${JSON.stringify(data, null, 2)}</pre>
            </div>
        `;
        
        document.body.appendChild(modal);
        log('info', `WHOIS modal opened for ${domain}`);
        
        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = () => {
            log('info', `WHOIS modal closed for ${domain}`);
            modal.remove();
        };
        
        window.onclick = (event) => {
            if (event.target === modal) {
                log('info', `WHOIS modal closed for ${domain}`);
                modal.remove();
            }
        };
    } catch (error) {
        log('error', `Error loading WHOIS details for ${domain}:`, error);
        toast.error('WHOIS Error', `Failed to load details for ${domain}`);
    }
}

// Update the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    log('info', 'Dashboard page loaded');
    
    // Add event listeners
    document.getElementById('viewToggle').addEventListener('click', toggleView);
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    
    // Initialize the dashboard with the default view
    const dashboard = document.getElementById('dashboard');
    dashboard.className = `dashboard ${currentView}-view`;
    
    loadDashboard();
}); 