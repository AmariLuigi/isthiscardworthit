/**
 * Divination card weights parser
 * Used to parse the CSV data containing card drop weights
 */

import { cardWeightsData } from './poe-ninja-service';

export interface CardWeight {
  name: string;
  weight: number;
  patch: string;
}

/**
 * Parse CSV data containing card weights
 * @param csvText Raw CSV text
 * @returns Array of card weights
 */
export function parseWeightsCsv(csvText: string): CardWeight[] {
  const lines = csvText.split('\n');
  if (lines.length < 2) {
    console.error('CSV data is too short');
    return [];
  }

  // Get headers (patch versions)
  const headers = lines[0].split(',');
  
  // Find the latest patch index
  const latestPatchIndex = headers.reduce((maxIndex, header, index) => {
    if (header.startsWith('3.') && index > maxIndex) {
      return index;
    }
    return maxIndex;
  }, 1); // Start at 1 to skip the "patch" column

  const weights: CardWeight[] = [];

  // Skip the first line (headers) and process each row
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = line.split(',');
    const name = columns[0];
    
    // Parse weight from the latest patch column
    const weightStr = columns[latestPatchIndex];
    if (!weightStr) continue;
    
    const weight = parseInt(weightStr, 10);
    if (isNaN(weight)) continue;

    weights.push({
      name,
      weight,
      patch: headers[latestPatchIndex]
    });
  }

  return weights;
}

/**
 * Fetch weights data from CSV file
 * @returns Promise with card weights
 */
export async function fetchWeightsData(): Promise<CardWeight[]> {
  try {
    console.log('[WEIGHTS] Attempting to fetch weights CSV file...');
    // First try to fetch the CSV file
    const response = await fetch('/Stacked Decks - Weights.csv');
    
    if (response.ok) {
      const csvText = await response.text();
      console.log(`[WEIGHTS] Successfully loaded CSV (${csvText.length} bytes)`);
      console.log(`[WEIGHTS] First 100 characters of CSV: "${csvText.substring(0, 100)}..."`);
      
      const parsedWeights = parseWeightsCsv(csvText);
      console.log(`[WEIGHTS] Parsed ${parsedWeights.length} card weights from CSV`);
      
      // Log some sample weights
      if (parsedWeights.length > 0) {
        const sampleWeights = parsedWeights.slice(0, 5);
        console.log('[WEIGHTS] Sample weights:', sampleWeights);
        
        // Check for some important cards
        const importantCards = ['House of Mirrors', 'The Doctor', 'The Nurse', 'Rain of Chaos'];
        for (const cardName of importantCards) {
          const weight = parsedWeights.find(w => w.name === cardName);
          console.log(`[WEIGHTS] ${cardName}: ${weight ? weight.weight : 'not found'}`);
        }
      }
      
      return parsedWeights;
    } else {
      console.warn(`[WEIGHTS] Could not fetch weights CSV (status: ${response.status}), using built-in fallback data`);
      console.log('[WEIGHTS] Using fallback weight data instead:', cardWeightsData.length, 'cards');
      return cardWeightsData;
    }
  } catch (error) {
    console.error('[WEIGHTS] Error fetching weights data:', error);
    console.log('[WEIGHTS] Using fallback weight data instead:', cardWeightsData.length, 'cards');
    return cardWeightsData;
  }
}

/**
 * Get total weight of all cards
 * @param weights Array of card weights
 * @returns Total weight
 */
export function getTotalWeight(weights: CardWeight[]): number {
  return weights.reduce((sum, card) => sum + card.weight, 0);
} 