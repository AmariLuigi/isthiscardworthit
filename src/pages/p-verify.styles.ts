import { css } from 'lit';
import { linkStyles } from '../linkStyles';

export const styles = css`
	@layer reset {
		* {
			padding: 0;
			margin: 0;
		}

		ul {
			list-style: none;
		}
	}

	:host {
		--need-to-verify-border: none;
	}

	${linkStyles}

	e-source-with-cards {
		--cards-margin-top: 0rem;
	}

	.heading {
		text-align: center;
	}

	e-verify-faq-alert {
		margin-top: 3rem;
		margin-inline: auto;
		display: block;
	}

	.main {
		max-width: 1400px;
	}

	.source-with-cards-list {
		margin-top: 2rem;
		margin-left: 1rem;

		list-style: none;
		display: flex;
		justify-content: center;
		column-gap: 5rem;
		row-gap: 3rem;
		flex-wrap: wrap;
	}

	.category-heading:first-of-type {
		margin-top: 4rem;
	}

	.category-heading {
		display: block;
		font-size: 1.5rem;
		margin-inline: auto;
		width: fit-content;
	}

	/** Table of contents */

	.table-of-contents {
		max-width: 400px;
		right: 100px;
		top: 100px;
		z-index: 200000;
		margin-top: 2rem;
		border: 1px solid var(--sl-color-gray-300);
		@media (width >=1950px) {
			position: fixed;
		}
	}

	.table-of-contents__summary {
		padding: 1rem;
	}

	.table-of-contents__inner {
		height: calc(80vh - 100px);
		max-height: calc(80vh - 100px);
		padding: 2rem;
		overflow-y: scroll;
	}

	.brief-table-of-contents {
		margin-left: 2rem;
		display: grid;
		gap: 0.1rem;
	}

	details:not([open]) {
		overflow-y: initial;
	}

	a.active {
		color: var(--link-color-hover, blue);
	}

	.category-heading-link {
		display: block;
		margin-block: 2rem;
		font-size: 1.5rem;
		margin-inline: auto;
		width: fit-content;
	}

	/** details for weights table */
	.details-weights-table,
	.li-link-to-weights-table {
		display: none;
		@media (width >= 640px) {
			display: initial;
		}
	}

	.details-weights-table {
		padding: 1rem;
	}

	.details-weights-table__summary {
		font-size: 1.2rem;
		font-weight: 700;
		margin-bottom: 1rem;
	}

	.li-link-to-weights-table a {
		color: orangered;
	}

	/** media */
`;
