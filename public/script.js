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
let currentView = localStorage.getItem('viewType') || 'card'; // Default view, check localStorage first
let sortColumn = localStorage.getItem('sortColumn') || 'daysUntilExpiration'; // Default sort column
let sortDirection = localStorage.getItem('sortDirection') || 'asc'; // Default sort direction
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
            dashboard.appendChild(createListHeaders());
            
            const emptyRow = document.createElement('div');
            emptyRow.className = 'empty-list';
            emptyRow.innerHTML = '<div class="no-data">No domains match your search criteria.</div>';
            dashboard.appendChild(emptyRow);
        } else {
            dashboard.innerHTML = '<div class="no-data">No domains match your search criteria.</div>';
        }
        return;
    }
    
    // Sort domains if in list view
    if (currentView === 'list') {
        domains = sortDomains(domains);
        dashboard.appendChild(createListHeaders());
    }
    
    domains.forEach(domain => {
        dashboard.appendChild(createDomainCard(domain));
    });
}

/**
 * Create the headers for the list view with sort indicators
 * @returns {HTMLElement} The header row element
 */
function createListHeaders() {
    const headerRow = document.createElement('div');
    headerRow.className = 'list-header';
    
    // Helper function to create header with sort indicator
    const createSortableHeader = (column, displayName, sortKey) => {
        const isSorted = sortColumn === sortKey;
        const sortIndicator = isSorted 
            ? (sortDirection === 'asc' ? '↑' : '↓') 
            : '';
        
        return `
            <div class="header-${column} ${isSorted ? 'sorted' : ''}" data-sort="${sortKey}">
                ${displayName}
                <span class="sort-indicator">${sortIndicator}</span>
            </div>
        `;
    };
    
    headerRow.innerHTML = `
        ${createSortableHeader('domain', 'Domain', 'domain')}
        ${createSortableHeader('description', 'Description', 'description')}
        ${createSortableHeader('expiration', 'Expiration', 'daysUntilExpiration')}
        <div class="header-actions">Actions</div>
    `;
    
    // Add click handlers for sortable headers
    const sortableHeaders = headerRow.querySelectorAll('[data-sort]');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const clickedColumn = header.getAttribute('data-sort');
            
            // If clicking the same column, toggle direction
            if (sortColumn === clickedColumn) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                // New column, default to ascending
                sortColumn = clickedColumn;
                sortDirection = 'asc';
            }
            
            // Save sort preferences to localStorage
            localStorage.setItem('sortColumn', sortColumn);
            localStorage.setItem('sortDirection', sortDirection);
            
            // Refresh the dashboard with new sort
            const searchTerm = document.getElementById('searchInput').value.trim();
            const filteredDomains = filterDomains(searchTerm);
            updateDashboard(filteredDomains);
        });
    });
    
    return headerRow;
}

/**
 * Sort domains based on current sort settings
 * @param {Array} domains - Domains to sort
 * @returns {Array} Sorted domains
 */
function sortDomains(domains) {
    return [...domains].sort((a, b) => {
        let aValue, bValue;
        
        // Handle different column types
        switch (sortColumn) {
            case 'domain':
                aValue = a.domain.toLowerCase();
                bValue = b.domain.toLowerCase();
                break;
            case 'description':
                aValue = (a.description || '').toLowerCase();
                bValue = (b.description || '').toLowerCase();
                break;
            case 'daysUntilExpiration':
                // Handle error cases - domains with errors go to the end
                if (a.error && !b.error) return 1;
                if (!a.error && b.error) return -1;
                if (a.error && b.error) {
                    aValue = a.domain.toLowerCase();
                    bValue = b.domain.toLowerCase();
                    break;
                }
                
                aValue = a.daysUntilExpiration;
                bValue = b.daysUntilExpiration;
                break;
            default:
                aValue = a[sortColumn];
                bValue = b[sortColumn];
        }
        
        // Compare based on direction
        if (sortDirection === 'asc') {
            return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
            return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
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
    
    // Save view preference to localStorage
    localStorage.setItem('viewType', currentView);
    
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
            card.innerHTML = `
                <div class="card-header">
                    <h3 title="${domain.domain}">${domain.domain}</h3>
                    <div class="header-badges">
                        <span class="badge badge-error">Failed</span>
                        <span class="status-emoji">❌</span>
                    </div>
                </div>
                <p class="description" title="${domain.description || ''}">${domain.description || ''}</p>
                <div class="card-body">
                    <p class="error" title="Error: ${domain.error}">Error: ${domain.error}</p>
                </div>
                <div class="card-actions">
                    <button onclick="showManualExpirationModal('${domain.domain}')" class="btn-primary btn-small">Set Expiration</button>
                    <button onclick="showDetails('${domain.domain}', this)" class="btn-details btn-small">Details</button>
                </div>
            `;
        } else {
            card.innerHTML = `
                <div class="card-header">
                    <h3>${domain.domain}</h3>
                    <div class="header-badges">
                        <span class="badge badge-error">Failed</span>
                        <span class="status-emoji">❌</span>
                    </div>
                </div>
                <div class="card-body">
                    <p class="description">${domain.description || ''}</p>
                    <p class="error">Error: ${domain.error}</p>
                </div>
                <div class="card-actions-grid">
                    <button onclick="showManualExpirationModal('${domain.domain}')" class="btn-primary">Set Expiration</button>
                    <button onclick="showDetails('${domain.domain}', this)" class="btn-details">Show Details</button>
                </div>
            `;
        }
        return card;
    }
    
    const expiryDate = new Date(domain.expirationDate).toLocaleDateString();
    const statusEmoji = getStatusEmoji(domain.daysUntilExpiration);
    const badgeHtml = domain.usingManualFallback 
        ? '<span class="badge badge-manual" title="Using manual expiration date fallback">Manual</span>' 
        : '<span class="badge badge-live" title="Fetched live via WHOIS">WHOIS</span>';
    
    // Create different layouts based on current view
    if (currentView === 'list') {
        card.innerHTML = `
            <div class="card-header">
                <h3 title="${domain.domain}">${domain.domain}</h3>
                <div class="header-badges">
                    ${badgeHtml}
                    <span class="status-emoji">${statusEmoji}</span>
                </div>
            </div>
            <p class="description" title="${domain.description || ''}">${domain.description || ''}</p>
            <div class="card-body">
                <p title="Expires on ${expiryDate}">Expires: ${expiryDate}</p>
                <p title="${domain.daysUntilExpiration} days until expiration">Days: ${domain.daysUntilExpiration}</p>
            </div>
            <div class="card-actions">
                <button onclick="showManualExpirationModal('${domain.domain}', '${domain.expirationDate ? new Date(domain.expirationDate).toISOString().split('T')[0] : ''}')" class="btn-secondary btn-small" title="Edit manual date">Edit Date</button>
                <button onclick="showDetails('${domain.domain}', this)" class="btn-details btn-small">Details</button>
            </div>
        `;
    } else {
        card.innerHTML = `
            <div class="card-header">
                <h3>${domain.domain}</h3>
                <div class="header-badges">
                    ${badgeHtml}
                    <span class="status-emoji">${statusEmoji}</span>
                </div>
            </div>
            <div class="card-body">
                <p class="description">${domain.description || ''}</p>
                <p>Expires: ${expiryDate}</p>
                <p>Days remaining: ${domain.daysUntilExpiration}</p>
            </div>
            <div class="card-actions-grid">
                <button onclick="showManualExpirationModal('${domain.domain}', '${domain.expirationDate ? new Date(domain.expirationDate).toISOString().split('T')[0] : ''}')" class="btn-secondary" title="Edit manual date">Edit Expiration</button>
                <button onclick="showDetails('${domain.domain}', this)" class="btn-details">Show Details</button>
            </div>
        `;
    }
    
    return card;
}

/**
 * Find registration date in WHOIS data
 */
function findRegistrationDate(whoisData) {
    if (!whoisData) return null;
    const regFields = [
      'creationDate',
      'createdDate',
      'created',
      'registeredOn',
      'registered',
      'registrationDate',
      'registeredDate',
      'creation'
    ];
    for (const field of regFields) {
        if (whoisData[field]) {
            const date = new Date(whoisData[field]);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
    }
    const regRegex = /(creat|regist)/i;
    for (const field in whoisData) {
        if (regRegex.test(field) && whoisData[field]) {
            const date = new Date(whoisData[field]);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
    }
    return null;
}

/**
 * Show Modal to set/edit manual expiration date
 */
async function showManualExpirationModal(domain, currentDate = '') {
    log('info', `Manual expiration modal requested for: ${domain}`);
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'manual-modal-title');
    
    modal.innerHTML = `
        <div class="modal-content glassmorphism">
            <button class="close" aria-label="Close">&times;</button>
            <h2 id="manual-modal-title">Set Expiration Date</h2>
            <p class="modal-subtitle">Domain: <strong>${domain}</strong></p>
            
            <div class="modal-form">
                <div class="form-group">
                    <label for="manualDateInput">Expiration Date</label>
                    <input type="date" id="manualDateInput" value="${currentDate}" class="modal-input">
                    ${!currentDate ? `<span id="manualDateSuggestionHint" class="suggestion-hint">Checking WHOIS for registration date...</span>` : ''}
                </div>
                
                <div class="modal-actions">
                    <button id="saveManualDateBtn" class="btn-primary">Save Expiration</button>
                    ${currentDate ? `<button id="clearManualDateBtn" class="btn-destructive">Reset to WHOIS</button>` : ''}
                    <button id="cancelManualDateBtn" class="btn-secondary">Cancel</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Fetch WHOIS in background to suggest expiration date if not already set
    if (!currentDate) {
        fetch(`/api/domains/${encodeURIComponent(domain)}/whois`)
            .then(res => res.json())
            .then(whoisData => {
                const regDate = findRegistrationDate(whoisData);
                if (regDate) {
                    const currentYear = new Date().getFullYear();
                    const suggestedDate = new Date(regDate);
                    suggestedDate.setFullYear(currentYear + 1);
                    const suggestedStr = suggestedDate.toISOString().split('T')[0];
                    
                    const dateInput = modal.querySelector('#manualDateInput');
                    const hintSpan = modal.querySelector('#manualDateSuggestionHint');
                    if (dateInput && !dateInput.value) { // only prefill if user hasn't selected a date yet
                        dateInput.value = suggestedStr;
                        if (hintSpan) {
                            hintSpan.textContent = `💡 Suggested date based on registration date (${regDate.toISOString().split('T')[0]})`;
                            hintSpan.className = 'suggestion-hint suggestion-success';
                        }
                    }
                } else {
                    const hintSpan = modal.querySelector('#manualDateSuggestionHint');
                    if (hintSpan) {
                        hintSpan.textContent = 'No registration date found in WHOIS';
                        hintSpan.className = 'suggestion-hint suggestion-muted';
                    }
                }
            })
            .catch(err => {
                log('warn', 'Failed to fetch WHOIS for manual expiration date suggestion', err);
                const hintSpan = modal.querySelector('#manualDateSuggestionHint');
                if (hintSpan) {
                    hintSpan.textContent = 'Could not retrieve registration date suggestion';
                    hintSpan.className = 'suggestion-hint suggestion-muted';
                }
            });
    }
    
    // Apply current theme
    const theme = localStorage.getItem('theme') || 'light';
    if (theme === 'dark') {
        modal.classList.add('dark-mode-compatible');
    }
    
    const closeBtn = modal.querySelector('.close');
    const cancelBtn = modal.querySelector('#cancelManualDateBtn');
    const saveBtn = modal.querySelector('#saveManualDateBtn');
    const clearBtn = modal.querySelector('#clearManualDateBtn');
    const dateInput = modal.querySelector('#manualDateInput');
    
    const closeModal = () => modal.remove();
    
    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;
    
    // Close on outside click
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // Save handler
    saveBtn.onclick = async () => {
        const selectedDate = dateInput.value;
        if (!selectedDate) {
            toast.error('Validation Error', 'Please select a valid date');
            return;
        }
        
        try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            
            const response = await fetch(`/api/domains/${encodeURIComponent(domain)}/manual-expiration`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ manualExpirationDate: selectedDate })
            });
            
            const result = await response.json();
            if (result.success) {
                toast.success('Saved', `Manual expiration date set for ${domain}`);
                closeModal();
                loadDashboard(false); // reload dashboard
            } else {
                toast.error('Error', result.error || 'Failed to save date');
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Expiration';
            }
        } catch (error) {
            log('error', 'Failed to save manual expiration date', error);
            toast.error('Network Error', 'Failed to communicate with server');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Expiration';
        }
    };
    
    // Clear handler
    if (clearBtn) {
        clearBtn.onclick = async () => {
            try {
                clearBtn.disabled = true;
                clearBtn.textContent = 'Resetting...';
                
                const response = await fetch(`/api/domains/${encodeURIComponent(domain)}/manual-expiration`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ manualExpirationDate: '' }) // empty to clear
                });
                
                const result = await response.json();
                if (result.success) {
                    toast.success('Reset Complete', `Expiration check reverted to WHOIS for ${domain}`);
                    closeModal();
                    loadDashboard(false); // reload dashboard
                } else {
                    toast.error('Error', result.error || 'Failed to reset');
                    clearBtn.disabled = false;
                    clearBtn.textContent = 'Reset to WHOIS';
                }
            } catch (error) {
                log('error', 'Failed to reset expiration date', error);
                toast.error('Network Error', 'Failed to communicate with server');
                clearBtn.disabled = false;
                clearBtn.textContent = 'Reset to WHOIS';
            }
        };
    }
}

/**
 * Show WHOIS details for a domain
 */
async function showDetails(domain, btn = null) {
    let originalText = '';
    if (btn) {
        btn.disabled = true;
        originalText = btn.textContent;
        btn.textContent = 'Loading...';
    }
    
    try {
        log('info', `WHOIS details requested for domain: ${domain}`);
        console.time(`WHOIS query for ${domain}`);
        
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
        
        // Format data for better display
        const formattedData = JSON.stringify(data, null, 2)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
                let cls = 'json-number';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'json-key';
                    } else {
                        cls = 'json-string';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'json-boolean';
                } else if (/null/.test(match)) {
                    cls = 'json-null';
                }
                return '<span class="' + cls + '">' + match + '</span>';
            });
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'whois-modal-title');
        
        modal.innerHTML = `
            <div class="modal-content">
                <button class="close" aria-label="Close">&times;</button>
                <h2 id="whois-modal-title">WHOIS Details - ${domain}</h2>
                <div class="whois-data">
                    <pre><code class="json">${formattedData}</code></pre>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        log('info', `WHOIS modal opened for ${domain}`);
        
        // Make sure modal doesn't break when theme is changed while open
        const applyCurrentTheme = () => {
            const theme = localStorage.getItem('theme') || 'light';
            if (theme === 'dark') {
                modal.classList.add('dark-mode-compatible');
            } else {
                modal.classList.remove('dark-mode-compatible');
            }
        };
        
        // Apply current theme immediately
        applyCurrentTheme();
        
        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = () => {
            log('info', `WHOIS modal closed for ${domain}`);
            modal.remove();
        };
        
        // Close on escape key
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                log('info', `WHOIS modal closed for ${domain} using escape key`);
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        });
        
        // Close on outside click
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                log('info', `WHOIS modal closed for ${domain} by clicking outside`);
                modal.remove();
            }
        });
    } catch (error) {
        log('error', `Error loading WHOIS details for ${domain}:`, error);
        toast.error('WHOIS Error', `Failed to load details for ${domain}`);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
}

// Update the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    log('info', 'Dashboard page loaded');
    
    // Add event listeners
    document.getElementById('viewToggle').addEventListener('click', toggleView);
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    
    // Initialize the dashboard with the saved view type
    const dashboard = document.getElementById('dashboard');
    dashboard.className = `dashboard ${currentView}-view`;
    
    // Update toggle button text based on current view
    const viewToggle = document.getElementById('viewToggle');
    const spanElement = viewToggle.querySelector('span');
    if (spanElement) {
        spanElement.textContent = currentView === 'card' ? 'List View' : 'Card View';
    }
    
    // Load domains with saved sort preferences
    loadDashboard();
}); 