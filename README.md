# Pokedex do Otávio (v2)

![Project Banner](https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png)

> A modern, responsive, and feature-rich Pokédex application built with React, Tailwind CSS, and the PokéAPI.

[![React](https://img.shields.io/badge/React-19.0-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Vercel](https://img.shields.io/badge/Vercel-Deploy-000000?style=for-the-badge&logo=vercel)](https://vercel.com/)

**Live Demo / Repository:** [github.com/rafaelxulipa/pokedex-v2](https://github.com/rafaelxulipa/pokedex-v2)

---

## 🚀 Features

This project was designed with a focus on **UI/UX**, **Performance**, and **Accessibility**.

### 🎨 Visual & Interface
*   **Modern Design:** Glassmorphism effects, clean typography (Inter font), and intuitive card layouts.
*   **Dark Mode 🌙:** Fully responsive theme toggle (System preference detection included).
*   **Responsive:** optimized for Mobile, Tablet, and Desktop experiences.
*   **Animations:** Smooth page transitions, hover effects, and loading states.
*   **Rotom Cursor:** A fun, custom interactive cursor for desktop users.

### 🧠 Functionality
*   **Search & Filter:** Instant search by name and filtering by Pokémon type.
*   **Detailed Stats:** Interactive horizontal bar charts for Base Stats (HP, Atk, Def, etc.).
*   **Evolution Chain:** Visual representation of evolution paths (Vertical on mobile, Horizontal on desktop).
*   **Comparison Tool ⚖️:** Select up to 2 Pokémon to compare stats side-by-side.
*   **Favorites ❤️:** Save your favorite Pokémon locally (persists via LocalStorage).
*   **Multi-language Support 🌍:** Available in EN, PT-BR, ES, DE, ZH, and JA.
*   **Weakness Calculator:** Automatically calculates type weaknesses based on damage relations.

### 💰 Monetization
*   **Google AdSense Integration:** Ready-to-use components for ad placement (Rectangle and Horizontal slots).

---

## 🛠️ Tech Stack

*   **Frontend:** React 19 (Hooks, Context API)
*   **Router:** React Router DOM v7
*   **Styling:** Tailwind CSS + Lucide Icons
*   **Data Source:** [PokéAPI](https://pokeapi.co/) (REST v2)
*   **Charts:** Custom CSS-based charts (lightweight)
*   **State Management:** React Context (Global & Theme)

---

## 📦 Getting Started

Follow these steps to run the project locally.

### Prerequisites
*   Node.js (v18 or higher)
*   npm or yarn

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/rafaelxulipa/pokedex-v2.git
    cd pokedex-v2
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```

4.  Open `http://localhost:5173` (or the port shown in your terminal) in your browser.

---

## 🔧 AdSense Configuration

To enable real ads, you need to update the placeholders with your Google AdSense credentials.

1.  Open `index.html` and add your client ID script:
    ```html
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_ID_HERE" crossorigin="anonymous"></script>
    ```

2.  Open `components/AdSense.tsx` and update the `data-ad-client` and `data-ad-slot` props:
    ```tsx
    <ins className="adsbygoogle"
         data-ad-client="ca-pub-YOUR_PUBLISHER_ID"
         data-ad-slot="YOUR_SLOT_ID"
         ...
    />
    ```

---

## 📂 Project Structure

```bash
pokedex-v2/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable UI components (Cards, Charts, AdSense)
│   ├── context/         # Global State (Theme, Language, Favorites)
│   ├── pages/           # Main Views (Home, Details, Compare)
│   ├── services/        # API Fetching logic
│   ├── types/           # TypeScript Interfaces
│   ├── App.tsx          # Main Entry
│   └── translations.ts  # Localization strings
├── index.html           # HTML Entry point
└── tailwind.config.js   # Style configuration
```

---

## 📜 License

This project is open-source and available under the **MIT License**.

---

## 👨‍💻 Author

Developed with ❤️ by **Otávio / Rafael**.

*   GitHub: [@rafaelxulipa](https://github.com/rafaelxulipa)
