<script lang="ts">
  /** Terms of Service text - must match main store (Kodak Space) exactly. */
  export let tosText: string = '';
</script>

<div class="tos-content">
  <div class="tos-body whitespace-pre-line">{tosText || 'Loading...'}</div>
</div>

<style>
  .tos-content {
    max-width: 900px;
  }

  .tos-body {
    line-height: 1.7;
    color: var(--text-secondary);
  }

  .whitespace-pre-line {
    white-space: pre-line;
  }
</style>

