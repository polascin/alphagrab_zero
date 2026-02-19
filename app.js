/**
 * AlphaGrab - Main Application Logic
 */

// Mock Data
const matches = [
  {
    id: 1,
    homeTeam: "Manchester City",
    awayTeam: "Real Madrid",
    league: "Champions League",
    date: "2026-04-15T20:00:00",
    stadium: "Etihad Stadium",
    location: "Manchester, UK",
    price: 150,
    currency: "£",
    region: "europe",
    demand: "Very High",
    color: ["#6CABDD", "#FEBE10"], // Team colors
    featured: true
  },
  {
    id: 2,
    homeTeam: "Liverpool",
    awayTeam: "Man United",
    league: "Premier League",
    date: "2026-03-22T16:30:00",
    stadium: "Anfield",
    location: "Liverpool, UK",
    price: 120,
    currency: "£",
    region: "uk",
    demand: "High",
    color: ["#C8102E", "#DA291C"]
  },
  {
    id: 3,
    homeTeam: "Arsenal",
    awayTeam: "Tottenham",
    league: "Premier League",
    date: "2026-03-14T12:30:00",
    stadium: "Emirates Stadium",
    location: "London, UK",
    price: 110,
    currency: "£",
    region: "uk",
    demand: "High",
    color: ["#EF0107", "#132257"]
  },
  {
    id: 4,
    homeTeam: "Barcelona",
    awayTeam: "Bayern Munich",
    league: "Champions League",
    date: "2026-04-14T20:00:00",
    stadium: "Camp Nou",
    location: "Barcelona, Spain",
    price: 180,
    currency: "€",
    region: "europe",
    demand: "Very High",
    color: ["#004D98", "#DC052D"]
  },
  {
    id: 5,
    homeTeam: "Argentina",
    awayTeam: "Brazil",
    league: "World Cup Qualifiers",
    date: "2026-06-10T19:00:00",
    stadium: "MetLife Stadium",
    location: "New Jersey, USA",
    price: 350,
    currency: "$",
    region: "world",
    demand: "Extremely High",
    color: ["#75AADB", "#FFDC02"]
  },
  {
    id: 6,
    homeTeam: "Chelsea",
    awayTeam: "Newcastle",
    league: "Premier League",
    date: "2026-03-29T15:00:00",
    stadium: "Stamford Bridge",
    location: "London, UK",
    price: 85,
    currency: "£",
    region: "uk",
    demand: "Moderate",
    color: ["#034694", "#241F20"]
  },
  {
    id: 7,
    homeTeam: "PSG",
    awayTeam: "Marseille",
    league: "Ligue 1",
    date: "2026-04-05T21:00:00",
    stadium: "Parc des Princes",
    location: "Paris, France",
    price: 95,
    currency: "€",
    region: "europe",
    demand: "High",
    color: ["#004170", "#009DFF"]
  },
  {
    id: 8,
    homeTeam: "Inter Milan",
    awayTeam: "AC Milan",
    league: "Serie A",
    date: "2026-04-19T20:45:00",
    stadium: "San Siro",
    location: "Milan, Italy",
    price: 130,
    currency: "€",
    region: "europe",
    demand: "High",
    color: ["#010E80", "#FB090B"]
  },
  {
    id: 9,
    homeTeam: "England",
    awayTeam: "Germany",
    league: "Friendly",
    date: "2026-06-01T19:45:00",
    stadium: "Wembley",
    location: "London, UK",
    price: 90,
    currency: "£",
    region: "uk",
    demand: "High",
    color: ["#FFFFFF", "#000000"]
  },
  {
    id: 10,
    homeTeam: "LA Galaxy",
    awayTeam: "Inter Miami",
    league: "MLS",
    date: "2026-05-15T19:30:00",
    stadium: "Dignity Health Park",
    location: "Los Angeles, USA",
    price: 200,
    currency: "$",
    region: "world",
    demand: "Very High",
    color: ["#00245D", "#F7B5CD"]
  }
];

// State
let state = {
  filter: 'all',
  sort: 'date-asc',
  search: ''
};

// DOM Elements
const matchesGrid = document.getElementById('matches-grid');
const tabs = document.querySelectorAll('.tab-btn');
const sortSelect = document.getElementById('sort-select');
const searchInput = document.getElementById('match-search');
const heroCardContainer = document.querySelector('.hero-card-container');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  init();
});

function init() {
  setupEventListeners();
  renderFeaturedMatch();
  renderMatches();
  setInterval(simulateLivePrices, 5000);
}

function simulateLivePrices() {
  // Randomly select a match to update
  const randomIndex = Math.floor(Math.random() * matches.length);
  const match = matches[randomIndex];

  // Random price fluctuation (-5 to +10)
  const fluctuation = Math.floor(Math.random() * 15) - 5;
  const newPrice = Math.max(50, match.price + fluctuation);

  if (newPrice !== match.price) {
    match.price = newPrice;

    // If it's the featured match, re-render featured
    if (match.featured) {
      renderFeaturedMatch();
    }

    // Re-render grid to show update (in a real app we'd target specific DOM element)
    // For efficiency in this demo, we'll just re-render if it's visible
    renderMatches();

    // Optional: Show a toast or logs (skipping to keep UI clean)
  }
}

function setupEventListeners() {
  // Tabs
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      tabs.forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      state.filter = e.target.dataset.region;
      renderMatches();
    });
  });

  // Sort
  sortSelect.addEventListener('change', (e) => {
    state.sort = e.target.value;
    renderMatches();
  });

  // Search
  searchInput.addEventListener('input', (e) => {
    state.search = e.target.value.toLowerCase();
    renderMatches();
  });
}

// Data Processing
function getFilteredMatches() {
  let filtered = matches.filter(match => {
    // Filter by Region
    if (state.filter !== 'all') {
      if (state.filter === 'uk' && match.region !== 'uk') return false;
      // Note: 'europe' logic in real world implies excluding UK often, but physically UK is in Europe.
      // For this logic, we treat them as strict categories as defined in data.
      if (state.filter === 'europe' && match.region !== 'europe') return false;
      if (state.filter === 'world' && match.region !== 'world') return false;
    }

    // Search
    if (state.search) {
      const query = state.search;
      return (
        match.homeTeam.toLowerCase().includes(query) ||
        match.awayTeam.toLowerCase().includes(query) ||
        match.league.toLowerCase().includes(query) ||
        match.stadium.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Sorting
  filtered.sort((a, b) => {
    switch (state.sort) {
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'date-asc':
        return new Date(a.date) - new Date(b.date);
      case 'popularity':
        // Simple weighting for demo
        const demandMap = { "Extremely High": 3, "Very High": 2, "High": 1, "Moderate": 0 };
        return demandMap[b.demand] - demandMap[a.demand];
      default:
        return 0;
    }
  });

  return filtered;
}

// Helper to generate initials
function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

// Rendering
function renderFeaturedMatch() {
  const featured = matches.find(m => m.featured) || matches[0];

  // Create detailed card for hero
  const cardHTML = `
        <div class="hero-match-card-content" style="height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
            <div class="match-badge" style="background: rgba(255,255,255,0.1); width: fit-content; padding: 5px 10px; border-radius: 4px; font-size: 0.8rem;">
                <i class="fa-solid fa-star" style="color: #FEBE10;"></i> Featured Match
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
                <h2 style="font-size: 2rem; margin-bottom: 5px;">${featured.league}</h2>
                <p style="color: var(--text-gray);">${new Date(featured.date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div style="text-align: center;">
                    <div style="width: 80px; height: 80px; border-radius: 50%; background: ${featured.color[0]}; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold; box-shadow: 0 0 20px ${featured.color[0]}40; margin: 0 auto 10px;">${getInitials(featured.homeTeam)}</div>
                    <h3 style="font-size: 1.2rem;">${featured.homeTeam}</h3>
                </div>
                <div style="font-size: 2rem; font-weight: 800; color: var(--text-gray); opacity: 0.5;">VS</div>
                <div style="text-align: center;">
                    <div style="width: 80px; height: 80px; border-radius: 50%; background: ${featured.color[1]}; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold; box-shadow: 0 0 20px ${featured.color[1]}40; margin: 0 auto 10px;">${getInitials(featured.awayTeam)}</div>
                    <h3 style="font-size: 1.2rem;">${featured.awayTeam}</h3>
                </div>
            </div>

            <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; text-align: center;">
                <p style="margin-bottom: 5px; color: var(--text-gray);">Starting from</p> 
                <h2 style="font-size: 2.5rem; color: var(--success); margin-bottom: 20px;">${featured.currency}${featured.price}</h2>
                <button class="btn btn-primary" style="width: 100%;">Get Tickets Now</button>
            </div>
        </div>
    `;

  // Replace the loader
  const container = document.getElementById('hero-match-card');
  container.innerHTML = cardHTML;
}

function renderMatches() {
  const data = getFilteredMatches();
  matchesGrid.innerHTML = '';

  if (data.length === 0) {
    matchesGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-gray);">No matches found matching your criteria.</div>`;
    return;
  }

  data.forEach((match, index) => {
    const card = document.createElement('div');
    card.className = 'match-card';
    card.style.animationDelay = `${index * 0.1}s`; // Stagger animation

    // Define gradients for team logos/backgrounds
    const bgGradient = `linear-gradient(135deg, ${match.color[0]}aa, ${match.color[1]}aa)`;

    card.innerHTML = `
            <div class="match-header" style="background: ${bgGradient};">
                <div class="league-badge">${match.league}</div>
                <div class="match-teams">
                    <div class="team-logo" style="background: #fff; color: ${match.color[0]};">${getInitials(match.homeTeam)}</div>
                    <span class="vs">VS</span>
                    <div class="team-logo" style="background: #fff; color: ${match.color[1]};">${getInitials(match.awayTeam)}</div>
                </div>
            </div>
            <div class="match-body">
                <h3 class="match-title">${match.homeTeam} vs ${match.awayTeam}</h3>
                <div class="match-info">
                    <span><i class="fa-solid fa-calendar"></i> ${new Date(match.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                    <span><i class="fa-solid fa-clock"></i> ${new Date(match.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div class="match-info">
                    <span><i class="fa-solid fa-location-dot"></i> ${match.stadium}</span>
                </div>
                <div style="margin-bottom: 15px;">
                   <span style="font-size: 0.8rem; color: ${match.demand === 'Very High' || match.demand === 'Extremely High' ? 'var(--danger)' : 'var(--text-gray)'}; font-weight: 600;">
                       <i class="fa-solid fa-fire"></i> ${match.demand} Demand
                   </span>
                </div>
                <div class="price-tag">
                    <span class="price-label">From</span>
                    <span class="price-value">${match.currency}${match.price}</span>
                </div>
                <button class="btn btn-secondary" style="margin-top: 15px; width: 100%;">View Seats</button>
            </div>
        `;

    matchesGrid.appendChild(card);
  });
}
