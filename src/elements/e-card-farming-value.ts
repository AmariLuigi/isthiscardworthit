import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { cardValueContext } from '../context/card-value-context';
import type { CardValueProvider } from '../context/card-value-context';
import type { DivinationCard, CalculationResult } from '../services/poe-ninja-service';

@customElement('e-card-farming-value')
export class CardFarmingValueElement extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: 'Fontin', serif;
      color: #c8c8c8;
    }

    .card-value-container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: 4px;
      background-color: rgba(24, 26, 27, 0.6);
      border: 1px solid #3d4143;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .title {
      color: #af6025;
      font-size: 1.1rem;
      margin-bottom: 0.35rem;
      text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.7);
    }

    .status-badge {
      display: inline-block;
      padding: 0.2rem 0.4rem;
      border-radius: 3px;
      font-weight: bold;
      font-size: 0.75rem;
      text-transform: uppercase;
      margin-top: 0.25rem;
    }

    .worthy {
      background-color: rgba(39, 174, 96, 0.2);
      color: #2ecc71;
      border: 1px solid #27ae60;
    }

    .not-worthy {
      background-color: rgba(231, 76, 60, 0.2);
      color: #e74c3c;
      border: 1px solid #c0392b;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.4rem 0.75rem;
      margin-top: 0.5rem;
    }

    .stat-row {
      display: flex;
      justify-content: space-between;
      padding: 0.25rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 0.9rem;
    }

    .stat-label {
      color: #af6025;
      font-weight: bold;
      margin-right: 0.5rem;
    }

    .stat-value {
      color: #e5e5e5;
      text-align: right;
    }

    .positive-value {
      color: #2ecc71;
    }

    .negative-value {
      color: #e74c3c;
    }

    .neutral-value {
      color: #f39c12;
    }

    .reason {
      padding: 0.5rem;
      background-color: rgba(0, 0, 0, 0.2);
      border-radius: 3px;
      font-style: italic;
      color: #aaa;
      line-height: 1.3;
      margin-top: 0.35rem;
      font-size: 0.85rem;
    }

    .error-message {
      color: #e74c3c;
      font-style: italic;
      font-size: 0.9rem;
    }

    .loading {
      color: #f39c12;
      font-style: italic;
      font-size: 0.9rem;
    }

    .price-trend {
      display: flex;
      align-items: center;
      margin-top: 0.35rem;
      font-size: 0.85rem;
    }

    .price-trend-icon {
      margin-right: 0.25rem;
    }

    .trend-up {
      color: #2ecc71;
    }

    .trend-down {
      color: #e74c3c;
    }

    .trend-stable {
      color: #f39c12;
    }
  `;

  @consume({ context: cardValueContext, subscribe: true })
  @property({ attribute: false })
  provider!: CardValueProvider;

  @property({ type: String })
  cardName = '';

  private _getCard(): DivinationCard | undefined {
    if (!this.provider || !this.cardName) return undefined;
    return this.provider.getCardByName(this.cardName);
  }

  private _getCalculation(): CalculationResult | undefined {
    if (!this.provider || !this.cardName) return undefined;
    return this.provider.getCalculationForCard(this.cardName);
  }

  render() {
    if (!this.provider) {
      return html`<div class="error-message">Card provider not available</div>`;
    }

    if (this.provider.isLoading) {
      return html`<div class="loading">Loading card data...</div>`;
    }

    if (this.provider.error) {
      return html`<div class="error-message">Error: ${this.provider.error}</div>`;
    }

    const card = this._getCard();
    if (!card) {
      return html`<div class="error-message">Card "${this.cardName}" not found</div>`;
    }

    const calculation = this._getCalculation();
    if (!calculation) {
      return html`<div class="error-message">Calculation not available for "${this.cardName}"</div>`;
    }

    return html`
      <div class="card-value-container">
        <div>
          <div class="title">Farming Value Analysis</div>
          <div class="status-badge ${calculation.worthFarming ? 'worthy' : 'not-worthy'}">
            ${calculation.worthFarming ? 'Worth Farming' : 'Not Worth Farming'}
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-row">
            <span class="stat-label">Current Value:</span>
            <span class="stat-value">${card.chaosValue.toFixed(1)} chaos</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Divine Value:</span>
            <span class="stat-value">${card.divineValue.toFixed(2)} divine</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Drop Weight:</span>
            <span class="stat-value">${card.weight || 'Unknown'}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Drop Rate:</span>
            <span class="stat-value">${card.dropRate ? (card.dropRate * 100).toFixed(6) + '%' : 'Unknown'}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Expected Value:</span>
            <span class="stat-value">${calculation.expectedValue.toFixed(6)} chaos</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Value/Weight:</span>
            <span class="stat-value">${calculation.valuePerWeight.toExponential(2)}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Avg Value/Weight:</span>
            <span class="stat-value">${calculation.averageValuePerWeight.toExponential(2)}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">vs Average:</span>
            <span class="stat-value ${this._getComparisonClass(calculation.comparisonToAverage)}">
              ${calculation.comparisonToAverage > 0 ? '+' : ''}${calculation.comparisonToAverage.toFixed(0)}%
            </span>
          </div>
        </div>

        <div class="reason">${calculation.reason}</div>

        <div class="price-trend ${this._getTrendClass(card)}">
          <span class="price-trend-icon">${this._getTrendIcon(card)}</span>
          <span>Listings: ${card.listingCount}</span>
        </div>
      </div>
    `;
  }

  private _getComparisonClass(comparison: number): string {
    if (comparison > 30) return 'positive-value';
    if (comparison < -30) return 'negative-value';
    return 'neutral-value';
  }

  private _getTrendClass(card: DivinationCard): string {
    // This is a placeholder for actual trend data
    // In a real implementation, you'd track price changes over time
    return 'trend-stable';
  }

  private _getTrendIcon(card: DivinationCard): string {
    // Placeholder for trend icons
    // In a real implementation, you'd use actual icons based on price trends
    return '⟷'; // Stable price icon
  }
} 