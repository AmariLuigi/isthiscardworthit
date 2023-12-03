import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import type { CardFromSource } from '../data/CardsFinder';
import type { ISource } from '../data/ISource.interface';

declare global {
	interface HTMLElementTagNameMap {
		'e-source-and-cards': SourceAndCardsElement;
	}
}

@customElement('e-source-and-cards')
export class SourceAndCardsElement extends LitElement {
	@property({ type: Object }) source!: ISource;
	@property({ type: Array }) cards!: CardFromSource[];

	@query('.source') mainSourceElement!: HTMLElement;

	#onBossNavigation() {
		this.mainSourceElement.style.setProperty('view-transition-name', 'none');
	}

	cardsList() {
		return html`<ul>
			${this.cards.map(({ card, boss }) => {
				return html`<e-divination-card size="large" .name=${card} .boss=${boss?.id}>
					${boss
						? html`<e-source
								@click=${this.#onBossNavigation}
								.renderMode=${'compact'}
								.source=${boss}
								slot="boss"
						  ></e-source>`
						: nothing}
				</e-divination-card>`;
			})}
		</ul>`;
	}

	render() {
		return html`<div class="wrapper">
			<e-source part="source" class="source" size="large" .source=${this.source}></e-source>
			${this.cardsList()}
		</div>`;
	}

	static styles = css`
		ul {
			list-style: none;
			display: flex;
			flex-wrap: wrap;
		}
	`;
}
