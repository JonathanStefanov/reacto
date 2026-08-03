/**
 * HTML Helper — for building HTML strings in server components.
 *
 *   import { html } from '@reacto-org/ssr';
 *
 *   const layout = html`
 *     <div class="container">
 *       ${content}
 *     </div>
 *   `;
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((result, str, i) => {
    const value = values[i] ?? '';
    // Escape HTML in interpolated values
    const escaped = typeof value === 'string' ? escapeHtml(value) : String(value);
    return result + str + escaped;
  }, '');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
