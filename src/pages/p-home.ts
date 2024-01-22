import { LitElement, PropertyValueMap, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { type CardSize } from '../elements/divination-card/e-divination-card';
import { SourcefulDivcordTable } from '../divcord';
import '../elements/e-page-controls';
import '../elements/e-card-with-sources';
import { consume } from '@lit/context';
import { divcordTableContext } from '../context';
import { SlConverter, paginate } from '../utils';
import '../elements/input/e-input';
import inputStyles from '../elements/input/input.styles';
import { poeData } from '../PoeData';
import { sortByWeight } from '../CardsFinder';
import { SearchCardsCriteria, searchCardsByQuery, SEARCH_CRITERIA_VARIANTS } from '../searchCardsByQuery';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';

declare global {
	interface HTMLElementTagNameMap {
		'p-home': HomePage;
	}
}

@customElement('p-home')
export class HomePage extends LitElement {
	@property({ reflect: true, type: Number, attribute: 'page' }) page = 1;
	@property({ reflect: true, type: Number, attribute: 'per-page' }) perPage = 10;
	@property({ reflect: true }) size: CardSize = 'medium';
	@property({ reflect: true }) filter: string = '';
	@property({ type: Array }) searchCriterias: SearchCardsCriteria[] = Array.from(SEARCH_CRITERIA_VARIANTS);

	@consume({ context: divcordTableContext, subscribe: true })
	@state()
	divcordTable!: SourcefulDivcordTable;

	@state() filtered: string[] = [];
	@state() paginated: string[] = [];

	async #onCardnameInput(e: InputEvent) {
		const input = e.target as HTMLInputElement;
		this.page = 1;
		this.filter = input.value;
	}

	protected willUpdate(map: PropertyValueMap<this>): void {
		if (map.has('filter') || map.has('searchCriterias') || map.has('divcordTable')) {
			const query = this.filter.trim().toLowerCase();
			const cards = searchCardsByQuery(query, this.searchCriterias, this.divcordTable);
			sortByWeight(cards, poeData);
			this.filtered = cards;
		}

		if (map.has('filtered') || map.has('page') || map.has('perPage')) {
			this.paginated = paginate(this.filtered, this.page, this.perPage);
		}
	}

	#onCriteriasSelect(e: Event) {
		const target = e.target as EventTarget & { value: string[] };
		const options = target.value.map(opt => SlConverter.fromSlValue<SearchCardsCriteria>(opt));
		this.searchCriterias = options;
	}

	render() {
		return html`<div class="page">
			<header>
				<form>
					<div style="max-width: 600px">
						<e-input
							autofocus
							label="Search"
							.value=${this.filter}
							.datalistItems=${this.divcordTable.cards()}
							@input="${this.#onCardnameInput}"
							type="text"
						>
						</e-input>
						<sl-select
							label="By"
							.value=${this.searchCriterias.map(c => SlConverter.toSlValue(c))}
							@sl-change=${this.#onCriteriasSelect}
							multiple
							clearable
						>
							${Array.from(SEARCH_CRITERIA_VARIANTS).map(c => {
								return html`<sl-option value=${SlConverter.toSlValue(c)}>${c}</sl-option>`;
							})}
						</sl-select>
					</div>
				</form>
				<e-page-controls
					.n=${this.filtered.length}
					page=${this.page}
					per-page=${this.perPage}
				></e-page-controls>
			</header>
			<ul class="cards">
				${this.paginated.map(card => {
					return html`<li>
						<e-card-with-sources
							.name=${card}
							.divcordTable=${this.divcordTable}
							.size=${this.size}
						></e-card-with-sources>
					</li>`;
				})}
			</ul>
		</div>`;
	}

	static styles = css`
		${inputStyles}
		* {
			padding: 0;
			margin: 0;
			box-sizing: border-box;
		}

		:host {
			display: block;
		}

		@media (max-width: 600px) {
			.page {
				margin-top: 1rem;
				padding: 0.5rem;
			}
		}

		header {
			margin-top: 1rem;
			justify-content: center;
			max-width: 600px;
			margin-inline: auto;
		}

		@media (max-width: 600px) {
			header {
				padding: 0.2rem;
			}
		}

		.cards {
			margin-top: 3rem;
			display: flex;
			flex-wrap: wrap;
			list-style: none;
			gap: 4rem;
			max-width: 1600px;
			margin-inline: auto;
			justify-content: center;
		}
	`;
}
