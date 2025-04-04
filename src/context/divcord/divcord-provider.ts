import '../attach_context_root';
import { provide } from '@lit/context';
import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { createContext } from '@lit/context';
import { DivcordTable } from './DivcordTable';
import { divcordLoader } from './DivcordLoader';
import { toast } from '../../toast';

export const divcordTableContext = createContext<DivcordTable>('divcord-table');

@customElement('drop-data-provider')
export class DropDataProviderElement extends LitElement {
	@provide({ context: divcordTableContext })
	@property({ type: Object })
	divcordTable: DivcordTable = new DivcordTable([]);

	async connectedCallback(): Promise<void> {
		super.connectedCallback();
		divcordLoader.addEventListener('records-updated', records => {
			this.divcordTable = new DivcordTable(records);
			toast('Your drop data is up-to-date', 'success', 3000);
		});

		const records = await divcordLoader.get_records_and_start_update_if_needed();
		this.divcordTable = new DivcordTable(records);
	}

	protected render(): TemplateResult {
		return html`<slot></slot>`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'drop-data-provider': DropDataProviderElement;
	}
}
