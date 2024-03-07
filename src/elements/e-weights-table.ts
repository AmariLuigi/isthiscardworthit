import { LitElement, html, css, PropertyValueMap } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Card } from '../gen/poeData';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import type { Order } from './types';
import { keyed } from 'lit/directives/keyed.js';

declare global {
	interface HTMLElementTagNameMap {
		'e-weights-table': WeightsTableElement;
	}
}

export type WeightsTableCard = Pick<Card, 'name' | 'weight'>;

function byWeight(cards: WeightsTableCard[], order: Order) {
	cards.sort((a, b) => (order === 'asc' ? a.weight - b.weight : b.weight - a.weight));
}

@customElement('e-weights-table')
export class WeightsTableElement extends LitElement {
	@property({ type: Array }) cards: WeightsTableCard[] = [];
	@property({ reflect: true }) order: Order = 'desc';
	@state() private iconName = '';
	@state() private cardsClone: WeightsTableCard[] = [];

	protected willUpdate(map: PropertyValueMap<this>): void {
		if (map.has('order')) {
			this.iconName = this.order === 'desc' ? 'sort-down' : 'sort-up';
			byWeight(this.cardsClone, this.order);
		}
		if (map.has('cards')) {
			this.cardsClone = structuredClone(this.cards);
		}
	}

	#onIconClick() {
		this.order = this.order === 'asc' ? 'desc' : 'asc';
	}

	protected render() {
		return html`<table class="weights-table">
			<thead>
				<tr>
					<th class="weights-table__th" scope="col">№</th>
					<th class="weights-table__th" scope="col">
						Card <sl-icon @click=${this.#onIconClick} .name=${this.iconName}></sl-icon>
					</th>
					<th class="weights-table__th">Weight</th>
				</tr>
			</thead>

			<tbody>
				${this.cardsClone.map(({ name, weight }, index) => {
					const weightStr =
						weight > 5
							? weight.toLocaleString('ru', { maximumFractionDigits: 0 })
							: weight.toLocaleString('ru', { maximumFractionDigits: 2 });

					return keyed(
						name,
						html`<tr>
							<td class="weights-table__td">${index + 1}</td>
							<td class="weights-table__td">
								<e-divination-card size="small" name=${name}></e-divination-card>
							</td>
							<td class="weights-table__td td-weight">${weightStr}</td>
						</tr>`
					);
				})}
			</tbody>
		</table>`;
	}

	static styles = css`
		* {
			padding: 0;
			margin: 0;
			box-sizing: border-box;
		}

		.weights-table {
			border-collapse: collapse;
			border: 1px solid rgba(140, 140, 140, 0.3);
		}

		.weights-table__th,
		.weights-table__td {
			padding: 1rem;
			border: 1px solid rgba(160, 160, 160, 0.2);
			text-align: center;
		}

		.td-weight {
			font-weight: 700;
			font-size: 20px;
		}

		@media (width < 25rem) {
			.weights-table__th,
			.weights-table__td {
				padding: 0.4rem;
			}
		}
	`;
}
