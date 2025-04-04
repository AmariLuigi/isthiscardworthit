/**
 * Card Value Context
 * Provides access to card data and farming value calculations throughout the application
 */
import { createContext, provide } from '@lit-labs/context';
import { LitElement, html } from 'lit';
import { property, state } from 'lit/decorators.js';
import { DivinationCard, fetchDivinationCards, combineCardData, calculateCardWorth, CalculationResult } from '../services/poe-ninja-service';
import { fetchWeightsData } from '../services/weights-parser';
import { poeData } from '../PoeData';

// Define custom event for card data updates
export class CardDataUpdatedEvent extends Event {
  constructor() {
    super('card-data-updated', { bubbles: true, composed: true });
  }
}

export const cardValueContext = createContext<CardValueProvider>('card-value-context');

export interface CardValueProvider {
  cards: DivinationCard[];
  cardsWithCalculations: Map<string, CalculationResult>;
  isLoading: boolean;
  error: string | null;
  selectedLeague: string;
  availableLeagues: string[];
  getCardByName(name: string): DivinationCard | undefined;
  getCalculationForCard(name: string): CalculationResult | undefined;
  setLeague(league: string): void;
  refreshData(): Promise<void>;
}

// Sample card data to use as fallback if API fails
const FALLBACK_CARDS = [
  {
    "id": 23238,
    "name": "Divine Justice",
    "icon": "https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvRGl2aW5hdGlvbi9JbnZlbnRvcnlJY29uIiwidyI6MSwiaCI6MSwic2NhbGUiOjF9XQ/f34bf8cbb5/InventoryIcon.png",
    "baseType": "Divine Justice",
    "chaosValue": 1351.75,
    "divineValue": 8.60,
    "listingCount": 7,
    "stackSize": 1
  },
  {
    "id": 636,
    "name": "House of Mirrors",
    "baseType": "House of Mirrors",
    "icon": "https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvRGl2aW5hdGlvbi9JbnZlbnRvcnlJY29uIiwidyI6MSwiaCI6MSwic2NhbGUiOjF9XQ/f34bf8cbb5/InventoryIcon.png",
    "chaosValue": 22539.61,
    "divineValue": 143.40,
    "listingCount": 69,
    "stackSize": 9
  },
  {
    "id": 120242,
    "name": "The Doctor",
    "baseType": "The Doctor",
    "icon": "https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvRGl2aW5hdGlvbi9JbnZlbnRvcnlJY29uIiwidyI6MSwiaCI6MSwic2NhbGUiOjF9XQ/f34bf8cbb5/InventoryIcon.png",
    "chaosValue": 9500.00,
    "divineValue": 60.51,
    "listingCount": 35,
    "stackSize": 8
  },
  {
    "id": 120243,
    "name": "The Nurse",
    "baseType": "The Nurse",
    "icon": "https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvRGl2aW5hdGlvbi9JbnZlbnRvcnlJY29uIiwidyI6MSwiaCI6MSwic2NhbGUiOjF9XQ/f34bf8cbb5/InventoryIcon.png",
    "chaosValue": 1187.50,
    "divineValue": 7.56,
    "listingCount": 48,
    "stackSize": 8
  },
  {
    "id": 120244,
    "name": "The Apothecary",
    "baseType": "The Apothecary",
    "icon": "https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvRGl2aW5hdGlvbi9JbnZlbnRvcnlJY29uIiwidyI6MSwiaCI6MSwic2NhbGUiOjF9XQ/f34bf8cbb5/InventoryIcon.png",
    "chaosValue": 12000.00,
    "divineValue": 76.43,
    "listingCount": 9,
    "stackSize": 5
  },
  {
    "id": 120245,
    "name": "The Cheater",
    "baseType": "The Cheater",
    "icon": "https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvRGl2aW5hdGlvbi9JbnZlbnRvcnlJY29uIiwidyI6MSwiaCI6MSwic2NhbGUiOjF9XQ/f34bf8cbb5/InventoryIcon.png",
    "chaosValue": 5250.00,
    "divineValue": 33.44,
    "listingCount": 2,
    "stackSize": 1
  },
  {
    "id": 120246,
    "name": "The Insane Cat",
    "baseType": "The Insane Cat",
    "icon": "https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvRGl2aW5hdGlvbi9JbnZlbnRvcnlJY29uIiwidyI6MSwiaCI6MSwic2NhbGUiOjF9XQ/f34bf8cbb5/InventoryIcon.png",
    "chaosValue": 3700.00,
    "divineValue": 23.57,
    "listingCount": 6,
    "stackSize": 1
  },
  {
    "id": 120247,
    "name": "Rain of Chaos",
    "baseType": "Rain of Chaos",
    "icon": "https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvRGl2aW5hdGlvbi9JbnZlbnRvcnlJY29uIiwidyI6MSwiaCI6MSwic2NhbGUiOjF9XQ/f34bf8cbb5/InventoryIcon.png",
    "chaosValue": 1.00,
    "divineValue": 0.01,
    "listingCount": 999,
    "stackSize": 1
  }
];

export class CardValueProviderElement extends LitElement implements CardValueProvider {
  // Provide this element instance as context for consumers
  @provide({ context: cardValueContext })
  @property({ attribute: false })
  public value = this;

  @property({ type: Array }) 
  cards: DivinationCard[] = [];

  @state()
  cardsWithCalculations = new Map<string, CalculationResult>();

  @state()
  isLoading = false;

  @state()
  error: string | null = null;

  @property({ type: String })
  selectedLeague = 'Phrecia'; // Current league as of this update

  @property({ type: Array })
  availableLeagues = ['Phrecia', 'Standard']; // Current leagues

  // Add a timeout ID to track API request timing
  private apiTimeoutId: number | null = null;

  firstUpdated() {
    // Only refresh data if we don't already have cards
    // This allows the main.ts to preload the cards and set them on the provider
    if (this.cards.length === 0) {
      // Start data loading process with a small delay to allow UI to render first
      setTimeout(() => {
        this.refreshData();
      }, 100);
    } else {
      console.log(`[PROVIDER] Using ${this.cards.length} preloaded cards instead of fetching new data`);
      // If we already have cards from preloading, calculate their farming worth
      this.processCardsWithWeights(this.cards);
    }
  }

  /**
   * This public method allows external code to initialize the calculations
   * from the preloaded data directly, without going through the full refreshData process
   */
  public initializeFromPreloadedData(cards: DivinationCard[]): void {
    if (!cards || cards.length === 0) {
      console.warn('[PROVIDER] No cards provided for initialization');
      return;
    }
    
    console.log(`[PROVIDER] Initializing from ${cards.length} preloaded cards`);
    this.cards = cards;
    this.processCardsWithWeights(cards);
    this.isLoading = false;
    this.requestUpdate();
    
    // Dispatch event to notify components that card data has been updated
    this.dispatchEvent(new CardDataUpdatedEvent());
    
    // Add a MutationObserver to check when cards are added to the DOM
    setTimeout(() => {
      document.querySelectorAll('.card-price-tag').forEach(el => {
        if (el.classList.contains('loading')) {
          el.classList.remove('loading');
        }
      });
    }, 1000);
  }

  /**
   * Refresh data from poe.ninja API
   */
  async refreshData(): Promise<void> {
    this.isLoading = true;
    this.error = null;
    
    // Trigger update to show loading state
    this.requestUpdate();

    // Set timeout to detect if the API request is stuck
    this.apiTimeoutId = window.setTimeout(() => {
      console.warn('[PROVIDER] API request timeout detected, using fallback data');
      if (this.isLoading && this.cards.length === 0) {
        // If we're still loading and have no cards after 10 seconds, use fallback data
        this.cards = FALLBACK_CARDS as DivinationCard[];
        this.processCardsWithWeights(this.cards);
        this.isLoading = false;
        this.requestUpdate();
        
        // Dispatch event to notify components
        this.dispatchEvent(new CardDataUpdatedEvent());
      }
    }, 10000); // 10 second timeout

    try {
      console.log('[PROVIDER] Starting to fetch card data...');
      
      // Start loading weights data first in parallel
      const weightsPromise = fetchWeightsData();
      
      // Get card data from poe.ninja API
      console.log(`[PROVIDER] Requesting cards for league: ${this.selectedLeague}`);
      let ninjaCards: DivinationCard[] = [];
      
      try {
        ninjaCards = await Promise.race([
          fetchDivinationCards(this.selectedLeague),
          // Add a timeout promise for the API request
          new Promise<DivinationCard[]>((_, reject) => 
            setTimeout(() => reject(new Error('API request timed out')), 15000)
          )
        ]);
      } catch (apiError) {
        console.error('[PROVIDER] API request failed or timed out:', apiError);
        console.warn('[PROVIDER] Using fallback data due to API failure');
        ninjaCards = FALLBACK_CARDS as DivinationCard[];
      }
      
      console.log(`[PROVIDER] Fetched ${ninjaCards.length} cards from poe.ninja API`);
      
      if (ninjaCards.length === 0) {
        console.warn('[PROVIDER] No cards returned from API - using fallback data');
        ninjaCards = FALLBACK_CARDS as DivinationCard[];
        console.log(`[PROVIDER] Using ${ninjaCards.length} fallback cards`);
      }
      
      // Immediately set the cards property with the data we have, even without weights
      // This allows the UI to start showing cards before weights are loaded
      this.cards = ninjaCards;
      this.requestUpdate();
      console.log('[PROVIDER] Updated UI with initial card data (without weights)');
      
      // Dispatch initial data event to update UI immediately with prices
      this.dispatchEvent(new CardDataUpdatedEvent());
      
      // Wait for weights data to finish loading
      const weights = await weightsPromise;
      console.log(`[PROVIDER] Fetched ${weights.length} card weights`);
      
      // Check which cards exist in poeData
      const poeDataCardNames = Object.keys(poeData.cards);
      console.log(`[PROVIDER] Cards in poeData: ${poeDataCardNames.length}`);
      
      // Compare API cards with poeData cards
      const apiCardNames = ninjaCards.map(c => c.name);
      const cardsInBoth = apiCardNames.filter(name => poeDataCardNames.includes(name));
      const cardsOnlyInApi = apiCardNames.filter(name => !poeDataCardNames.includes(name));
      const cardsOnlyInPoeData = poeDataCardNames.filter(name => !apiCardNames.includes(name));
      
      console.log(`[PROVIDER] Cards in both sources: ${cardsInBoth.length}`);
      console.log(`[PROVIDER] Cards only in API: ${cardsOnlyInApi.length}`);
      console.log(`[PROVIDER] Cards only in poeData: ${cardsOnlyInPoeData.length}`);
      
      // Combine price data with weight data
      console.log('[PROVIDER] Combining price data with weight data...');
      const combinedCards = combineCardData(ninjaCards, weights);
      console.log(`[PROVIDER] Combined data - final card count: ${combinedCards.length}`);
      
      // Now update with the combined data including weights
      this.cards = combinedCards;
      this.requestUpdate();
      
      // Process the cards with calculations
      this.processCardsWithWeights(combinedCards);
      
      // Clear the timeout since we've successfully loaded data
      if (this.apiTimeoutId) {
        clearTimeout(this.apiTimeoutId);
        this.apiTimeoutId = null;
      }
      
    } catch (error) {
      console.error('[PROVIDER] Failed to load card data:', error);
      this.error = error instanceof Error ? error.message : 'Unknown error fetching card data';
      
      // Use fallback data even when there's an error
      if (this.cards.length === 0) {
        console.log('[PROVIDER] Using fallback data due to error');
        this.cards = FALLBACK_CARDS as DivinationCard[];
        this.processCardsWithWeights(this.cards);
      }
      
      // Clear the timeout
      if (this.apiTimeoutId) {
        clearTimeout(this.apiTimeoutId);
        this.apiTimeoutId = null;
      }
      
      this.isLoading = false;
      this.requestUpdate();
      
      // Dispatch event to notify components even in error case
      this.dispatchEvent(new CardDataUpdatedEvent());
    }
  }
  
  /**
   * Process cards with weights and calculate farming worth
   * Extracted to a separate method to avoid code duplication
   */
  private processCardsWithWeights(cards: DivinationCard[]): void {
    // Log a few sample cards to verify data
    if (cards.length > 0) {
      console.log('[PROVIDER] Sample cards after combining with weights:', 
        cards.slice(0, 3).map(card => ({
          name: card.name,
          chaosValue: card.chaosValue,
          weight: card.weight,
          valuePerWeight: card.valuePerWeight
        }))
      );
      
      // Log the total number of cards with valid pricing
      const cardsWithPricing = cards.filter(card => 
        typeof card.chaosValue === 'number' && !isNaN(card.chaosValue)
      );
      console.log(`[PROVIDER] Cards with valid pricing: ${cardsWithPricing.length}/${cards.length}`);
    } else {
      console.error('[PROVIDER] No cards available to process');
      this.error = 'Failed to process card data';
      this.requestUpdate();
      return;
    }

    // Calculate farming worth for each card
    console.log('[PROVIDER] Calculating farming worth for cards...');
    const calculations = new Map<string, CalculationResult>();
    for (const card of cards) {
      const calculation = calculateCardWorth(card, cards);
      calculations.set(card.name, calculation);
    }
    this.cardsWithCalculations = calculations;
    console.log(`[PROVIDER] Calculated farming worth for ${calculations.size} cards`);
    
    // Dump some known card names for reference
    console.log('[PROVIDER] Common card names in our dataset:', 
      ['House of Mirrors', 'The Doctor', 'The Nurse', 'Rain of Chaos']
        .map(name => {
          const card = this.getCardByName(name);
          return card ? `${name}: ${card.chaosValue} chaos` : `${name}: not found`;
        })
    );
    
    // Data is ready, notify components
    this.isLoading = false;
    
    // Ensure the component triggers an update to refresh the UI
    this.requestUpdate();
    console.log('[PROVIDER] Data refresh complete, UI update requested');
    
    // Dispatch event to notify all components that data is ready
    this.dispatchEvent(new CardDataUpdatedEvent());
    
    // Force a refresh of loading indicators
    setTimeout(() => {
      document.querySelectorAll('.card-price-tag.loading').forEach(el => {
        el.classList.remove('loading');
      });
    }, 500);
  }

  /**
   * Get card by name
   * @param name Card name
   * @returns Card object or undefined if not found
   */
  getCardByName(name: string): DivinationCard | undefined {
    if (!name || !this.cards || this.cards.length === 0) {
      console.warn(`[LOOKUP] Card lookup failed: No cards loaded or empty name provided (name: "${name}", cards: ${this.cards?.length || 0})`);
      return undefined;
    }
    
    console.log(`[LOOKUP] Looking up card: "${name}" (total cards: ${this.cards.length})`);
    
    // Try exact match first
    let card = this.cards.find(card => card.name === name);
    if (card) {
      console.log(`[LOOKUP] Exact match found for "${name}"`);
      return card;
    }
    
    // Try with "The " prefix if it doesn't have one and it's not present
    if (!name.startsWith('The ')) {
      const nameWithThe = `The ${name}`;
      card = this.cards.find(card => card.name === nameWithThe);
      if (card) {
        console.log(`[LOOKUP] Match found with 'The' prefix: "${name}" -> "${card.name}"`);
        return card;
      }
    }
    
    // If no exact match, try case-insensitive match
    const lowerName = name.toLowerCase();
    card = this.cards.find(card => card.name.toLowerCase() === lowerName);
    if (card) {
      console.log(`[LOOKUP] Case-insensitive match found: "${name}" -> "${card.name}"`);
      return card;
    }
    
    // If still no match, try removing "The " prefix (common in PoE card naming)
    if (name.startsWith('The ')) {
      const nameWithoutThe = name.substring(4); // Remove "The "
      card = this.cards.find(card => card.name === nameWithoutThe || 
                                   card.name.toLowerCase() === nameWithoutThe.toLowerCase());
      if (card) {
        console.log(`[LOOKUP] "The" prefix match found: "${name}" -> "${card.name}"`);
        return card;
      }
    }
    
    // If still not found, try partial matching for close matches
    card = this.cards.find(card => 
      card.name.toLowerCase().includes(lowerName) || 
      lowerName.includes(card.name.toLowerCase())
    );
    if (card) {
      console.log(`[LOOKUP] Partial match found: "${name}" -> "${card.name}"`);
      return card;
    }
    
    // Try matching by ignoring apostrophes, quotes and special characters
    const normalizedName = name.toLowerCase().replace(/['",.()]/g, '');
    card = this.cards.find(card => {
      const normalizedCardName = card.name.toLowerCase().replace(/['",.()]/g, '');
      return normalizedCardName === normalizedName || 
             normalizedCardName.includes(normalizedName) || 
             normalizedName.includes(normalizedCardName);
    });
    if (card) {
      console.log(`[LOOKUP] Normalized match found: "${name}" -> "${card.name}"`);
      return card;
    }
    
    // If still not found, log for debugging
    console.warn(`[LOOKUP] Card not found: "${name}" (available cards: ${this.cards.length})`);
    
    // Log some available card names to help debug the issue
    if (this.cards.length > 0) {
      // Get first 10 card names alphabetically for reference
      const sampleCardNames = [...this.cards]
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 10)
        .map(c => c.name);
      console.log(`[LOOKUP] First 10 available cards (alphabetical): ${sampleCardNames.join(', ')}`);
      
      // Find names that are somewhat similar
      const similarCards = this.cards
        .filter(c => {
          const distance = this.levenshteinDistance(c.name.toLowerCase(), lowerName);
          return distance <= 3; // Show cards with edit distance of 3 or less
        })
        .map(c => c.name)
        .slice(0, 5);
      
      if (similarCards.length > 0) {
        console.log(`[LOOKUP] Similar card names: ${similarCards.join(', ')}`);
      }
    }
    
    return undefined;
  }
  
  /**
   * Calculate Levenshtein distance between two strings
   * Used to find similar card names for debugging
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    
    // Initialize matrix
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = a.charAt(j - 1) === b.charAt(i - 1) ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }
    
    return matrix[b.length][a.length];
  }

  /**
   * Get calculation result for card
   * @param name Card name
   * @returns Calculation result or undefined if not found
   */
  getCalculationForCard(name: string): CalculationResult | undefined {
    return this.cardsWithCalculations.get(name);
  }

  /**
   * Set league and refresh data
   * @param league League name
   */
  setLeague(league: string): void {
    if (this.selectedLeague !== league) {
      this.selectedLeague = league;
      this.refreshData();
    }
  }

  render() {
    return html`<slot></slot>`;
  }
}

customElements.define('card-value-provider', CardValueProviderElement); 