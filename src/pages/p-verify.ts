// 3.25 SKIP for now

import { LitElement, PropertyValueMap, TemplateResult, html } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { divcordTableContext } from '../context';
import { DivcordTable } from '../DivcordTable';
import { consume } from '@lit/context';
import { SourceAndCards, cardsBySourceTypes, sortByWeight } from '../cards';
import { PoeData, poeData } from '../PoeData';
import { SOURCE_TYPE_VARIANTS, Source } from '../gen/Source';
import '../elements/e-source-with-cards';
import '../elements/e-verify-faq-alert';
import '../elements/e-need-to-verify';
import type { CardSize } from '../elements/divination-card/e-divination-card';
import type { Card } from '../gen/poeData';
import '../elements/weights-table/e-weights-table-verify-sources';
import { DivcordRecord } from '../gen/divcord';
import type { SourceSize } from '../elements/e-source/types';
import { styles } from './p-verify.styles';
import '@shoelace-style/shoelace/dist/components/details/details.js';
import { prepareWeightData } from '../elements/weights-table/lib';
import { RowData } from '../elements/weights-table/e-weights-table-verify-sources';
import { NavigateTransitionEvent } from '../events';
import { choose } from 'lit/directives/choose.js';
import { classMap } from 'lit/directives/class-map.js';
import '@shoelace-style/shoelace/dist/components/range/range.js';

@customElement('p-verify')
export class VerifyPage extends LitElement {
	#cardSize: CardSize = 'small';
	#sourceSize: SourceSize = 'medium';

	@property() activeView: ActiveView = 'weights-table';

	@consume({ context: divcordTableContext, subscribe: true })
	@state()
	divcordTable!: DivcordTable;

	/** Dropsource involved in view transitions */
	@state() activeSource?: string = window.activeSource;
	@state() sourcesAndCards: SourceAndCards[] = [];
	@state() detailsOfContentsOpen = true;
	@state() byCategory: {
		maps: SourceAndCards[];
		acts: SourceAndCards[];
		other: SourceAndCards[];
	} = Object.create({});
	@state() weightsTableData: RowData[] = [];
	@state() filteredWeightsTableData: RowData[] = [];
	@state() cardWeightsGrouped: Record<string, { card: string; weight: number; source: Source }[]> = Object.create({});
	/** Minimum weight for Weights Table slider */
	@state() minimumWeight = 10000;

	@query('.table-of-contents') detailsOfContents!: HTMLDetailsElement;
	@query('details ul') contentsLinksList!: HTMLElement;
	@query('.list') sourceWithCardsList!: HTMLElement;

	// actView() {
	// 	return html`<sl-radio-group
	// 		@sl-change=${this.#onActiveViewChanged}
	// 		class="select-view-controls"
	// 		size="large"
	// 		label="Select the view"
	// 		name="a"
	// 		value=${this.activeView}
	// 	>
	// 		<sl-radio-button value="list">List</sl-radio-button>
	// 		<sl-radio-button value="table">Table</sl-radio-button>
	// 	</sl-radio-group>`;
	// }

	constructor() {
		super();
		this.addEventListener('click', e => {
			const target = e.composedPath()[0];
			if (target instanceof HTMLAnchorElement) {
				const { hash } = new URL(target.href);
				const el = this.shadowRoot?.getElementById(hash.slice(1));
				if (el && el instanceof HTMLElement) {
					el.style.setProperty('scroll-margin-top', '50px');
					el.scrollIntoView({ behavior: 'smooth' });
				}
			}
		});
	}

	// protected async firstUpdated(_changedProperties: PropertyValueMap<this>): Promise<void> {
	// 	const { hash } = new URL(window.location.href);
	// 	if (hash) {
	// 		const el = this.shadowRoot?.getElementById(hash.slice(1));
	// 		if (el && el instanceof HTMLElement) {
	// 			await new Promise(r => setTimeout(r, 0));
	// 			el.style.setProperty('scroll-margin-top', '50px');
	// 			el.scrollIntoView();
	// 		}
	// 	}

	// 	if (window.innerWidth < 1600) {
	// 		this.detailsOfContentsOpen = false;
	// 		this.detailsOfContents.style.setProperty('height', 'auto');
	// 	}

	/** 
    <!-- <sl-details summary="Table of contents" class="table-of-contents" ?open=${this
					.detailsOfContentsOpen}>
					<div class="table-of-contents__inner">
						<ol class="brief-table-of-contents" start="1">
							<li>
								<a href="#maps"> Maps</a>
							</li>
							<li>
								<a href="#acts"> Acts</a>
							</li>
							<li>
								<a href="#other"> Other</a>
							</li>

							<li class="li-link-to-weights-table"><a href="#details-weights-table">Weights Table</a></li>
						</ol>

						<a class="category-heading-link" href="#maps">Maps</a>
						${ContentsList({ sourcesAndCards: this.byCategory.maps })}
						<a class="category-heading-link" href="#acts">Acts</a>
						${ContentsList({ sourcesAndCards: this.byCategory.acts })}
						<a class="category-heading-link" href="#other">Other</a>
						${ContentsList({ sourcesAndCards: this.byCategory.other })}
					</div>
				</sl-details> -->
                **/
	// }

	protected willUpdate(map: PropertyValueMap<this>): void {
		if (map.has('divcordTable') || map.has('activeView')) {
			if (this.activeView === 'weights-table') {
				this.weightsTableData = weightsTableData(this.divcordTable.records, poeData);
			} else {
				// skip if already set up
				if (this.sourcesAndCards.length > 0) {
					return;
				}

				const sourcesAndCards = cardsBySourceTypes(
					Array.from(SOURCE_TYPE_VARIANTS),
					this.divcordTable.records,
					poeData
				)
					.map(({ cards, source }) => ({
						cards: cards.filter(c => c.status === 'verify'),
						source,
					}))
					.filter(({ cards }) => cards.length > 0)
					.sort((a, b) => b.cards.length - a.cards.length);
				for (const { cards } of sourcesAndCards) {
					sortByWeight(cards, poeData);
				}

				// move sources with solo Rebirth cards to the end
				// to make it less spammy
				const rebirth: SourceAndCards[] = [];
				let cards: SourceAndCards[] = sourcesAndCards.filter(c => {
					if (c.cards.length === 1 && c.cards.map(c => c.card).includes('Rebirth')) {
						rebirth.push(c);
						return false;
					} else {
						return true;
					}
				});
				cards = [...cards, ...rebirth];

				// Split by category
				this.byCategory.acts = cards.filter(
					({ source }) => source.type === 'Act' || source.type === 'Act Boss'
				);
				this.byCategory.maps = cards.filter(
					({ source }) => source.type === 'Map' || source.type === 'Map Boss'
				);
				this.byCategory.other = cards.filter(({ source }) =>
					['Act', 'Map', 'Act Boss', 'Map Boss'].every(type => type !== source.type)
				);

				this.sourcesAndCards = structuredClone(cards);
			}
		}

		if (map.has('divcordTable') || map.has('activeView') || map.has('minimumWeight')) {
			this.filteredWeightsTableData = this.weightsTableData
				.filter(({ weight }) => weight >= this.minimumWeight)
				.sort((a, b) => b.weight - a.weight);
		}
	}

	protected render(): TemplateResult {
		return html`<div class="page">
			<header>
				<h1 class="heading">Need to verify</h1>
				<div>
					<nav class="nav">
						${ACTIVE_VIEW_VARIANTS.map(
							variant =>
								html`<a class=${classMap({
									'nav-link--active': variant === this.activeView,
								})} href=/verify/${variant}>${linkLabel(variant)}</a>`
						)}
					</nav>
					<e-verify-faq-alert></e-verify-faq-alert>
				</div>
			</header>

			<main class="main">
				${choose(this.activeView, [
					[
						'acts',
						() =>
							html` ${SourceWithCardsList({
								sourcesAndCards: this.byCategory.acts,
								cardSize: this.#cardSize,
								sourceSize: this.#sourceSize,
								onNavigateTransition: this.#handleNavigateTransition,
								activeSource: this.activeSource,
							})}`,
					],
					[
						'maps',
						() =>
							html` ${SourceWithCardsList({
								sourcesAndCards: this.byCategory.maps,
								cardSize: this.#cardSize,
								sourceSize: this.#sourceSize,
								onNavigateTransition: this.#handleNavigateTransition,
								activeSource: this.activeSource,
							})}`,
					],
					[
						'others',
						() =>
							html` ${SourceWithCardsList({
								sourcesAndCards: this.byCategory.other,
								cardSize: this.#cardSize,
								sourceSize: this.#sourceSize,
								onNavigateTransition: this.#handleNavigateTransition,
								activeSource: this.activeSource,
							})}`,
					],
					[
						'weights-table',
						() => html`<sl-range @sl-change=${this.#changeMinimumWeight} .value=${
							this.minimumWeight
						} .label=${`Showing ${this.filteredWeightsTableData.length} cards with weight > ${formatWeight(
							this.minimumWeight
						)}`} min="0" step="100" max="30000"></sl-range>
								<e-weights-table-verify-sources
									.rows=${this.filteredWeightsTableData}
								></e-weights-table-verify-sources>
								<!-- </details> -->
							</sl-sl>
						`,
					],
				])}
			</main>
		</div>`;
	}

	#changeMinimumWeight(e: Event) {
		const value = Number((e.target as HTMLInputElement).value);
		this.minimumWeight = value;
	}

	#handleNavigateTransition(e: NavigateTransitionEvent) {
		window.activeSource = e.slug;
		this.activeSource = e.slug;
	}

	static styles = styles;
}

function SourceWithCardsList({
	sourcesAndCards,
	cardSize,
	sourceSize,
	onNavigateTransition,
	activeSource,
}: {
	sourcesAndCards: SourceAndCards[];
	cardSize: CardSize;
	sourceSize: SourceSize;
	onNavigateTransition: (e: NavigateTransitionEvent) => void;
	activeSource: string | undefined;
}): TemplateResult {
	return html`<ul class="source-with-cards-list">
		${sourcesAndCards.map(({ source, cards }: SourceAndCards) => {
			let name = source.id;
			if (source.type === 'Act') {
				const area = poeData.find.actArea(source.id);
				if (area) {
					name = area.name;
				}
			}
			const hash = name.replaceAll(' ', '_');

			if (source.idSlug === activeSource) {
				return html`
					<li id="${hash}">
						<e-source-with-cards
							card-size=${cardSize}
							source-size=${sourceSize}
							.source=${source}
							.cards=${cards}
							@navigate-transition=${onNavigateTransition}
							part="active-source"
						></e-source-with-cards>
					</li>
				`;
			}

			return html`
				<li id="${hash}">
					<e-source-with-cards
						card-size=${cardSize}
						source-size=${sourceSize}
						.source=${source}
						.cards=${cards}
						@navigate-transition=${onNavigateTransition}
					></e-source-with-cards>
				</li>
			`;
		})}
	</ul>`;
}

// function ContentsList({ sourcesAndCards }: { sourcesAndCards: SourceAndCards[] }): TemplateResult {
// 	return html`<ul>
// 		${sourcesAndCards.map(({ source, cards }) => {
// 			let name = source.id;
// 			if (source.type === 'Act') {
// 				const area = poeData.find.actArea(source.id);
// 				if (area) {
// 					name = area.name;
// 				}
// 			}
// 			const hash = name.replaceAll(' ', '_');
// 			const cardsString = cards.map(({ card }) => card).join(', ');
// 			return html`<li>
// 				<a href="#${hash}">${name} <span style="font-size: 11px; color: #999">${cardsString}</span></a>
// 			</li> `;
// 		})}
// 	</ul>`;
// }

function weightsTableData(records: DivcordRecord[], poeData: PoeData): RowData[] {
	return Object.entries(groupBy(records, ({ card }) => card))
		.map(([card, records]) => ({
			card: poeData.find.card(card),
			sources: records.flatMap(record =>
				record.verifySources.filter(({ type }) => type === 'Map' || type === 'Act')
			),
		}))
		.filter((obj): obj is { card: Card; sources: Source[] } => obj.card !== null && obj.sources.length > 0)
		.map(({ card, sources }) => ({
			...prepareWeightData(card),
			sources,
		}));
}

type GroupBy = <T, Key extends string>(
	arr: Array<T>,
	cb: (el: T, index: number, arr: Array<T>) => Key
) => Record<Key, T[]>;

declare global {
	interface Object {
		groupBy: GroupBy;
	}
}

const groupBy = <T>(arr: T[], cb: (el: T, index: number, arr: T[]) => string): Record<string, T[]> => {
	const record: Record<string, T[]> = Object.create({});

	for (let i = 0; i < arr.length; i++) {
		const el = arr[i];
		const key = cb(el, i, arr);

		const groupedByKey = record[key] ?? [];
		groupedByKey.push(el);
		record[key] = groupedByKey;
	}

	return record;
};

// #activeScrollEl: HTMLElement | null = null;
// get activeScrollEl(): HTMLElement | null {
// 	return this.#activeScrollEl;
// }
// set activeScrollEl(val: HTMLElement | null) {
// 	if (val === null) return;

// 	this.#activeScrollEl?.classList.remove('active');
// 	this.#activeScrollEl = val;
// 	this.#activeScrollEl.classList.add('active');

// 	if (!this.#InView(this.detailsOfContents, val)) {
// 		val.scrollIntoView();
// 	}
// }
// #InView(container: HTMLElement, el: HTMLElement) {
// 	const containerScrollTop = container.scrollTop;
// 	const rect = el.getBoundingClientRect();

// 	if (rect.top < 100) {
// 		return false;
// 	}

// 	return containerScrollTop + Math.abs(rect.y) < container.clientHeight;
// }
// const obs = new IntersectionObserver(
// 	entries => {
// 		entries.forEach(e => {
// 			if (e.intersectionRatio === 1) {
// 				const a = this.contentsLinksList.querySelector(`[href = "#${e.target.id}"]`);
// 				if (a instanceof HTMLAnchorElement) {
// 					this.activeScrollEl = a;
// 				}
// 			}
// 		});
// 	},
// 	{ threshold: 1 }
// );

// for (const li of this.sourceWithCardsList.querySelectorAll('li')) {
// 	obs.observe(li);
// }

declare global {
	interface HTMLElementTagNameMap {
		'p-verify': VerifyPage;
	}
}

export const ACTIVE_VIEW_VARIANTS = ['maps', 'acts', 'others', 'weights-table'] as const;
export type ActiveView = (typeof ACTIVE_VIEW_VARIANTS)[number];

function linkLabel(activeView: ActiveView) {
	switch (activeView) {
		case 'acts':
			return 'Acts';
		case 'maps':
			return 'Maps';
		case 'others':
			return 'Others';
		case 'weights-table':
			return 'Weights Table';
	}
}

const fmts = {
	'0': new Intl.NumberFormat('en', { maximumFractionDigits: 0 }),
	'2': new Intl.NumberFormat('en', { maximumFractionDigits: 2 }),
};
function formatWeight(weight: number, formatters: Record<0 | 2, Intl.NumberFormat> = fmts) {
	const maximumFractionDigits = weight > 5 ? 0 : 2;
	return formatters[maximumFractionDigits].format(weight);
}
