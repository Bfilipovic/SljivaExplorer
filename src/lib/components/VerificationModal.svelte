<script lang="ts">
  import { onDestroy } from "svelte";
  import { createEventDispatcher } from "svelte";
  import type { VerificationCheck } from "../utils/verification";
  
  export let isOpen: boolean = false;
  export let currentStep: string = "";
  export let checks: VerificationCheck[] = [];
  export let isVerifying: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  function closeModal() {
    dispatch("close");
  }

  let dots: number = 1;

  // Animate dots every 500ms
  let intervalId: number | null = null;

  $: if (isOpen && isVerifying) {
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
    intervalId = window.setInterval(() => {
      dots = dots >= 3 ? 1 : dots + 1;
    }, 500);
  } else {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    dots = 1;
  }

  onDestroy(() => {
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
  });
</script>

{#if isOpen}
  <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div class="modal-content" class:error={!isVerifying && checks.length > 0 && checks.some(c => !c.passed)}>
      <h3 id="modal-title">
        {#if isVerifying}
          Verifying Transaction
        {:else if checks.length > 0 && checks.every(c => c.passed)}
          Verification Successful
        {:else}
          Verification Failed
        {/if}
      </h3>
      <div class="verification-status">
        {#if isVerifying}
          <p class="status-text">
            {currentStep}
            <span class="dots">{Array(dots).fill(".").join("")}</span>
          </p>
        {:else if checks.length > 0}
          <div class="checks-list">
            {#each checks as check}
              <div class="check-item" class:failed={!check.passed}>
                <span class="check-icon">
                  {#if check.passed}
                    ✓
                  {:else}
                    ✗
                  {/if}
                </span>
                <div class="check-content">
                  <div class="check-name">{check.name}</div>
                  {#if check.message}
                    <div class="check-message">{check.message}</div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
          <button class="close-button" on:click={closeModal}>Close</button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 1rem;
  }

  .modal-content {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 1rem;
    padding: 2rem;
    max-width: 500px;
    width: 100%;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  }

  .modal-content h3 {
    margin: 0 0 1.5rem;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
    text-align: center;
  }

  .verification-status {
    text-align: center;
  }

  .status-text {
    margin: 0;
    font-size: 1rem;
    color: var(--text-primary);
    font-family: monospace;
    white-space: nowrap;
  }

  .dots {
    display: inline-block;
    min-width: 1.5em;
    text-align: left;
  }

  .modal-content.error {
    border-color: #ef4444;
  }

  .close-button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    color: var(--text-primary);
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .close-button:hover {
    background: var(--card-border);
  }

  .checks-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .check-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 8px;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
  }

  .check-item.failed {
    border-color: #ef4444;
    background: rgba(239, 68, 68, 0.05);
  }

  .check-icon {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    font-weight: bold;
    color: #10b981;
  }

  .check-item.failed .check-icon {
    color: #ef4444;
  }

  .check-content {
    flex: 1;
    min-width: 0;
  }

  .check-name {
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
  }

  .check-message {
    font-size: 0.875rem;
    color: var(--text-secondary);
    line-height: 1.4;
  }

  .check-item.failed .check-message {
    color: #ef4444;
  }
</style>

