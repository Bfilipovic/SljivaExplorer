<script lang="ts">
  import { onMount } from "svelte";
  import SearchPanel from "./lib/components/SearchPanel.svelte";
  import ResultPanel from "./lib/components/ResultPanel.svelte";
  import NetworkPage from "./lib/components/NetworkPage.svelte";
  import VerificationPage from "./lib/components/VerificationPage.svelte";
  import TermsOfServicePage from "./lib/components/TermsOfServicePage.svelte";
  import TermsOfServiceModal from "./lib/components/TermsOfServiceModal.svelte";
  import type { ExplorerResult, Pagination, StoreInfo } from "./lib/types";
  import { unifiedSearch, fetchStores } from "./lib/api";

  const pageSize = 50;

  let query = "";
  let loading = false;
  let error: string | null = null;
  let result: ExplorerResult | null = null;
  let pagination: Pagination | null = null;
  let currentPage = 0;
  let theme: "dark" | "light" = "dark";
  let stores: StoreInfo[] = [];
  let selectedStoreId: string | null = null;
  let mobileMenuOpen = false;
  let activeSection = "search";
  let showTosModal = false;

  // Search history for browser-like navigation
  type HistoryEntry = {
    query: string;
    storeId: string | null;
  };
  let searchHistory: HistoryEntry[] = [];
  let historyIndex = -1; // Current position in history (-1 means no history)
  let isNavigatingHistory = false; // Flag to prevent adding to history when navigating
  
  // Terms of Service text
  const tosText = `NFTs are the evidence of the Real-world asset (RWA) in the digital world that can be bought and sold like any other piece of property, issued via Blockchain.

The Platform is built on top of the Blockchain network and users can buy and sell NFT parts using the crypto currencies, only, Ether (ETH) or Solana (SOL). 
No fiat money is stored or handled by the Platform at any point.

The prices are displayed in YRT (a platform token, only) is converted to ETH or SOL at the time of transaction. The value of one YRT is based on a weighted basket of five major currencies.
YRT is a Clearing Token that designed to to facilitate transactions directly on the blockchain.

NFTs are divided into parts that can be individually owned and traded
"NFT Parts" means fractionalized portions of NFTs, each tracked by unique identifiers and transaction hashes, deployed to the Ethereum and Solana blockchains, allowing multiple users to own different parts of the same NFT.
Platform tracks individual parts of NFTs.

Peer-to-peer transactions, allow you freely trade assets by your "NFT Parts", without a bank or financial institution intermediary.

Platform uses 12-word mnemonic phrases as a basic and only standard for Blockchain authentication.
Users are responsible for protecting the confidentiality of their login information and private keys (12-word mnemonic phrases) that control their blockchain accounts or addresses through which they interact with the Platform. 
IMPORTANT: Your mnemonic phrase is encrypted and stored locally in your browser, it never leaves your device or transmitted to any third part servers.

All NFT parts you own on the Platform belong to you. What's yours is yours — you own your NFT parts.
The NFTs Platform are being provided on an "AS IS" and "AS AVAILABLE" basis.

NFTs Platform shall not be liable for any errors, misrepresentations, or omissions in, of, and about, the content, nor for the availability of the content. NFTs Platform shall not be liable for any losses, injuries, or damages from the purchase, inability to purchase, display, or use of content.
All transactions are permanently stored on Arweave Blockchain for verification and audit purposes.

Users must not create, buy, sell, gift, or use any NFT part or Collectible that infringes or in a manner infringing the copyright, trademark, patent, trade secret or other intellectual property or other proprietary rights of others, or upload, or otherwise make available, files that contain images, photographs, or other material protected by intellectual property laws or rights of privacy or publicity unless the applicable User owns or controls the rights thereto or has received all necessary consent to do the same.
User acknowledges and agrees that use of the Offerings is at the User's own risk and on own initiative and are responsible for compliance with local laws.
Before Users make any decisions involving the Offerings, Users should seek independent professional advice from persons licensed and qualified in the area for which such advice would be appropriate.

"Nomin Explorer" is a service for browsing and verifying transactions.`;

  function openTosModal() {
    showTosModal = true;
  }

  onMount(async () => {
    applyTheme();
    try {
      stores = await fetchStores();
    } catch (err) {
      console.error("Failed to fetch stores:", err);
      // Continue with empty stores array - will default to "all stores"
    }
  });

  async function executeSearch(value: string, page = 0, storeId: string | null = null, addToHistory = true) {
    const input = value.trim();
    if (!input) {
      error = "Please enter a value to search.";
      result = null;
      pagination = null;
      return;
    }

    loading = true;
    error = null;

    try {
      const data = await unifiedSearch(input, { 
        page, 
        pageSize,
        storeId: storeId || undefined
      });
      result = data;
      pagination = data.pagination;
      currentPage = page;

      // Add to history if not navigating through history
      if (addToHistory && !isNavigatingHistory) {
        const newEntry: HistoryEntry = { query: input, storeId };
        // Remove any forward history (if we're not at the end)
        if (historyIndex < searchHistory.length - 1) {
          searchHistory = searchHistory.slice(0, historyIndex + 1);
        }
        // Add new entry
        searchHistory = [...searchHistory, newEntry];
        historyIndex = searchHistory.length - 1;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Unexpected error";
      result = null;
      pagination = null;
    } finally {
      loading = false;
      isNavigatingHistory = false;
    }
  }

  async function handleSearch(event: CustomEvent<{ query: string; storeId?: string | null }>) {
    query = event.detail.query;
    selectedStoreId = event.detail.storeId ?? null;
    await executeSearch(query, 0, selectedStoreId, true);
  }

  async function goBack() {
    if (historyIndex > 0) {
      historyIndex--;
      const entry = searchHistory[historyIndex];
      isNavigatingHistory = true;
      query = entry.query;
      selectedStoreId = entry.storeId;
      await executeSearch(entry.query, 0, entry.storeId, false);
    }
  }

  async function goForward() {
    if (historyIndex < searchHistory.length - 1) {
      historyIndex++;
      const entry = searchHistory[historyIndex];
      isNavigatingHistory = true;
      query = entry.query;
      selectedStoreId = entry.storeId;
      await executeSearch(entry.query, 0, entry.storeId, false);
    }
  }

  $: canGoBack = historyIndex > 0;
  $: canGoForward = historyIndex < searchHistory.length - 1;

  function totalPages() {
    if (!pagination) return 0;
    return Math.max(1, Math.ceil(pagination.total / pagination.limit));
  }

  async function goToPage(page: number) {
    if (!pagination) return;
    const pages = totalPages();
    if (page < 0 || page >= pages) return;
    await executeSearch(query, page, selectedStoreId);
  }

  function toggleTheme() {
    theme = theme === "dark" ? "light" : "dark";
    applyTheme();
  }

  function applyTheme() {
    document.body.classList.toggle("light-theme", theme === "light");
  }

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }

  function setActiveSection(section: string) {
    activeSection = section;
    mobileMenuOpen = false;
  }

  function scrollToSearch(e?: Event) {
    if (e) e.preventDefault();
    const searchPanel = document.querySelector('.search-panel');
    if (searchPanel) {
      searchPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setActiveSection('search');
  }

  function handleNavClick(e: Event, section: string) {
    e.preventDefault();
    setActiveSection(section);
    mobileMenuOpen = false;
    
    // Scroll to top for navigation pages
    if (section !== 'search') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

</script>

<nav class="navbar sticky">
  <div class="navbar__container">
    <div class="navbar__brand">
      <h1 class="navbar__title">NFT Explorer</h1>
      <p class="navbar__subtitle">Search transactions across the network.</p>
    </div>
    
    <div class="navbar__menu" class:open={mobileMenuOpen}>
      <a href="#search" class="navbar__link" class:active={activeSection === 'search'} on:click={(e) => scrollToSearch(e)}>
        Search
      </a>
      <a href="#network" class="navbar__link" class:active={activeSection === 'network'} on:click={(e) => handleNavClick(e, 'network')}>
        Our network
      </a>
      <a href="#terms" class="navbar__link" class:active={activeSection === 'terms'} on:click={(e) => handleNavClick(e, 'terms')}>
        Terms of service
      </a>
      <a href="#verification" class="navbar__link" class:active={activeSection === 'verification'} on:click={(e) => handleNavClick(e, 'verification')}>
        Verification & Arweave
      </a>
    </div>

    <div class="navbar__actions">
      <button 
        class="theme-toggle" 
        type="button" 
        on:click={toggleTheme}
        aria-label="Toggle theme"
        title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {#if theme === "dark"}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 3V1M10 19V17M17 10H19M1 10H3M15.657 15.657L16.97 16.97M3.03 3.03L4.343 4.343M15.657 4.343L16.97 3.03M3.03 16.97L4.343 15.657M14 10C14 12.2091 12.2091 14 10 14C7.79086 14 6 12.2091 6 10C6 7.79086 7.79086 6 10 6C12.2091 6 14 7.79086 14 10Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        {:else}
          <svg width="20" height="20" viewBox="0 0 324.694 324.694" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M291.396,287.685c-0.646-3.021-3.045-5.356-6.077-5.925c-58.351-11.019-104.084-55.646-116.517-113.696
              c-12.433-58.06,11.013-117.502,59.735-151.451c2.531-1.761,3.759-4.876,3.115-7.894c-0.647-3.018-3.046-5.355-6.078-5.933
              c-21.053-3.976-42.939-3.691-64.052,0.824c-42.397,9.078-78.725,34.122-102.286,70.528
              c-23.559,36.397-31.535,79.792-22.454,122.189c15.926,74.377,82.62,128.361,158.579,128.367c0.004,0,0.013,0,0.017,0
              c11.396,0,22.88-1.221,34.129-3.625c21.267-4.554,41.042-13.129,58.772-25.484C290.816,293.817,292.04,290.701,291.396,287.685z
              M226.294,306.07c-10.197,2.18-20.597,3.288-30.916,3.288c-0.004,0-0.007,0-0.013,0c-68.777-0.008-129.161-48.891-143.581-116.244
              c-8.224-38.391-1.004-77.68,20.33-110.642c21.333-32.96,54.227-55.646,92.621-63.861c10.181-2.187,20.58-3.288,30.9-3.288
              c3.119,0,6.245,0.097,9.365,0.299c-43.655,38.534-63.604,97.721-51.202,155.652c12.41,57.93,54.851,103.759,110.463,121.029
              C252.376,298.597,239.663,303.209,226.294,306.07z"/>
          </svg>
        {/if}
      </button>
      
      <button 
        class="mobile-menu-toggle" 
        type="button" 
        on:click={toggleMobileMenu}
        aria-label="Toggle menu"
        aria-expanded={mobileMenuOpen}
      >
        <span class="hamburger" class:active={mobileMenuOpen}>
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>
    </div>
  </div>
</nav>

<main class="app">
  {#if activeSection === 'search'}
    <div class="search-panel">
      <SearchPanel
        bind:query
        {loading}
        {error}
        {stores}
        bind:selectedStoreId
        on:search={handleSearch}
      />
    </div>

    {#if result}
      <ResultPanel 
        {result} 
        {canGoBack}
        {canGoForward}
        {loading}
        onGoBack={goBack}
        onGoForward={goForward}
        on:search={handleSearch} 
        on:navigateToVerification={() => {
          setActiveSection('verification');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }} 
      />
    {/if}
  {:else if activeSection === 'network'}
    <NetworkPage />
  {:else if activeSection === 'terms'}
    <div class="content-page">
      <div class="content-header">
        <h2>Terms of Service</h2>
      </div>
      <div class="content-body">
        <TermsOfServicePage />
      </div>
    </div>
  {:else if activeSection === 'verification'}
    <div class="content-page">
      <div class="content-header">
        <h2>Verification & Arweave</h2>
        <p class="content-description">
          Learn how we ensure transaction integrity through cryptographic verification and permanent storage on Arweave.
        </p>
      </div>
      <div class="content-body">
        <VerificationPage />
      </div>
    </div>
  {/if}

  {#if activeSection === 'search' && pagination && pagination.total > pagination.limit}
    <nav class="pager">
      <button
        type="button"
        class="pager__button"
        on:click={() => goToPage(currentPage - 1)}
        disabled={loading || currentPage === 0}
      >
        Previous
      </button>
      <span class="pager__info">
        Page {currentPage + 1} of {totalPages()}
      </span>
      <button
        type="button"
        class="pager__button"
        on:click={() => goToPage(currentPage + 1)}
        disabled={loading || currentPage + 1 >= totalPages()}
      >
        Next
      </button>
    </nav>
  {/if}
</main>

<TermsOfServiceModal bind:visible={showTosModal} {tosText} />

<style>
  .navbar {
    position: sticky;
    top: 0;
    z-index: 1000;
    background: var(--card-bg);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--card-border);
    box-shadow: 0 4px 6px -1px var(--card-shadow);
  }

  .navbar__container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 1rem clamp(1rem, 5vw, 2rem);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
  }

  .navbar__brand {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }

  .navbar__title {
    margin: 0;
    font-size: clamp(1.5rem, 2.5vw, 1.75rem);
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--text-primary);
    line-height: 1.2;
  }

  .navbar__subtitle {
    margin: 0;
    color: var(--text-secondary);
    font-size: clamp(0.875rem, 1.5vw, 0.95rem);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .navbar__menu {
    display: flex;
    align-items: center;
    gap: 2.5rem;
    flex: 1;
    justify-content: center;
  }

  @media (min-width: 769px) and (max-width: 1024px) {
    .navbar__menu {
      gap: 1.5rem;
    }
  }

  .navbar__link {
    color: var(--text-secondary);
    text-decoration: none;
    font-weight: 500;
    font-size: 0.95rem;
    padding: 0.5rem 0;
    position: relative;
    transition: color 0.2s ease;
    white-space: nowrap;
  }

  .navbar__link:hover {
    color: var(--text-primary);
  }

  .navbar__link.active {
    color: var(--accent);
  }

  .navbar__link.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--accent);
    border-radius: 2px 2px 0 0;
  }

  .navbar__actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .theme-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    border: 1px solid var(--card-border);
    background: transparent;
    color: var(--text-primary);
    cursor: pointer;
    transition: background 0.2s ease, border-color 0.2s ease;
    padding: 0;
  }

  .theme-toggle:hover {
    background: var(--card-border);
  }

  .mobile-menu-toggle {
    display: none;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    background: transparent;
    color: var(--text-primary);
    cursor: pointer;
    padding: 0;
  }

  .hamburger {
    display: flex;
    flex-direction: column;
    gap: 5px;
    width: 24px;
  }

  .hamburger span {
    display: block;
    height: 2px;
    width: 100%;
    background: currentColor;
    border-radius: 2px;
    transition: all 0.3s ease;
  }

  .hamburger.active span:nth-child(1) {
    transform: rotate(45deg) translate(6.5px, 6.5px);
  }

  .hamburger.active span:nth-child(2) {
    opacity: 0;
    width: 0;
  }

  .hamburger.active span:nth-child(3) {
    transform: rotate(-45deg) translate(6.5px, -6.5px);
  }

  @media (max-width: 768px) {
    .navbar__container {
      flex-wrap: nowrap;
      position: relative;
    }

    .navbar__brand {
      flex: 1;
      min-width: 0;
    }

    .navbar__subtitle {
      white-space: normal;
    }

    .navbar__menu {
      display: none;
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--card-bg);
      border-top: 1px solid var(--card-border);
      flex-direction: column;
      align-items: stretch;
      padding: 1rem;
      gap: 0;
      box-shadow: 0 4px 6px -1px var(--card-shadow);
    }

    .navbar__menu.open {
      display: flex;
    }

    .navbar__link {
      padding: 1rem;
      border-bottom: 1px solid var(--card-border);
      font-size: 1rem;
    }

    .navbar__link:last-child {
      border-bottom: none;
    }

    .navbar__link.active::after {
      display: none;
    }

    .navbar__link.active {
      background: var(--card-border);
      border-radius: 6px;
    }

    .mobile-menu-toggle {
      display: flex;
    }

    .navbar__actions {
      gap: 0.5rem;
    }
  }

  @media (max-width: 480px) {
    .navbar__title {
      font-size: 1.25rem;
    }

    .navbar__subtitle {
      font-size: 0.8rem;
    }
  }

  .app {
    min-height: 100vh;
    padding: 2.5rem clamp(1rem, 5vw, 4rem);
    display: grid;
    gap: 2rem;
    color: var(--text-primary);
  }

  .search-panel {
    scroll-margin-top: 100px;
  }

  :global(.content-page) {
    max-width: 1200px;
    margin: 0;
    padding: 0;
    width: 100%;
  }

  :global(.content-header) {
    margin-bottom: 3rem;
    text-align: left;
    width: 100%;
  }

  :global(.content-header h2) {
    margin: 0 0 1rem;
    font-size: clamp(2rem, 3vw, 2.5rem);
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--text-primary);
    text-align: left;
    width: 100%;
  }

  :global(.content-description) {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.7;
    font-size: 1.05rem;
    max-width: 700px;
  }

  .content-body {
    color: var(--text-secondary);
    line-height: 1.7;
    font-size: 1.05rem;
  }

  .content-body p {
    margin: 0 0 1.5rem;
  }

  .content-body p:last-child {
    margin-bottom: 0;
  }

  @media (max-width: 768px) {
    .content-body {
      overflow-x: hidden;
      word-wrap: break-word;
      overflow-wrap: break-word;
      width: 100%;
      max-width: 100%;
    }

    :global(.content-page) {
      max-width: 100%;
      overflow-x: hidden;
    }
  }

  .pager {
    display: flex;
    align-items: center;
    gap: 1rem;
    justify-content: flex-end;
  }

  .pager__button {
    padding: 0.65rem 1.2rem;
    border-radius: 999px;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    color: var(--text-primary);
    cursor: pointer;
    transition: background 0.2s ease, opacity 0.2s ease;
  }

  .pager__button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pager__button:not(:disabled):hover {
    background: var(--card-border);
  }

  .pager__info {
    font-size: 0.9rem;
    color: var(--text-muted);
  }
</style>

