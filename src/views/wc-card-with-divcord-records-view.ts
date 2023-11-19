import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../elements/wc-act-area.js';
import { SourcefulDivcordTableRecord } from '../data/SourcefulDivcordTableRecord.js';
import '../elements/divination-card/wc-divination-card.js';
import '../elements/wc-sourceful-divcord-record.js';
import { PoeData } from '../PoeData.js';

declare global {
	interface HTMLElementTagNameMap {
		'wc-card-with-divcord-records-view': CardWithDivcordRecordsViewElement;
	}
}

@customElement('wc-card-with-divcord-records-view')
export class CardWithDivcordRecordsViewElement extends LitElement {
	@property({ type: Object }) poeData!: PoeData;
	@property({ reflect: true }) card!: string;
	@property({ type: Array }) records!: SourcefulDivcordTableRecord[];

	render() {
		return html`<div class="view">
			<wc-divination-card
				.minLevel=${this.poeData.minLevel(this.card)}
				size="large"
				.name=${this.card}
			></wc-divination-card>
			<ul>
				${this.records.map(
					record =>
						html`<li>
							<wc-sourceful-divcord-record
								.poeData=${this.poeData}
								.record=${record}
							></wc-sourceful-divcord-record>
						</li>`
				)}
			</ul>
		</div>`;
	}

	static styles = css`
		wc-divination-card {
			view-transition-name: card;
		}

		ul {
			list-style: none;
		}
	`;
}
