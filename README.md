# Is This Card Worth It?

A Path of Exile (PoE) divination card analysis tool based on the excellent [divicards-site](https://github.com/shonya3/divicards-site) repository.

## Project Overview

"Is This Card Worth It?" helps Path of Exile players determine which divination cards are worth farming based on:

- Card drop weights and rarity
- Current market value in chaos/divine orbs
- Expected value calculations
- Farming efficiency comparisons

The tool provides a comprehensive analysis of each card's value-to-rarity ratio to help players optimize their farming strategies.

## Features

- **Card Database**: Complete collection of Path of Exile divination cards
- **Drop Rate Analysis**: Uses verified community drop weight data
- **Value Calculation**: Algorithm to determine farming efficiency
- **Farming Recommendations**: Clear "Worth Farming" or "Skip" recommendations
- **Interactive UI**: Search, filter, and explore card details
- **Visual Card Display**: Authentic Path of Exile card design

## Tech Stack

- **Lit**: Web components framework for building our UI
- **TypeScript**: Type safety and developer experience
- **Vite**: Fast development server and bundler
- **Shoelace**: High-quality web components
- **Path of Exile Custom Elements**: PoE-specific components

## Getting Started

### Prerequisites

- Node.js (16+)
- pnpm (preferred) or npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/isthiscardworthit.git
   cd isthiscardworthit
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm dev
   ```

4. Visit `http://localhost:5173` to see the application

## Development

This project uses Lit for web components and Vite for building.

Key commands:
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build

## Acknowledgments

This project is based on [divicards-site](https://github.com/shonya3/divicards-site) by shonya3 and uses assets and data from the Path of Exile community.

## Disclaimer

This project is not affiliated with or endorsed by Grinding Gear Games. Path of Exile is a registered trademark of Grinding Gear Games.
