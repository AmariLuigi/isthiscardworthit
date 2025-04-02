/**
 * Service for fetching data from poe.ninja API
 */
import { fetchWeightsData } from './weights-parser';

export interface DivinationCard {
  id: number;
  name: string;
  baseType: string;
  icon: string;
  chaosValue: number;
  divineValue: number;
  listingCount: number;
  weight?: number;
  dropRate?: number;
  valuePerWeight?: number;
  stackSize: number;
  explicitModifiers?: {
    text: string;
    optional: boolean;
  }[];
  flavourText?: string;
}

export interface NinjaApiResponse {
  lines: DivinationCard[];
}

export interface CalculationResult {
  worthFarming: boolean;
  reason: string;
  comparisonToAverage: number;
  expectedValue: number;
  valuePerWeight: number;
  averageValuePerWeight: number;
}

interface CardWeight {
  name: string;
  weight: number;
  patch: string;
}

// Sample weights data (replace with full data later)
export const cardWeightsData: CardWeight[] = [
  { name: "Rain of Chaos", weight: 121400, patch: "3.25" },
  { name: "Mitts", weight: 5279, patch: "3.25" },
  { name: "Emperor's Luck", weight: 50643, patch: "3.25" },
  { name: "The Lover", weight: 62738, patch: "3.25" },
  { name: "Destined to Crumble", weight: 45583, patch: "3.25" },
  { name: "The King's Blade", weight: 42160, patch: "3.25" },
  { name: "The Scholar", weight: 46346, patch: "3.25" },
  { name: "Loyalty", weight: 34668, patch: "3.25" },
  { name: "The Metalsmith's Gift", weight: 34178, patch: "3.25" },
  { name: "The Carrion Crow", weight: 22356, patch: "3.25" },
  { name: "House of Mirrors", weight: 1, patch: "3.25" },
  { name: "The Apothecary", weight: 11, patch: "3.25" },
  { name: "The Doctor", weight: 16, patch: "3.25" },
  { name: "The Nurse", weight: 97, patch: "3.25" },
];

/**
 * Fetch divination card data from poe.ninja API
 * @param league League name to fetch data for
 * @returns Promise with divination card data
 */
export async function fetchDivinationCards(league = 'Phrecia'): Promise<DivinationCard[]> {
  try {
    console.log(`[API] Fetching divination card data from poe.ninja for league: ${league}`);
    
    // The most current API URL for poe.ninja, routed through our proxy to avoid CORS
    const apiUrl = `/poe-ninja-api/api/data/itemoverview?league=${encodeURIComponent(league)}&type=DivinationCard`;
    console.log(`[API] URL: ${apiUrl}`);
    
    console.log(`[API] Making fetch request...`);
    const response = await fetch(apiUrl);
    console.log(`[API] Response status: ${response.status} ${response.statusText}`);
    console.log(`[API] Response headers:`, Object.fromEntries([...response.headers.entries()]));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] Error (${response.status}): ${errorText}`);
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }
    
    console.log(`[API] Parsing JSON response...`);
    const data: NinjaApiResponse = await response.json();
    console.log(`[API] Successfully fetched ${data.lines?.length || 0} cards from poe.ninja`);
    
    // Add more detailed debugging information
    if (data.lines && data.lines.length > 0) {
      console.log(`[API] Sample card data from API (first 3):`, JSON.stringify(data.lines.slice(0, 3), null, 2));
      console.log(`[API] All card names from API:`, data.lines.map(card => card.name));
      
      // Check if any cards have missing or invalid pricing data
      const invalidPricingCards = data.lines.filter(card => 
        typeof card.chaosValue !== 'number' || 
        isNaN(card.chaosValue) || 
        typeof card.divineValue !== 'number' || 
        isNaN(card.divineValue)
      );
      
      if (invalidPricingCards.length > 0) {
        console.warn(`[API] Found ${invalidPricingCards.length} cards with invalid pricing data:`, 
          invalidPricingCards.map(c => c.name));
      } else {
        console.log(`[API] All cards have valid pricing data`);
      }
    }
    
    // Handle empty response gracefully
    if (!data.lines || data.lines.length === 0) {
      console.warn('[API] No card data found in the API response');
      return [];
    }
    
    return data.lines;
  } catch (error) {
    console.error('[API] Error fetching divination card data:', error);
    // Log the error type and properties
    if (error instanceof Error) {
      console.error('[API] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return [];
  }
}

/**
 * Combine API data with weight data
 * @param cards Cards from API
 * @param weights Weight data
 * @returns Combined card data
 */
export function combineCardData(
  cards: DivinationCard[],
  weights: CardWeight[]
): DivinationCard[] {
  // Create a map of card names to weights for faster lookup
  const weightMap = new Map<string, number>();
  weights.forEach((w) => weightMap.set(w.name.toLowerCase(), w.weight));

  // Calculate total weight for drop rate calculation
  const totalWeight = Array.from(weightMap.values()).reduce((sum, weight) => sum + weight, 0);

  return cards.map((card) => {
    const weight = weightMap.get(card.name.toLowerCase()) || 0;
    const dropRate = weight / totalWeight;
    const valuePerWeight = weight > 0 ? card.chaosValue / weight : 0;

    return {
      ...card,
      weight,
      dropRate,
      valuePerWeight,
    };
  });
}

/**
 * Calculate if a card is worth farming
 * @param card Divination card
 * @param allCards All cards for comparison
 * @returns Calculation result
 */
export function calculateCardWorth(card: DivinationCard, allCards: DivinationCard[]): CalculationResult {
  if (!card.weight || card.weight === 0) {
    return {
      worthFarming: false,
      expectedValue: 0,
      reason: "No drop weight data available for this card",
      comparisonToAverage: -100,
      valuePerWeight: 0,
      averageValuePerWeight: 0
    };
  }

  // Calculate the value per weight for all cards with weights
  const cardsWithWeight = allCards.filter(c => c.weight && c.weight > 0 && c.chaosValue && c.chaosValue > 0);
  
  if (cardsWithWeight.length === 0) {
    return {
      worthFarming: false,
      expectedValue: 0,
      reason: "Insufficient data to make a calculation",
      comparisonToAverage: 0,
      valuePerWeight: card.valuePerWeight || 0,
      averageValuePerWeight: 0
    };
  }
  
  // Check if this is a boss-restricted card
  // This is a simple check based on known boss-restricted cards
  // In a full implementation, this data would come from the API or a more comprehensive dataset
  const bossRestrictedCards = [
    "A Fate Worse Than Death", // Conquerors
    "The Cheater", // Uber Maven
    "The Fortunate", // The Feared
    "Hunter's Reward", // Hunter
    "The Strategist", // Elder
    "The Escape", // Maven
    "The Dragon's Heart", // Shaper
    "Rebirth and Renewal", // Maven
    "The Chosen", // Shaper
    "The Eye of Terror", // Elder
    "The World Eater" // Uber Elder
  ];
  
  // Check if this is a special area-restricted card
  // Cards that only drop in specific high-level content or special areas
  const areaRestrictedCards = [
    "House of Mirrors", // Alluring Abyss (Uber Atziri)
    "The Doctor", // Requires high tier map strategies to farm effectively
    "The Demon", // Uber Elder territory
    "The Fiend", // Uber Atziri
    "Seven Years Bad Luck", // Hall of Grandmasters
    "Unrequited Love", // Shaper Guardian Maps
    "The Immortal", // Uber Elder territory
    "The Damned", // Specific high-level corrupted areas
    "Pride of the First Ones", // Specific boss drops only
    "Wealth and Power" // Specific high-tier content
  ];
  
  const isBossRestricted = bossRestrictedCards.includes(card.name);
  const isAreaRestricted = areaRestrictedCards.includes(card.name);
  // Combined restriction flag
  const isRestricted = isBossRestricted || isAreaRestricted;
  
  // Calculate value per weight for the current card
  const valuePerWeight = card.chaosValue / card.weight;
  
  // Calculate the total weight of all cards
  const totalWeight = cardsWithWeight.reduce((sum, c) => sum + (c.weight || 0), 0);
  
  // Calculate drop rate (likelihood of dropping)
  const dropRate = card.weight / totalWeight;
  
  // Calculate expected value per attempt (chaos value × drop rate)
  // This represents how much chaos value you get on average per farming attempt
  const expectedValue = card.chaosValue * dropRate;

  // Calculate normalized farming efficiency - a balanced metric that considers both
  // value of the card and how frequently it drops
  // Using a logarithmic scale for chaos value to prevent ultra-expensive cards from dominating
  // We multiply by 1000 just to get more readable numbers
  const farmingEfficiency = Math.log10(Math.max(1, card.chaosValue)) * Math.sqrt(dropRate) * 1000;
  
  // Calculate the farming efficiency for all cards
  const allFarmingEfficiency = cardsWithWeight.map(c => {
    const cDropRate = (c.weight || 0) / totalWeight;
    return {
      name: c.name,
      chaosValue: c.chaosValue,
      weight: c.weight,
      efficiency: Math.log10(Math.max(1, c.chaosValue)) * Math.sqrt(cDropRate) * 1000
    };
  }).sort((a, b) => b.efficiency - a.efficiency);
  
  // Calculate average farming efficiency
  const avgFarmingEfficiency = allFarmingEfficiency.reduce((sum, c) => sum + c.efficiency, 0) / allFarmingEfficiency.length;
  
  // Find where this card ranks in farming efficiency
  const cardEfficiencyIndex = allFarmingEfficiency.findIndex(c => c.name === card.name);
  const percentileRank = cardEfficiencyIndex >= 0 ? (cardEfficiencyIndex / allFarmingEfficiency.length) * 100 : 100;
  
  // For reference, also calculate the average value-per-weight
  const totalValuePerWeight = cardsWithWeight.reduce((sum, c) => sum + (c.chaosValue / (c.weight || 1)), 0);
  const avgValuePerWeight = totalValuePerWeight / cardsWithWeight.length;
  
  // Calculate percentage comparison to average (how much better/worse than average)
  const comparisonToAverage = ((farmingEfficiency / avgFarmingEfficiency) - 1) * 100;

  // A card is worth farming if:
  // 1. It's NOT restricted (boss or area) AND in the top 40% of cards by farming efficiency, OR
  // 2. It has a high absolute value (25+ chaos) and is still relatively efficient
  // 3. Restricted cards are only worth farming if they're exceptionally valuable (100+ chaos)
  //    AND the user is specifically targeting that content
  const worthFarming = isRestricted 
    ? card.chaosValue >= 150 // Restricted cards need to be very valuable to be worth targeting
    : ((percentileRank <= 40 && card.chaosValue >= 1) || 
       (percentileRank <= 60 && card.chaosValue >= 25));

  let reason = '';
  if (worthFarming) {
    if (isAreaRestricted) {
      reason = `This card only drops in specific areas (${card.chaosValue.toFixed(1)} chaos value)`;
      if (card.name === "House of Mirrors") {
        reason += `. Only drops in Alluring Abyss (Uber Atziri) or from Stacked Decks`;
      } else if (card.name === "The Doctor") {
        reason += `. Requires specific high-tier map farming strategies`;
      }
      reason += `. Only farm if you're specifically targeting this content.`;
    } else if (isBossRestricted) {
      reason = `This card drops from specific bosses and has high value (${card.chaosValue.toFixed(1)} chaos)`;
      reason += `. Consider farming if you're already running these bosses for other reasons.`;
    } else if (percentileRank <= 20) {
      reason = `This card is among the top 20% most efficient to farm`;
    } else if (percentileRank <= 40) {
      reason = `This card is in the top 40% of farming efficiency`;
    } else {
      reason = `This card's high value (${card.chaosValue.toFixed(1)} chaos) makes it worth farming despite lower drop rate`;
    }
    
    if (!isRestricted) {
      if (card.chaosValue > 100) {
        reason += `. High value card (${card.chaosValue.toFixed(1)} chaos)`;
      } else if (card.weight > 1000) {
        reason += `. Drops relatively frequently (weight: ${card.weight})`;
      }
    }
    
    reason += '.';
  } else {
    const reasons = [];
    
    if (isAreaRestricted) {
      reasons.push(`Drops only in specific areas (${card.name === "House of Mirrors" ? "Alluring Abyss/Uber Atziri" : "special content"})`);
      reasons.push(`Not worth specifically targeting unless you're already running this content`);
    } else if (isBossRestricted) {
      reasons.push(`Drops only from specific bosses (${card.chaosValue.toFixed(1)} chaos value is not high enough to justify boss farming)`);
    } else if (percentileRank > 40) {
      reasons.push(`Only ranked in the top ${percentileRank.toFixed(0)}% for farming efficiency`);
    }
    
    if (card.chaosValue < 1) {
      reasons.push(`Low value (${card.chaosValue.toFixed(1)} chaos)`);
    }
    
    if (!isRestricted && card.weight < 100 && card.chaosValue < 50) {
      reasons.push(`Rare drop (weight: ${card.weight}) without enough value to justify farming`);
    }
    
    reason = reasons.join('. ') + '.';
  }

  return {
    worthFarming,
    expectedValue,
    reason,
    comparisonToAverage,
    valuePerWeight,
    averageValuePerWeight: avgValuePerWeight
  };
}

/**
 * Initialize card data on startup
 * This function can be called early to start the data fetching process
 * @param league The league to fetch data for
 * @returns A promise that resolves when the data is fetched
 */
export async function initializeCardData(league = 'Phrecia'): Promise<DivinationCard[]> {
  console.log('Preloading card data on application startup...');
  try {
    // Load the card data
    const cards = await fetchDivinationCards(league);
    // Load the weight data
    const weights = await fetchWeightsData();
    // Combine the data
    const combinedCards = combineCardData(cards, weights);
    console.log(`Preloaded ${combinedCards.length} cards with prices and weights`);
    return combinedCards;
  } catch (error) {
    console.error('Failed to preload card data:', error);
    return [];
  }
} 