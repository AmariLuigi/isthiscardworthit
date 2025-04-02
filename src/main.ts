import { render } from 'lit';
import { router } from './router';
import { startViewTransition } from './utils';
import { fetchDivinationCards, DivinationCard } from './services/poe-ninja-service';
import { fetchWeightsData } from './services/weights-parser';

const page_slot = document.querySelector<HTMLElement>('[slot="page"]')!;

// Extend the Window interface to include our custom property
declare global {
	interface Window {
		preloadedCardData?: DivinationCard[];
	}
}

// Define the structure of the weights data
interface WeightsData {
	[key: string]: number;
}

// Function to initialize the card value provider with preloaded data
function initializeCardValueProvider(cards: DivinationCard[]): void {
	if (!cards || cards.length === 0) {
		console.warn('No cards available to initialize the card value provider');
		return;
	}
	
	// Find the card value provider element
	const cardValueProvider = document.querySelector('card-value-provider');
	if (!cardValueProvider) {
		console.error('Card value provider element not found in the DOM');
		return;
	}
	
	// Set the cards property on the provider
	if ('cards' in cardValueProvider) {
		console.log(`Setting ${cards.length} preloaded cards on the card value provider`);
		(cardValueProvider as any).cards = cards;
		
		// Mark loading as complete
		if ('isLoading' in cardValueProvider) {
			(cardValueProvider as any).isLoading = false;
		}
		
		// Force an update
		if ('requestUpdate' in cardValueProvider && typeof (cardValueProvider as any).requestUpdate === 'function') {
			(cardValueProvider as any).requestUpdate();
			console.log('Card value provider update requested');
		}
	} else {
		console.error('Card value provider does not have a cards property');
	}
}

// Function to preload card data and make it available in the UI
function preloadCardDataForUI() {
	console.log('🃏 Starting card data initialization...');
	
	// Use Promise.all to fetch both weights and prices in parallel
	return Promise.all([
		fetchWeightsData(),
		fetchDivinationCards()
	])
		.then(([weights, cards]) => {
			// Combine data from both sources
			const cardsWithWeights = cards.map(card => {
				// @ts-ignore: We know weights is an object with string keys
				const weight = weights[card.name] || 0;
				return { ...card, weight };
			});
			
			// Get the card provider and initialize it with the preloaded data
			const cardValueProvider = document.querySelector('card-value-provider');
			if (cardValueProvider) {
				console.log(`Initializing card value provider with ${cardsWithWeights.length} preloaded cards`);
				// @ts-ignore: We know the provider has this method
				cardValueProvider.initializeFromPreloadedData(cardsWithWeights);
			} else {
				console.warn('Card value provider not found in the DOM yet');
				// Store the data in a global variable so it can be used later when the provider is mounted
				// @ts-ignore: Adding custom property to window
				window.preloadedCardData = cardsWithWeights;
			}
			
			console.log(`Successfully preloaded ${cardsWithWeights.length} cards with pricing data`);
			if (cardsWithWeights.length > 0) {
				console.log('Sample preloaded card:', cardsWithWeights[0]);
			} else {
				console.warn('⚠️ No cards were preloaded. This may indicate an API issue.');
			}
			
			return cardsWithWeights;
		})
		.catch(error => {
			console.error('❌ Error preloading card data:', error);
			
			if (error instanceof TypeError && error.message.includes('fetch')) {
				console.error('👉 This may be a CORS issue. Make sure the Vite server is running with the proxy configuration.');
				console.error('👉 Try restarting the development server with `pnpm dev`.');
			}
			
			// Rethrow so calling code can handle the error too
			throw error;
		});
}

// Wait for DOM to be fully loaded to ensure provider is available
window.addEventListener('DOMContentLoaded', () => {
	// Start loading card data immediately
	preloadCardDataForUI().catch(err => {
		console.error('Failed to preload card data in DOMContentLoaded event:', err);
	});
	
	// Check if we already have preloaded data
	// @ts-ignore: Accessing custom property on window
	if (window.preloadedCardData) {
		const cardValueProvider = document.querySelector('card-value-provider');
		if (cardValueProvider) {
			// @ts-ignore: Accessing custom property on window
			console.log(`DOMContentLoaded: Initializing card provider with ${window.preloadedCardData.length} preloaded cards`);
			// @ts-ignore: We know the provider has this method
			cardValueProvider.initializeFromPreloadedData(window.preloadedCardData);
			// Clear the global variable
			// @ts-ignore: Accessing custom property on window
			window.preloadedCardData = undefined;
		}
	}
});

router.addEventListener('route-changed', async () => {
	const transition = startViewTransition(() => render(router.render(), page_slot));
	if (transition && router.skip_transition) {
		transition.skipTransition();
		router.skip_transition = false;
	}
});
router.dispatchEvent(new Event('route-changed'));

// This will initialize the router after all other initialization is complete
export const initServiceWorker = () => {
	// Start service worker registration
};
