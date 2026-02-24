/**
 * AlphaGrab - Main Application Logic
 */

// State & Data
let matches = [];

const SEATGEEK_CLIENT_ID = import.meta.env?.VITE_SEATGEEK_CLIENT_ID || 'MzgxMjc3OTV8MTY5OTMwMTAzMy44MjUxMTQ'; // Fallback demo key if env missing

// Pre-defined team colors for visual flair (SeatGeek API doesn't provide team colors)
const teamColors = [
  ["#6CABDD", "#FEBE10"], ["#C8102E", "#DA291C"], ["#EF0107", "#132257"],
  ["#004D98", "#DC052D"], ["#034694", "#241F20"], ["#004170", "#009DFF"],
  ["#010E80", "#FB090B"], ["#FFFFFF", "#000000"], ["#00245D", "#F7B5CD"]
];

async function fetchLiveEvents() {
  try {
    // Fetch upcoming soccer events from SeatGeek
    const response = await fetch(`https://api.seatgeek.com/2/events?type=soccer&per_page=12&client_id=${SEATGEEK_CLIENT_ID}`);
    const data = await response.json();

    if (data.events && data.events.length > 0) {
      matches = data.events.map((event, index) => {
        // Extract teams
        const homeTeam = event.performers.find(p => p.away_team === false)?.name || event.performers[0]?.name || "Home Team";
        const awayTeam = event.performers.find(p => p.away_team === true)?.name || event.performers[1]?.name || "Away Team";

        // Use real lowest price if available, otherwise fallback to a realistic simulated price
        const basePrice = event.stats?.lowest_price || Math.floor(Math.random() * 100) + 50;

        // Determine region based on country
        let region = "world";
        const country = event.venue?.country?.toUpperCase() || "";
        if (country === "UK" || country === "GB" || country === "ENGLAND") region = "uk";
        else if (["ES", "FR", "IT", "DE", "PT", "NL"].includes(country)) region = "europe";

        // Map SeatGeek event to our format
        return {
          id: event.id,
          seatgeek_url: event.url, // Keep link to buy real tickets
          homeTeam: homeTeam,
          awayTeam: awayTeam,
          league: event.taxonomies[0]?.name || "Soccer Event",
          date: event.datetime_local || event.datetime_utc,
          stadium: event.venue?.name || "TBA",
          location: `${event.venue?.city || ''}, ${event.venue?.country || ''}`.trim().replace(/^,/, ''),
          price: basePrice,
          currency: "$", // SeatGeek usually returns USD
          region: region,
          demand: event.stats?.listing_count < 100 ? "Extremely High" : (event.stats?.listing_count < 500 ? "High" : "Moderate"),
          color: teamColors[index % teamColors.length], // Random assigned colors
          featured: index === 0 // Make the first result featured
        };
      });
    }
  } catch (err) {
    console.error("Failed to fetch from SeatGeek API:", err);
    // If it fails (e.g., rate limits or adblocker), we could optionally set fallback matches here.
  }
}

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
  initAuth();
});

async function init() {
  // Show localized loading state while fetching API
  if (matchesGrid) {
    matchesGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-gray);"><div class="loader" style="margin: 0 auto 20px;"></div><p>Fetching real-time market data from SeatGeek...</p></div>';
  }

  // Fetch from public API
  await fetchLiveEvents();

  if (matches.length === 0) {
    if (matchesGrid) matchesGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--danger);">Failed to load live events. Please try again later.</div>`;
    return;
  }

  // Initialize price history for all matches
  matches.forEach(match => {
    if (!match.priceHistory) {
      // Setup some initial randomized history leading up to the real fetched price
      const mockHistory = [];
      let basePrice = match.price - (Math.floor(Math.random() * 20) - 10);
      for (let i = 0; i < 9; i++) {
        mockHistory.push(Math.max(20, basePrice));
        basePrice += (Math.floor(Math.random() * 15) - 7);
      }
      mockHistory.push(match.price);
      match.priceHistory = mockHistory;
    }
  });

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
    match.priceHistory.push(newPrice);

    // Keep history reasonably sized (e.g., last 10 prices)
    if (match.priceHistory.length > 10) {
      match.priceHistory.shift();
    }

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

// Data Processing
function generateSparkline(history) {
  if (!history || history.length < 2) {
    return `
      <div style="margin-top: 15px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 10px; opacity: 0.5;">
          <span style="font-size: 0.75rem; color: var(--text-gray);"><i class="fa-solid fa-chart-line"></i> Price History collecting...</span>
      </div>
    `;
  }

  const width = 100;
  const height = 30;
  const max = Math.max(...history);
  const min = Math.min(...history);
  const range = max - min || 1;
  const padding = 2;
  const usableHeight = height - (padding * 2);
  const step = width / (history.length - 1);

  const points = history.map((price, i) => {
    const x = i * step;
    const y = height - padding - ((price - min) / range) * usableHeight;
    return `${x},${y}`;
  }).join(' ');

  const currentPrice = history[history.length - 1];
  const oldPrice = history[history.length - 2];

  const isUp = currentPrice > oldPrice;
  const isDown = currentPrice < oldPrice;

  let trendColor = 'var(--text-gray)';
  let icon = 'fa-minus';

  if (isUp) {
    trendColor = 'var(--danger)'; // red means price increased
    icon = 'fa-arrow-trend-up';
  } else if (isDown) {
    trendColor = 'var(--success)'; // green means price dropped
    icon = 'fa-arrow-trend-down';
  }

  return `
    <div style="margin-top: 15px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
            <span style="font-size: 0.75rem; color: var(--text-gray);"><i class="fa-solid fa-chart-line"></i> Price History</span>
            <span style="font-size: 0.75rem; color: ${trendColor}; font-weight: bold;">
                <i class="fa-solid ${icon}"></i>
            </span>
        </div>
        <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="overflow: visible; display: block; filter: drop-shadow(0 0 2px ${trendColor}80)">
            <polyline fill="none" stroke="${trendColor}" stroke-width="2" points="${points}" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="${(history.length - 1) * step}" cy="${height - padding - ((currentPrice - min) / range) * usableHeight}" r="3" fill="${trendColor}" />
        </svg>
    </div>
  `;
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
                <h2 style="font-size: 2.5rem; color: var(--success); margin-bottom: 10px;">${featured.currency}${featured.price}</h2>
                <div style="margin-bottom: 20px; text-align: left;">
                    ${generateSparkline(featured.priceHistory)}
                </div>
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                  <button class="btn btn-primary" style="flex: 2;" onclick="window.open('${featured.seatgeek_url}', '_blank')">Buy on SeatGeek</button>
                  <button class="btn btn-secondary track-price-btn" style="flex: 1;" data-id="${featured.id}"><i class="fa-regular fa-bell"></i> Track</button>
                </div>
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
                <div class="price-tag" style="border-bottom: none; padding-bottom: 0;">
                    <span class="price-label">Live Low</span>
                    <span class="price-value">${match.currency}${match.price}</span>
                </div>
                ${generateSparkline(match.priceHistory)}
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                  <button class="btn btn-secondary" style="flex: 2;" onclick="window.open('${match.seatgeek_url}', '_blank')">View Seats</button>
                  <button class="btn btn-secondary track-price-btn" style="flex: 1; padding: 0;" data-id="${match.id}" title="Track Price"><i class="fa-regular fa-bell"></i></button>
                </div>
            </div>
        `;

    matchesGrid.appendChild(card);
  });

  // Re-attach observers for Track buttons
  document.querySelectorAll('.track-price-btn').forEach(btn => {
    btn.addEventListener('click', handleTrackMatch);
  });
}

// Supabase Track Match implementation
async function handleTrackMatch(e) {
  const btn = e.currentTarget;
  const matchId = btn.getAttribute('data-id');

  if (!authState.user) {
    // Open auth modal if not logged in
    authModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    return;
  }

  if (!supabase) return;

  try {
    const icon = btn.querySelector('i');

    // Check if already tracking
    if (icon.classList.contains('fa-solid')) {
      // Untrack
      const { error } = await supabase
        .from('saved_matches')
        .delete()
        .eq('user_id', authState.user.id)
        .eq('match_id', matchId);

      if (!error) {
        icon.classList.remove('fa-solid');
        icon.classList.add('fa-regular');
        btn.style.color = '';
      }
    } else {
      // Track
      const { error } = await supabase
        .from('saved_matches')
        .insert([{
          user_id: authState.user.id,
          match_id: matchId,
          created_at: new Date().toISOString()
        }]);

      if (!error) {
        icon.classList.remove('fa-regular');
        icon.classList.add('fa-solid');
        btn.style.color = 'var(--accent)';
      } else if (error.code === '23505') { // Unique constraint violation (already tracked)
        icon.classList.remove('fa-regular');
        icon.classList.add('fa-solid');
        btn.style.color = 'var(--accent)';
      } else {
        console.error("Error tracking match:", error);
      }
    }
  } catch (err) {
    console.error("Error toggling track status:", err);
  }
}

// --- Supabase Authentication Logic ---

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY;

// Initialize the Supabase client (guard against missing CDN/env)
const supabase = (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const authState = {
  user: null
};

// Elements
const authModal = document.getElementById('auth-modal');
const closeAuthModalBtn = document.getElementById('close-auth-modal');
const navSigninBtn = document.getElementById('nav-signin-btn');
const navUserProfile = document.getElementById('nav-user-profile');
const userAvatar = document.getElementById('user-avatar');
const userEmailDisplay = document.getElementById('user-email-display');
const signOutBtn = document.getElementById('sign-out-btn');

// Forms
const signinFormContainer = document.getElementById('signin-form-container');
const signupFormContainer = document.getElementById('signup-form-container');
const showSignupBtn = document.getElementById('show-signup-btn');
const showSigninBtn = document.getElementById('show-signin-btn');

const signinForm = document.getElementById('signin-form');
const signupForm = document.getElementById('signup-form');
const signinError = document.getElementById('signin-error');
const signupError = document.getElementById('signup-error');

async function initAuth() {
  if (!supabase) {
    console.error("Supabase client not initialized. Ensure the CDN is loaded and Vite env vars are set.");
    setupAuthEventListeners();
    updateAuthUI();
    return;
  }

  // Get initial session
  const { data: { session } } = await supabase.auth.getSession();
  authState.user = session?.user || null;
  updateAuthUI();

  // Listen for auth changes
  supabase.auth.onAuthStateChange((event, session) => {
    authState.user = session?.user || null;
    updateAuthUI();
  });

  setupAuthEventListeners();
}

function setupAuthEventListeners() {
  // Modal toggles
  navSigninBtn.addEventListener('click', () => {
    authModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  });

  closeAuthModalBtn.addEventListener('click', closeAuthModal);

  // Close modal on outside click
  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) {
      closeAuthModal();
    }
  });

  // User Profile Dropdown Toggle
  userAvatar.addEventListener('click', (e) => {
    e.stopPropagation(); // prevent clicking document from closing it immediately
    const dropdown = document.querySelector('.profile-dropdown');
    if (dropdown) dropdown.classList.toggle('active');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const dropdown = document.querySelector('.profile-dropdown');
    if (dropdown && dropdown.classList.contains('active')) {
      if (!navUserProfile.contains(e.target)) {
        dropdown.classList.remove('active');
      }
    }
  });

  // Switch between Sign In / Sign Up
  showSignupBtn.addEventListener('click', (e) => {
    e.preventDefault();
    signinFormContainer.style.display = 'none';
    signupFormContainer.style.display = 'block';
    clearAuthErrors();
  });

  showSigninBtn.addEventListener('click', (e) => {
    e.preventDefault();
    signupFormContainer.style.display = 'none';
    signinFormContainer.style.display = 'block';
    clearAuthErrors();
  });

  // Form Submissions
  signupForm.addEventListener('submit', handleSignUp);
  signinForm.addEventListener('submit', handleSignIn);
  if (signOutBtn) signOutBtn.addEventListener('click', handleSignOut);
}

function closeAuthModal() {
  authModal.classList.remove('active');
  document.body.style.overflow = '';
  setTimeout(() => {
    // Reset to sign in view after modal closes
    signinFormContainer.style.display = 'block';
    signupFormContainer.style.display = 'none';
    clearAuthErrors();
    if (signupForm) signupForm.reset();
    if (signinForm) signinForm.reset();
  }, 300);
}

function clearAuthErrors() {
  signinError.textContent = '';
  signupError.textContent = '';
  signinError.style.color = '';
  signupError.style.color = '';
}

async function handleSignUp(e) {
  e.preventDefault();
  clearAuthErrors();

  if (!supabase) {
    signupError.textContent = "Authentication service is unavailable.";
    return;
  }

  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirmPassword = document.getElementById('signup-confirm').value;

  if (password !== confirmPassword) {
    signupError.textContent = "Passwords do not match.";
    return;
  }

  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
  });

  if (error) {
    signupError.textContent = error.message;
  } else {
    // Supabase auto-logins after signup iff email confirmations are disabled.
    // Otherwise, we might need to tell them to check their email.
    if (data.session) {
      closeAuthModal();
    } else {
      signupError.textContent = "Please check your email to verify your account.";
      signupError.style.color = "var(--success)";
    }
  }
}

async function handleSignIn(e) {
  e.preventDefault();
  clearAuthErrors();

  if (!supabase) {
    signinError.textContent = "Authentication service is unavailable.";
    return;
  }

  const email = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    signinError.textContent = error.message;
  } else {
    closeAuthModal();
  }
}

async function handleSignOut(e) {
  e.preventDefault();
  if (!supabase) return;
  await supabase.auth.signOut();

  // Close dropdown if open
  const dropdown = document.querySelector('.profile-dropdown');
  if (dropdown) dropdown.classList.remove('active');
}

// Utility to escape HTML and prevent XSS
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function updateAuthUI() {
  if (authState.user) {
    // User is logged in
    navSigninBtn.style.display = 'none';
    navUserProfile.style.display = 'block';

    // Set Avatar text (first 2 letters of email)
    const [localPart] = authState.user.email.split('@');
    // Ensure we only use safe character length for textContent
    const avatarText = escapeHTML(localPart.substring(0, 2).toUpperCase());

    userAvatar.textContent = avatarText;
    // textContent is inherently safer than innerHTML, but escaping adds defense-in-depth
    userEmailDisplay.textContent = escapeHTML(authState.user.email);
  } else {
    // User is logged out
    navSigninBtn.style.display = 'block';
    navUserProfile.style.display = 'none';
  }
}
