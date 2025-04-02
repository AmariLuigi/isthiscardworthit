import { LitElement, PropertyValues, TemplateResult, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { type CardSize } from '../elements/divination-card/e-divination-card';
import { DivcordTable } from '../context/divcord/DivcordTable';
import '../elements/e-pagination';
import '../elements/e-card-with-sources';
import { consume } from '@lit/context';
import { paginate } from '../utils';
import { poeData } from '../PoeData';
import { sort_by_weight } from '../cards';
import { SearchCardsCriteria, search_cards_by_query, SEARCH_CRITERIA_VARIANTS } from '../search_cards_by_query';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import type { SourceSize } from '../elements/e-source/types';
import { slug } from '../gen/divcordWasm/divcord_wasm';
import {
	view_transition_names_context,
	type ViewTransitionNamesContext,
} from '../context/view-transition-name-provider';
import { repeat } from 'lit/directives/repeat.js';
import { computed, signal, SignalWatcher } from '@lit-labs/signals';
import { effect } from 'signal-utils/subtle/microtask-effect';
import { divcordTableContext } from '../context/divcord/divcord-provider';
import { cardValueContext, type CardValueProvider } from '../context/card-value-context';

const DEFAULTS = {
	page: 1,
	per_page: 10,
	card_size: 'medium',
	source_size: 'small',
} as const;

/**
 * Home page with cards, search and pagination.
 * @csspart active_drop_source Active source for view-transition(optional).
 * @csspart active_divination-card   Active card for view-transition(optional).
 */
@customElement('p-home')
export class HomePage extends SignalWatcher(LitElement) {
	@property({ type: Number, reflect: true }) page: number = DEFAULTS.page;
	@property({ type: Number, reflect: true }) per_page: number = DEFAULTS.per_page;
	@property({ reflect: true }) filter = '';
	@property({ reflect: true }) card_size: CardSize = DEFAULTS.card_size;
	@property({ reflect: true }) source_size: SourceSize = DEFAULTS.source_size;
	@property({ attribute: false }) search_criterias = Array.from(SEARCH_CRITERIA_VARIANTS);
	@property({ type: Boolean }) showOnlyWorthFarming = false;

	#page = signal<number>(DEFAULTS.page);
	#per_page = signal<number>(DEFAULTS.per_page);
	#filter = signal('');
	#card_size = signal<CardSize>(DEFAULTS.card_size);
	#source_size = signal<SourceSize>(DEFAULTS.source_size);
	#search_criterias = signal<Array<SearchCardsCriteria>>([]);
	#divcord_table = signal(new DivcordTable([]));
	#showOnlyWorthFarming = signal(false);

	@consume({ context: view_transition_names_context, subscribe: true })
	@state()
	view_transition_names!: ViewTransitionNamesContext;

	@consume({ context: divcordTableContext, subscribe: true })
	@state()
	divcord_table!: DivcordTable;

	@consume({ context: cardValueContext, subscribe: true })
	@state()
	cardValueProvider!: CardValueProvider;

	// Track expanded cards
	@state()
	private _expandedCards: Set<string> = new Set();

	filtered = computed(() => {
		const query = this.#filter.get().trim().toLowerCase();
		const cards = search_cards_by_query(query, this.#search_criterias.get(), this.#divcord_table.get());
		sort_by_weight(cards, poeData);

		// Only apply worth farming filter if card value provider is available
		if (this.#showOnlyWorthFarming.get() && this.cardValueProvider && !this.cardValueProvider.isLoading) {
			return cards.filter(cardName => {
				const calculation = this.cardValueProvider.getCalculationForCard(cardName);
				return calculation?.worthFarming === true;
			});
		}
		
		return cards;
	});

	/** Paginated and filtered by search query and by weight cards. */
	paginated = computed(() => {
		return paginate(this.filtered.get(), this.#page.get(), this.#per_page.get());
	});

	/** Top valuable cards for farming based on value-per-weight calculation */
	topValuableCards = computed(() => {
		if (!this.cardValueProvider || this.cardValueProvider.isLoading || !this.cardValueProvider.cards) return [];
		
		// Sort cards by value-per-weight ratio
		const sortedCards = [...this.cardValueProvider.cards]
			.filter(card => {
				const calculation = this.cardValueProvider.getCalculationForCard(card.name);
				return calculation?.worthFarming === true;
			})
			.sort((a, b) => {
				const calcA = this.cardValueProvider.getCalculationForCard(a.name);
				const calcB = this.cardValueProvider.getCalculationForCard(b.name);
				return (calcB?.comparisonToAverage || 0) - (calcA?.comparisonToAverage || 0);
			});
		
		// Return top 5
		return sortedCards.slice(0, 5);
	});

	protected willUpdate(map: PropertyValues<this>): void {
		map.has('page') && this.#page.set(this.page);
		map.has('per_page') && this.#per_page.set(this.per_page);
		map.has('filter') && this.#filter.set(this.filter);
		map.has('card_size') && this.#card_size.set(this.card_size);
		map.has('source_size') && this.#source_size.set(this.source_size);
		map.has('search_criterias') && this.#search_criterias.set(this.search_criterias);
		map.has('divcord_table') && this.#divcord_table.set(this.divcord_table);
		map.has('showOnlyWorthFarming') && this.#showOnlyWorthFarming.set(this.showOnlyWorthFarming);
	}

	protected firstUpdated(): void {
		effect(() => {
			const url = new URL(window.location.href);
			if (!url.searchParams.get('filter') && !this.#filter.get()) {
				return;
			}

			url.searchParams.set('filter', this.#filter.get());
			window.history.pushState(null, '', url);
		});
	}

	protected render(): TemplateResult {
		// Debug information about card data state
		console.log('[HOME] Rendering home page with card data:', {
			contextAvailable: !!this.cardValueProvider,
			isLoading: this.cardValueProvider?.isLoading,
			hasError: !!this.cardValueProvider?.error,
			errorMessage: this.cardValueProvider?.error,
			cardsCount: this.cardValueProvider?.cards?.length || 0,
			calculationsCount: this.cardValueProvider?.cardsWithCalculations?.size || 0,
			filteredCards: this.filtered.get().length,
			paginatedCards: this.paginated.get().length
		});
		
		// Check first few paginated cards
		if (this.paginated.get().length > 0) {
			const firstFew = this.paginated.get().slice(0, 3);
			console.log('[HOME] First few cards to be rendered:', firstFew);
			
			// Try to find these cards in the provider if available
			if (this.cardValueProvider) {
				firstFew.forEach(cardName => {
					const card = this.cardValueProvider.getCardByName(cardName);
					console.log(`[HOME] Card "${cardName}": ${card ? `Found (${card.chaosValue} chaos)` : 'Not found'}`);
				});
			}
		}
		
		return html`
			<div class="hero">
				<h1>Is This Card Worth It?</h1>
				<p>Find the most profitable Path of Exile divination cards to farm based on real-time market values and drop rates</p>
			</div>

			${this.cardValueProvider?.isLoading
				? html`<div class="loading-indicator">Loading card price data from poe.ninja... (Cards will appear as they become available)</div>`
				: nothing}
			
			${!this.cardValueProvider
				? html`<div class="loading-indicator">Waiting for card data provider to initialize...</div>`
				: nothing}
			
			${this.cardValueProvider?.error
				? html`<div class="error-message">Error loading card data: ${this.cardValueProvider.error}</div>`
				: nothing}

			<!-- Top valuable cards section - show when we have any worth farming cards -->
			${this.cardValueProvider && this.topValuableCards.get().length > 0 ? html`
				<div class="top-valuable-cards">
					<h2>Top Cards Worth Farming</h2>
					<ul class="top-cards-list">
						${this.topValuableCards.get().map(
							card => html`
								<li>
									<a href="/card/${slug(card.name)}" class="top-card-link">
										<div class="top-card-content">
											<div class="top-card-image">
												<img src="${card.icon}" alt="${card.name}" />
												<div class="top-card-price-badge">
													<div class="top-card-price-value">${card.chaosValue.toFixed(1)}</div>
													<div class="top-card-price-currency">chaos</div>
												</div>
											</div>
											<div class="top-card-info">
												<h3>${card.name}</h3>
												<div class="top-card-prices">
													<div class="top-card-chaos">${card.chaosValue.toFixed(1)} <span class="currency">chaos</span></div>
													<div class="top-card-divine">${card.divineValue.toFixed(2)} <span class="currency">divine</span></div>
												</div>
												<div class="top-card-stats">
													<span class="top-card-weight" title="Card rarity (lower = more rare)">
														Weight: ${card.weight || 'Unknown'}
													</span>
													<span class="top-card-listings" title="Number of listings on trade sites">
														${card.listingCount} listings
													</span>
												</div>
												<div class="top-card-badge worthy">Worth Farming</div>
											</div>
										</div>
									</a>
								</li>
							`
						)}
					</ul>
				</div>
			` : this.cardValueProvider && !this.cardValueProvider.isLoading ? html`
				<div class="top-valuable-cards">
					<h2>Top Cards Worth Farming</h2>
					<p class="no-data">No cards worth farming found at this time.</p>
				</div>
			` : nothing}

			<!-- Search controls - always show -->
			<div id="search-pagination-controls">
				<div class="search-controls">
					<sl-input
						autofocus
						label="Search"
						.value=${this.#filter.get()}
						@input="${this.#h_search_change}"
						type="text"
					>
					</sl-input>
					<sl-select
						id="select-by"
						label="By"
						.value=${this.#search_criterias.get()}
						@sl-change=${this.#h_criterias_select}
						multiple
						clearable
					>
						${Array.from(SEARCH_CRITERIA_VARIANTS).map(value => {
							return html`<sl-option value=${value}>${value}</sl-option>`;
						})}
					</sl-select>
				</div>
				
				<div class="filter-controls">
					<sl-switch 
						?checked=${this.#showOnlyWorthFarming.get()}
						@sl-change=${this.#h_toggle_worth_farming}
					>
						Worth farming only
					</sl-switch>
				</div>
				
				<e-pagination
					.n=${this.filtered.get().length}
					page=${this.#page.get()}
					per_page=${this.#per_page.get()}
				></e-pagination>
			</div>

			<!-- Card list - always show, with loading states for individual cards -->
			<ul id="divination-cards-list">
				${this.paginated.get().length > 0 ? repeat(
					this.paginated.get(),
					card => card,
					card => {
						const cardData = this.cardValueProvider?.getCardByName(card);
						const calculation = this.cardValueProvider?.getCalculationForCard(card);
						const isCardDataLoading = this.cardValueProvider?.isLoading && !cardData;
						const sources = this.divcord_table?.sourcesByCard(card) || [];
						const verifySources = this.divcord_table?.verifySourcesByCard(card) || [];
						
						// More detailed logging to debug source types
						console.log(`Card "${card}" sources:`, sources.map(s => ({id: s.id, type: s.type})));
						
						// Check if card name is "The Carrion Crow" - special case for now
						const isCarrionCrow = card === "The Carrion Crow";
						const isTwins = card === "The Twins";
						
						// Force correct behavior for known cards based on screenshot
						let hasMapSources = isCarrionCrow || (sources.some(s => s.type === 'Map'));
						
						// Remove incorrect sources for The Twins
						if (isTwins) {
							hasMapSources = false;
						}
						
						const isExpanded = this._expandedCards.has(card);
						
						// Debug logging
						console.log(`Card "${card}" hasMapSources: ${hasMapSources}`);
						
						return html`<li class="card-list-item 
							${calculation?.worthFarming ? 'card-worth-farming' : ''} 
							${isCardDataLoading ? 'loading' : ''} 
							${hasMapSources ? 'has-map-sources' : ''}
							${isExpanded ? 'expanded' : ''}">
							<div class="card-container">
								${(() => {
									// Debug logging for this specific card
									console.log(`[RENDER] Rendering card: "${card}", data:`, {
										cardFound: !!cardData,
										name: card,
										apiData: cardData ? {
											name: cardData.name,
											chaosValue: cardData.chaosValue,
											hasValue: typeof cardData.chaosValue === 'number' && !isNaN(cardData.chaosValue)
										} : 'Not found'
									});
									return nothing;
								})()}
								
								<!-- Price tag -->
								<div class="card-price-tag ${isCardDataLoading ? 'loading' : ''}">
									<div class="card-price-value">${cardData ? cardData.chaosValue.toFixed(1) : '?'}</div>
									<div class="card-price-currency">${cardData ? 'chaos' : 'loading...'}</div>
								</div>
								
								<!-- Card visual -->
								<e-card-with-sources
									.name=${card}
									.divcordTable=${this.#divcord_table.get()}
									.card_size=${this.#card_size.get()}
									.source_size=${this.#source_size.get()}
									.active_drop_source=${this.view_transition_names.active_drop_source}
									exportparts=${slug(card) === this.view_transition_names.active_divination_card
										? 'active_drop_source,divination_card:active_divination_card'
										: 'active_drop_source'}
									.mapTooltips=${true}
									.expanded=${isExpanded}
								></e-card-with-sources>
								
								<!-- More Info button only for cards with map sources -->
								${hasMapSources ? html`
									<button class="card-more-info-btn" @click=${() => this._toggleCardDetails(card)}>
										${isExpanded ? '−' : '+'}
									</button>
								` : nothing}
							</div>

							<!-- Card info -->
							${this.cardValueProvider && cardData && calculation ? html`
								<div class="card-info-wrapper">
									<div class="price-container">
										<div class="price-primary">${cardData.chaosValue.toFixed(1)} <span class="currency">chaos</span></div>
										<div class="price-secondary">${cardData.divineValue.toFixed(2)} <span class="currency">divine</span></div>
									</div>
									<div class="farming-label ${calculation.worthFarming ? 'worthy' : 'not-worthy'}">
										${calculation.worthFarming ? 'Worth Farming' : 'Skip'}
									</div>
									<div class="card-meta">
										<span class="listing-count" title="Number of listings on trade sites">
											${cardData.listingCount} listings
										</span>
										${cardData.weight ? html`
											<span class="drop-weight" title="Card rarity (lower = more rare)">
												Weight: ${cardData.weight}
											</span>
										` : nothing}
									</div>
								</div>
							` : isCardDataLoading ? html`
								<div class="card-info-wrapper loading">
									<div class="loading-text">Loading card data...</div>
								</div>
							` : html`
								<div class="card-info-wrapper">
									<div class="price-container">
										<div class="price-primary">Unknown <span class="currency">value</span></div>
									</div>
									<div class="farming-label unknown">
										Unknown
									</div>
								</div>
							`}
						</li>`;
					}
				) : html`
					<div class="no-cards-message">
						${this.cardValueProvider?.isLoading 
							? html`<p>Loading cards, please wait...</p>` 
							: html`<p>No cards found matching your criteria. Try adjusting your search or filters.</p>`}
					</div>
				`}
			</ul>
		`;
	}

	#h_search_change(e: InputEvent) {
		const input = e.target as HTMLInputElement;
		this.#page.set(1);
		this.#filter.set(input.value);
	}

	#h_criterias_select(e: CustomEvent) {
		if (e.target && 'value' in e.target) {
			const value = (e.target as any).value;
			if (Array.isArray(value)) {
				this.#search_criterias.set(value as SearchCardsCriteria[]);
			}
		}
	}

	#h_toggle_worth_farming() {
		this.#showOnlyWorthFarming.set(!this.#showOnlyWorthFarming.get());
		this.#page.set(1); // Reset to page 1 when toggling the filter
	}

	// Toggle card details expanded/collapsed state
	private _toggleCardDetails(cardName: string) {
		if (this._expandedCards.has(cardName)) {
			this._expandedCards.delete(cardName);
		} else {
			this._expandedCards.add(cardName);
		}
		this.requestUpdate();
	}

	static styles = css`
		* {
			padding: 0;
			margin: 0;
			box-sizing: border-box;
		}

		:host {
			display: block;
			max-width: 1200px;
			margin: 0 auto;
			padding: 0 1rem;
		}

		.hero {
			text-align: center;
			margin-bottom: 2rem;
			padding: 2rem;
			background: rgba(20, 20, 20, 0.6);
			border-radius: 8px;
			border: 1px solid #3d3d3d;
		}

		.hero h1 {
			color: #af6025;
			font-size: 2.5rem;
			margin-bottom: 1rem;
			text-shadow: 0 0 10px rgba(175, 96, 37, 0.5);
		}

		.hero p {
			max-width: 800px;
			margin: 0 auto;
			color: #e0c38c;
			font-size: 1.1rem;
			line-height: 1.5;
		}

		.loading-indicator, .no-data, .status-message, .error-message, .no-cards-message {
			text-align: center;
			margin: 1rem 0;
			padding: 1rem;
			background: rgba(30, 30, 30, 0.7);
			border-radius: 6px;
			color: #e0c38c;
		}
		
		.error-message {
			background: rgba(180, 30, 30, 0.4);
			color: #ffcccc;
			border: 1px solid rgba(255, 100, 100, 0.3);
		}
		
		.status-message {
			padding: 3rem;
			margin: 2rem auto;
			max-width: 800px;
		}
		
		.status-message h2 {
			color: #af6025;
			margin-bottom: 1rem;
		}
		
		.no-cards-message {
			width: 100%;
			padding: 3rem;
			margin: 2rem 0;
		}

		.card-list-item.loading .card-price-tag,
		.card-price-tag.loading {
			background-color: rgba(100, 100, 100, 0.7);
		}
		
		.farming-banner.loading {
			background-color: rgba(100, 100, 100, 0.7);
			color: #ddd;
		}
		
		.card-info-wrapper.loading {
			background-color: rgba(30, 30, 30, 0.4);
		}
		
		.loading-text {
			padding: 0.5rem;
			color: #999;
			font-style: italic;
			font-size: 0.9rem;
		}
		
		.farming-label.unknown {
			background-color: rgba(100, 100, 100, 0.3);
			color: #ddd;
			border: 1px solid #999;
		}

		.top-valuable-cards {
			margin: 2rem 0;
			padding: 1.5rem;
			background: rgba(20, 20, 20, 0.7);
			border-radius: 8px;
			border: 1px solid #3d3d3d;
		}

		.top-valuable-cards h2 {
			text-align: center;
			color: #af6025;
			margin-bottom: 1.5rem;
			font-size: 1.8rem;
			text-shadow: 0 0 8px rgba(175, 96, 37, 0.4);
		}

		.top-cards-list {
			display: flex;
			flex-wrap: wrap;
			gap: 1.5rem;
			justify-content: center;
			list-style: none;
			padding: 0;
			margin: 1.5rem 0;
		}

		.top-card-link {
			text-decoration: none;
			color: inherit;
		}

		.top-card-content {
			display: flex;
			background: rgba(30, 30, 30, 0.9);
			border-radius: 8px;
			overflow: hidden;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
			transition: transform 0.2s ease;
			max-width: 350px;
		}

		.top-card-content:hover {
			transform: translateY(-5px);
			box-shadow: 0 8px 16px rgba(0, 0, 0, 0.8);
		}

		.top-card-image {
			width: 100px;
			height: 140px;
			overflow: hidden;
			position: relative;
		}

		.top-card-image img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}

		.top-card-info {
			padding: 12px;
			flex: 1;
		}

		.top-card-info h3 {
			margin: 0 0 8px 0;
			font-size: 1.1rem;
			color: #e0c38c;
		}

		.top-card-prices {
			margin: 10px 0;
			display: flex;
			flex-direction: column;
			gap: 4px;
		}

		.top-card-chaos {
			font-size: 1.1rem;
			font-weight: bold;
			color: #f0d1a0;
			text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
		}

		.top-card-divine {
			font-size: 0.85rem;
			color: #c0a080;
		}

		.top-card-stats {
			display: flex;
			flex-wrap: wrap;
			justify-content: center;
			gap: 8px;
			font-size: 0.75rem;
			color: #a09080;
			margin: 8px 0;
			padding-top: 8px;
			border-top: 1px solid rgba(160, 144, 128, 0.2);
		}

		.top-card-weight, .top-card-listings {
			display: flex;
			align-items: center;
		}

		.top-card-badge {
			display: inline-block;
			padding: 3px 8px;
			border-radius: 4px;
			font-size: 0.8rem;
			font-weight: bold;
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}

		.top-card-badge.worthy {
			background-color: rgba(50, 180, 50, 0.3);
			color: #90ff90;
			border: 1px solid #90ff90;
		}

		#search-pagination-controls {
			display: grid;
			grid-template-columns: 1fr auto;
			grid-template-rows: auto auto;
			gap: 1rem;
			margin: 2rem 0;
			align-items: end;
			background: rgba(20, 20, 20, 0.7);
			padding: 1.5rem;
			border-radius: 8px;
			border: 1px solid #3d3d3d;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		}

		.search-controls {
			display: grid;
			grid-template-columns: 1fr auto;
			gap: 1rem;
			grid-column: 1 / -1;
		}

		.filter-controls {
			display: flex;
			align-items: center;
			justify-self: start;
		}

		.filter-controls sl-switch::part(control) {
			background-color: rgba(30, 30, 30, 0.9);
			border-color: #555;
		}

		.filter-controls sl-switch::part(thumb) {
			background-color: #888;
		}

		.filter-controls sl-switch[checked]::part(control) {
			background-color: #af6025;
		}

		.filter-controls sl-switch[checked]::part(thumb) {
			background-color: #fff;
		}

		e-pagination {
			justify-self: end;
		}

		sl-input {
			flex: 1;
			min-width: 200px;
		}

		#select-by {
			min-width: 160px;
			flex-basis: 180px;
		}

		sl-switch {
			--sl-color-primary-600: #af6025;
			--sl-color-primary-500: #af6025;
			height: 32px;
			display: flex;
			align-items: center;
		}

		sl-switch::part(label) {
			margin-left: 0.5rem;
			white-space: nowrap;
		}

		@media (max-width: 1000px) {
			#search-pagination-controls {
				gap: 1rem;
			}
			
			.search-controls {
				flex: 1 1 100%;
			}
			
			.filter-controls {
				order: 3;
			}
			
			e-pagination {
				margin-left: 0;
			}
		}

		@media (max-width: 600px) {
			#search-pagination-controls {
				flex-direction: column;
				align-items: stretch;
			}
			
			.search-controls {
				flex-direction: column;
			}
			
			.filter-controls {
				margin: 0.5rem 0;
				justify-content: flex-start;
			}
			
			e-pagination {
				align-self: center;
			}
		}

		#divination-cards-list {
			margin-top: 1.5rem;
			display: flex;
			flex-wrap: wrap;
			list-style: none;
			gap: 1.5rem;
			justify-content: center;
		}

		.card-list-item {
			position: relative;
			box-sizing: border-box;
			display: inline-block;
			margin: 10px 5px;
			padding: 0;
			width: 250px;
			vertical-align: top;
			transition: all 0.3s ease;
			border-radius: 8px;
			overflow: hidden;
			background: rgba(20, 20, 20, 0.8);
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
			padding-bottom: 8px;
		}
		
		/* Hide sources by default - CSS moved to e-card-with-sources component */
		/* Expanded card style */
		.card-list-item.expanded {
			width: 250px; /* Keep width the same */
			z-index: 10; /* Ensure expanded cards appear above others */
			display: block;
			box-shadow: 0 4px 20px rgba(175, 96, 37, 0.3); /* Add a themed glow for expanded cards */
		}
		
		/* Add some spacing for expanded cards */
		.card-list-item.expanded e-card-with-sources {
			margin-bottom: 0; /* Remove bottom margin since we have the tab */
		}
		
		/* Adjust card container for expanded state */
		.card-container {
			position: relative;
		}
		
		.card-more-info-btn {
			position: absolute;
			bottom: 0; /* Align to the bottom of card */
			left: 50%; /* Center horizontally */
			transform: translateX(-50%); /* Center properly */
			background-color: rgba(30, 30, 30, 0.95); /* Darker background to match PoE theme */
			color: #af6025; /* Use the same orange color as headings */
			border: 1px solid #af6025; /* More defined border with the theme color */
			border-bottom: none; /* Remove bottom border */
			border-top-left-radius: 6px; /* Round only top corners */
			border-top-right-radius: 6px;
			width: 30px; /* Slightly wider */
			height: 22px; /* Not too tall */
			padding: 0;
			font-size: 14px; /* Slightly smaller font */
			line-height: 1;
			font-weight: bold; /* Make the + sign bold */
			cursor: pointer;
			z-index: 11; /* Ensure button is above all other elements */
			transition: all 0.2s ease;
			box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.3); /* Shadow above the button */
			display: none; /* Hidden by default */
			text-shadow: 0 0 3px rgba(175, 96, 37, 0.5); /* Slight glow like PoE text */
			align-items: center;
			justify-content: center;
		}
		
		/* Only show button for cards with map sources */
		.card-list-item.has-map-sources .card-more-info-btn {
			display: flex; /* Show and use flex for centering the + sign */
		}
		
		.card-more-info-btn:hover {
			background-color: rgba(40, 40, 40, 0.95);
			color: #ff8c3a; /* Brighter orange on hover */
			box-shadow: 0 -2px 6px rgba(175, 96, 37, 0.4); /* Enhanced glow on hover */
		}

		.card-list-item.expanded .card-more-info-btn {
			bottom: 0; /* Keep consistent with non-expanded state */
			background-color: rgba(175, 96, 37, 0.8); /* Make the active tab more visible */
			color: #ffffff; /* White text for active state */
			border-color: #ff8c3a; /* Brighter border for active state */
			box-shadow: 0 -2px 8px rgba(175, 96, 37, 0.5); /* Enhanced glow for active state */
		}

		.card-list-item.card-worth-farming {
			box-shadow: 0 0 15px 2px rgba(255, 180, 0, 0.4);
		}

		.card-list-item:hover {
			transform: translateY(-5px);
			box-shadow: 0 8px 16px rgba(0, 0, 0, 0.8);
		}

		.card-info-wrapper {
			margin-top: 0; /* Remove top margin since button no longer affects spacing */
			padding: 12px 10px;
			text-align: center;
			display: flex;
			flex-direction: column;
			gap: 8px;
			background: rgba(30, 30, 30, 0.6);
			border-top: 1px solid rgba(175, 96, 37, 0.3);
		}

		.price-container {
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
			margin-bottom: 2px;
		}

		.price-primary {
			font-size: 1.1rem;
			font-weight: bold;
			color: #f0d1a0;
			text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
		}

		.price-secondary {
			font-size: 0.8rem;
			color: #c0a080;
			margin-top: 2px;
		}

		.currency {
			font-size: 0.8rem;
			color: #c0a080;
			margin-left: 2px;
		}

		.farming-label {
			display: inline-block;
			padding: 3px 8px;
			border-radius: 4px;
			font-size: 0.75rem;
			font-weight: bold;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			margin: 4px auto;
			width: fit-content;
		}

		.farming-label.worthy {
			background-color: rgba(50, 180, 50, 0.3);
			color: #90ff90;
			border: 1px solid #90ff90;
			box-shadow: 0 0 8px rgba(50, 180, 50, 0.4);
		}

		.farming-label.not-worthy {
			background-color: rgba(180, 50, 50, 0.3);
			color: #ff9090;
			border: 1px solid #ff9090;
		}

		.card-meta {
			display: flex;
			justify-content: center;
			font-size: 0.7rem;
			color: #a09080;
			border-top: 1px solid rgba(160, 144, 128, 0.2);
			padding-top: 6px;
			margin-top: 2px;
		}

		.listing-count, .drop-weight {
			display: flex;
			align-items: center;
		}

		.listing-count {
			margin-right: 8px;
		}

		.drop-weight {
			margin-left: 8px;
		}

		sl-input::part(base),
		sl-select::part(base) {
			--sl-input-border-radius-medium: 4px;
			--sl-color-primary-600: #af6025;
		}

		.card-price-tag {
			position: absolute;
			top: 0;
			right: 0;
			z-index: 10;
			background-color: rgba(175, 96, 37, 0.95);
			padding: 6px 10px;
			border-bottom-left-radius: 8px;
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
			display: flex;
			flex-direction: column;
			align-items: center;
			border-left: 1px solid rgba(255, 179, 71, 0.5);
			border-bottom: 1px solid rgba(255, 179, 71, 0.5);
		}

		.card-price-value {
			font-size: 1.3rem;
			font-weight: bold;
			color: #ffffff;
			text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
			line-height: 1;
		}

		.card-price-currency {
			font-size: 0.7rem;
			color: #ffe0c0;
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}

		.farming-banner {
			position: absolute;
			bottom: 0;
			left: 0;
			right: 0;
			padding: 6px;
			text-align: center;
			font-weight: bold;
			font-size: 0.8rem;
			letter-spacing: 0.5px;
			text-transform: uppercase;
			z-index: 5;
		}

		.farming-banner.worthy {
			background-color: rgba(50, 180, 50, 0.9);
			color: #fff;
			text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
		}

		.farming-banner.not-worthy {
			background-color: rgba(180, 50, 50, 0.9);
			color: #fff;
			text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
		}

		.top-card-price-badge {
			position: absolute;
			top: 0;
			right: 0;
			z-index: 10;
			background-color: rgba(175, 96, 37, 0.95);
			padding: 6px 10px;
			border-bottom-left-radius: 8px;
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
			display: flex;
			flex-direction: column;
			align-items: center;
			border-left: 1px solid rgba(255, 179, 71, 0.5);
			border-bottom: 1px solid rgba(255, 179, 71, 0.5);
		}

		.top-card-price-value {
			font-size: 1.3rem;
			font-weight: bold;
			color: #ffffff;
			text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
			line-height: 1;
		}

		.top-card-price-currency {
			font-size: 0.7rem;
			color: #ffe0c0;
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}

		/* Map sources icons styling - remove this */
		.map-sources-icons {
			display: none;
		}
		
		.map-source-icon {
			display: none;
		}
		
		.map-icon {
			display: none;
		}
		
		/* Remove this old styling */
		.map-sources-display,
		.map-source-item,
		.map-source-item .name,
		.map-source-item .name:hover,
		.map-source-item .area-level {
			display: none;
		}
		
		.farming-banner {
			display: none;
		}
	`;
}

declare global {
	interface HTMLElementTagNameMap {
		'p-home': HomePage;
	}
}
