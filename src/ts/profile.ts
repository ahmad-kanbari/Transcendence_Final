import api from './api';
import app from './app';
import utils from './utils';
import components from './components';
import { VALIDATION_INPUTS } from './constants';
import { baseURL } from './constants';
// Interface for profile form elements
interface ProfileForm {
  profileUsername?: HTMLElement | null;
  profileAvatar?: HTMLImageElement | null;
  displayNameField?: HTMLInputElement | null;
  emailField?: HTMLInputElement | null;
  statsTotalGames?: HTMLElement | null;
  statsWins?: HTMLElement | null;
  statsLosses?: HTMLElement | null;
  statsWinRate?: HTMLElement | null;
  statsRank?: HTMLElement | null;
  profilePictureInput?: HTMLInputElement | null;
  uploadBtn?: HTMLButtonElement | null;
  removeBtn?: HTMLButtonElement | null;
}

// Interface for match entry
interface MatchEntry {
  type: string;
  vs: string;
  score: string;
  winner: string;
}

// Interface for tournament data
interface Tournament {
  tournament_id: number;
  winner: string;
  matches: any[];
}

// Add after existing interfaces
interface TournamentHistory {
  id: number;
  player_capacity: number;
  created_at: string;
  participants: string[];
  matches: any[];
  isComplete: boolean;
  winner?: string;
}

interface UserGameplayStats {
  totalMatches: number;
  tournamentMatches: number;
  regularMatches: number;
  multiplayerMatches: number;
  aiMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  tournamentsPlayed: number;
  tournamentsWon: number;
}

class Profile {
  profileForm: ProfileForm;
  initialized: boolean;
  socket: any;
  baseURL: string;
 
  
  constructor() {
    this.profileForm = {};
    this.initialized = false;
    this.baseURL = baseURL;


  }

  
  init(): void {
    if (this.initialized) return;
    
    document.addEventListener('pageShown', (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail.page === 'profile')
        this.initProfilePage();
    });
    
    this.initialized = true;
    // ❌ ADD this line after fetching match history:
// Store match history for modals
   
  }
  
  getProfileForm(): ProfileForm {
  
    return {
      profileUsername: document.getElementById('profileUsername'),
      profileAvatar: document.getElementById('profileAvatar') as HTMLImageElement | null,
      displayNameField: document.getElementById('settingDisplayName') as HTMLInputElement | null,
      // emailField: document.getElementById('settingEmail') as HTMLInputElement | null,
      statsTotalGames: document.getElementById('statsTotalGames'),
      statsWins: document.getElementById('statsWins'),
      statsLosses: document.getElementById('statsLosses'),
      statsWinRate: document.getElementById('statsWinRate'),
      statsRank: document.getElementById('statsRank'),
      profilePictureInput: document.getElementById('profilePictureInput') as HTMLInputElement | null,
      uploadBtn: document.getElementById('uploadBtn') as HTMLButtonElement | null,
      removeBtn: document.getElementById('removeBtn') as HTMLButtonElement | null
    };
  }
  
  initProfilePage(): void {
    this.profileForm = this.getProfileForm();
    
    this.loadProfileData();
    this.setupProfilePictureHandlers();
    this.init2FA();
    this.setupStatsButtons();

    if (this.profileForm.displayNameField) 
      utils.setupInputField(this.profileForm.displayNameField, 'username', components);
    
    // if (this.profileForm.emailField) 
    //   // utils.setupInputField(this.profileForm.emailField, 'email', components);
    //   console('Email field setup is commented out for now, uncomment if needed');
  }

   async loadProfileData(): Promise<void> {
    try {
      // Check authentication first
      const authRes = await this.fetchWithAutoRefresh(`${this.baseURL}/users/showUser`);
      if (!authRes.ok) {
        window.location.href = 'index.html';
        return;
      }

      // Make body visible
      document.body.style.visibility = 'visible';
      document.body.style.opacity = '1';

      // Get user ID from URL params or current user
      const urlParams = new URLSearchParams(window.location.search);
      const userId = urlParams.get('userId');

       let usertest =await api.getUserById('10');
        console.log('User test data:', usertest);
      let userData;
      if (userId) {
        // Loading another user's profile
        const userRes = await this.fetchWithAutoRefresh(`${this.baseURL}/users/${userId}`);
        if (!userRes.ok) throw new Error('Failed to fetch user data');
        userData = await userRes.json();
      } else {
        // Loading current user's profile
        userData = await authRes.json();
        console.log('Current user data in the profile: ', userData.user.user);
        userData = userData.user.user;
      }



      // ✅ WITH this expanded version:
      let userFullData = await api.getUserById(userData.id);
      console.log('Full user data:in porfile', userFullData);
      // Fetch user's match history and tournaments
      const [matchHistory] = await Promise.all([
        this.fetchUserMatchHistory(userFullData.data['id'] || userData.id),
        // this.fetchUserTournamentHistory(userFullData.data['id'] || userData.id)
      ]);
       localStorage.setItem('userMatchHistory', JSON.stringify(matchHistory));
      console.log('Match history:', matchHistory);
      // console.log('Tournament history:', tournamentHistory);
      this.populateProfileData(userFullData);
      
    } catch (err) {
      console.error('Error loading profile:', err);
      components.showToast('error', 'Profile Error', 'Failed to load profile data');
    }
  }

  // ✅ ADD these new methods:

setupStatsButtons(): void {
  const showDetailedStatsBtn = document.getElementById('showDetailedStatsBtn');
  const showMatchHistoryBtn = document.getElementById('showMatchHistoryBtn');
  const closeDetailedStatsBtn = document.getElementById('closeDetailedStatsBtn');
  const closeMatchHistoryBtn = document.getElementById('closeMatchHistoryBtn');

  if (showDetailedStatsBtn) {
    showDetailedStatsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showDetailedStatsModal();
    });
  }

  if (showMatchHistoryBtn) {

    showMatchHistoryBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showMatchHistoryModal();
    });
  }

  if (closeDetailedStatsBtn) {
    closeDetailedStatsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      document.getElementById('detailedStatsModal')!.classList.add('hidden');
    });
  }

  if (closeMatchHistoryBtn) {
    closeMatchHistoryBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.getElementById('matchHistoryModal')!.classList.add('hidden');
    });
  }
}

calculateDetailedStats(matchHistory: any[]): any {
  const currentUser = app.getUsername();
  const stats = {
    // Basic stats
    totalMatches: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    
    // Match type breakdown
    regularMatches: 0,
    regularWins: 0,
    aiMatches: 0,
    aiWins: 0,
    multiplayerMatches: 0,
    multiplayerWins: 0,
    tournamentMatches: 0,
    tournamentWins: 0,
    
    // Tournament specific
    tournamentsParticipated: new Set(),
    tournamentsWon: new Set(),
    
    // Score analysis
    totalPointsScored: 0,
    totalPointsConceded: 0,
    avgPointsPerMatch: 0,
    biggestWin: { score: '', opponent: '', date: '' },
    closestMatch: { score: '', opponent: '', date: '' },
    
    // Streaks and patterns
    currentWinStreak: 0,
    longestWinStreak: 0,
    currentLossStreak: 0,
    longestLossStreak: 0,
    
    // Monthly breakdown
    monthlyStats: {} as any,
    
    // Opponent analysis
    opponents: {} as any
  };

  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let biggestWinMargin = 0;
  let closestMargin = Infinity;

  // Sort matches by date for streak calculation
  const sortedMatches = matchHistory
    .filter(match => match.status === 'finished')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  sortedMatches.forEach(match => {
    let userWon = false;
    let userScore = 0;
    let opponentScore = 0;
    let opponent = '';
    
    stats.totalMatches++;
    
    // Process based on match type
    if (match.match_type === 'multiplayer') {
      stats.multiplayerMatches++;
      const userTeam = match.teams?.find((team: any) => 
        team.players.some((player: any) => player.player_name === currentUser)
      );
      const opponentTeam = match.teams?.find((team: any) => team.id !== userTeam?.id);
      
      if (userTeam && opponentTeam) {
        userWon = userTeam.score > opponentTeam.score;
        userScore = userTeam.score;
        opponentScore = opponentTeam.score;
        opponent = opponentTeam.name;
        
        if (userWon) stats.multiplayerWins++;
      }
    } else {
      // Regular, AI, or tournament matches
      const isPlayer1 = match.player1_name === currentUser;
      userScore = isPlayer1 ? match.player1_score : match.player2_score;
      opponentScore = isPlayer1 ? match.player2_score : match.player1_score;
      opponent = isPlayer1 ? match.player2_name : match.player1_name;
      userWon = userScore > opponentScore;
      
      switch(match.match_type) {
        case 'tournament':
          stats.tournamentMatches++;
          stats.tournamentsParticipated.add(match.tournament_id);
          if (userWon) {
            stats.tournamentWins++;
            stats.tournamentsWon.add(match.tournament_id);
          }
          break;
        case '1vAi':
          stats.aiMatches++;
          if (userWon) stats.aiWins++;
          break;
        default:
          stats.regularMatches++;
          if (userWon) stats.regularWins++;
      }
    }
    
    // Track total points
    stats.totalPointsScored += userScore;
    stats.totalPointsConceded += opponentScore;
    
    // Track biggest win and closest match
    const margin = Math.abs(userScore - opponentScore);
    if (userWon && margin > biggestWinMargin) {
      biggestWinMargin = margin;
      stats.biggestWin = {
        score: `${userScore}-${opponentScore}`,
        opponent,
        date: new Date(match.created_at).toLocaleDateString()
      };
    }
    if (margin < closestMargin) {
      closestMargin = margin;
      stats.closestMatch = {
        score: `${userScore}-${opponentScore}`,
        opponent,
        date: new Date(match.created_at).toLocaleDateString()
      };
    }
    
    // Track opponents
    if (!stats.opponents[opponent]) {
      stats.opponents[opponent] = { matches: 0, wins: 0 };
    }
    stats.opponents[opponent].matches++;
    if (userWon) stats.opponents[opponent].wins++;
    
    // Track monthly stats
    const month = new Date(match.created_at).toISOString().slice(0, 7);
    if (!stats.monthlyStats[month]) {
      stats.monthlyStats[month] = { matches: 0, wins: 0 };
    }
    stats.monthlyStats[month].matches++;
    if (userWon) stats.monthlyStats[month].wins++;
    
    // Calculate streaks
    if (userWon) {
      stats.wins++;
      currentWinStreak++;
      currentLossStreak = 0;
      longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
    } else {
      stats.losses++;
      currentLossStreak++;
      currentWinStreak = 0;
      longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
    }
  });

  // Finalize calculations
  stats.currentWinStreak = currentWinStreak;
  stats.currentLossStreak = currentLossStreak;
  stats.longestWinStreak = longestWinStreak;
  stats.longestLossStreak = longestLossStreak;
  stats.winRate = stats.totalMatches > 0 ? Math.round((stats.wins / stats.totalMatches) * 100) : 0;
  stats.avgPointsPerMatch = stats.totalMatches > 0 ? Math.round(stats.totalPointsScored / stats.totalMatches * 100) / 100 : 0;

  return stats;
}

// ❌ REPLACE the showDetailedStatsModal method with this cyberpunk-themed version:

showDetailedStatsModal(): void {
  const modal = document.getElementById('detailedStatsModal');
  const content = document.getElementById('detailedStatsContent');
  
  if (!modal || !content) return;
  
  // Get current match history (you'll need to store this from loadProfileData)
  const storedMatches = JSON.parse(localStorage.getItem('userMatchHistory') || '[]');
  const stats = this.calculateDetailedStats(storedMatches);
  
  content.innerHTML = `
    <!-- Match Types Card -->
    <div class="cyber-container bg-gradient-to-br from-cyber-darker to-cyber-dark border-2 border-cyber-blue rounded-lg p-6 shadow-lg hover:shadow-neon-blue transition-all duration-300">
      <div class="flex items-center mb-4">
        <div class="w-3 h-3 bg-cyber-blue rounded-full mr-3 animate-pulse"></div>
        <h6 class="font-cyber text-cyber-blue text-lg font-bold animate-glow">🎮 MATCH TYPES</h6>
      </div>
      <div class="space-y-3">
        <div class="flex justify-between items-center p-3 bg-cyber-dark rounded border-l-4 border-cyber-green shadow-neon-green hover:bg-opacity-80 transition-all">
          <span class="text-white font-cyber font-medium">REGULAR</span>
          <span class="text-cyber-green font-cyber font-bold text-xl">${stats.regularWins}/${stats.regularMatches}</span>
        </div>
        <div class="flex justify-between items-center p-3 bg-cyber-dark rounded border-l-4 border-cyber-pink shadow-neon-pink hover:bg-opacity-80 transition-all">
          <span class="text-white font-cyber font-medium">AI MATCHES</span>
          <span class="text-cyber-pink font-cyber font-bold text-xl">${stats.aiWins}/${stats.aiMatches}</span>
        </div>
        <div class="flex justify-between items-center p-3 bg-cyber-dark rounded border-l-4 border-yellow-400 hover:bg-opacity-80 transition-all">
          <span class="text-white font-cyber font-medium">MULTIPLAYER</span>
          <span class="text-yellow-400 font-cyber font-bold text-xl">${stats.multiplayerWins}/${stats.multiplayerMatches}</span>
        </div>
        <div class="flex justify-between items-center p-3 bg-cyber-dark rounded border-l-4 border-purple-400 hover:bg-opacity-80 transition-all">
          <span class="text-white font-cyber font-medium">TOURNAMENT</span>
          <span class="text-purple-400 font-cyber font-bold text-xl">${stats.tournamentWins}/${stats.tournamentMatches}</span>
        </div>
      </div>
    </div>
    
    <!-- Tournaments Card -->
    <div class="cyber-container bg-gradient-to-br from-cyber-darker to-cyber-dark border-2 border-cyber-blue rounded-lg p-6 shadow-lg hover:shadow-neon-blue transition-all duration-300">
      <div class="flex items-center mb-4">
        <div class="w-3 h-3 bg-cyber-blue rounded-full mr-3 animate-pulse"></div>
        <h6 class="font-cyber text-cyber-blue text-lg font-bold animate-glow">🏆 TOURNAMENTS</h6>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="text-center p-4 bg-cyber-dark rounded-lg border border-cyber-blue shadow-neon-blue">
          <div class="text-3xl font-cyber font-bold text-cyber-blue animate-glow">${stats.tournamentsParticipated.size}</div>
          <div class="text-sm font-cyber text-gray-300">PARTICIPATED</div>
        </div>
        <div class="text-center p-4 bg-cyber-dark rounded-lg border border-cyber-green shadow-neon-green">
          <div class="text-3xl font-cyber font-bold text-cyber-green animate-glow">${stats.tournamentsWon.size}</div>
          <div class="text-sm font-cyber text-gray-300">WON</div>
        </div>
      </div>
      <div class="mt-4 text-center">
        <div class="inline-flex items-center px-6 py-3 bg-gradient-to-r from-cyber-blue to-cyber-green rounded-md border border-cyber-blue shadow-neon-blue">
          <span class="text-cyber-dark font-cyber font-bold text-lg">
            ${stats.tournamentsParticipated.size > 0 ? Math.round((stats.tournamentsWon.size / stats.tournamentsParticipated.size) * 100) : 0}% WIN RATE
          </span>
        </div>
      </div>
    </div>
    
    <!-- Scoring Card -->
    <div class="cyber-container bg-gradient-to-br from-cyber-darker to-cyber-dark border-2 border-cyber-green rounded-lg p-6 shadow-lg hover:shadow-neon-green transition-all duration-300">
      <div class="flex items-center mb-4">
        <div class="w-3 h-3 bg-cyber-green rounded-full mr-3 animate-pulse"></div>
        <h6 class="font-cyber text-cyber-green text-lg font-bold animate-glow">📊 SCORING MATRIX</h6>
      </div>
      <div class="space-y-4">
        <div class="flex justify-between items-center p-2 bg-cyber-dark rounded">
          <span class="font-cyber text-gray-300">POINTS SCORED</span>
          <span class="text-cyber-green font-cyber font-bold text-2xl animate-glow">${stats.totalPointsScored}</span>
        </div>
        <div class="w-full bg-cyber-dark rounded-full h-3 border border-cyber-blue">
          <div class="bg-gradient-to-r from-cyber-green via-cyber-blue to-cyber-pink h-3 rounded-full animate-pulse" 
               style="width: ${stats.totalPointsScored > 0 ? Math.min((stats.totalPointsScored / (stats.totalPointsScored + stats.totalPointsConceded)) * 100, 100) : 0}%"></div>
        </div>
        <div class="flex justify-between items-center p-2 bg-cyber-dark rounded">
          <span class="font-cyber text-gray-300">POINTS CONCEDED</span>
          <span class="text-cyber-pink font-cyber font-bold text-2xl">${stats.totalPointsConceded}</span>
        </div>
        <div class="text-center mt-4 p-4 bg-cyber-dark rounded-lg border border-cyber-blue shadow-neon-blue">
          <div class="text-cyber-blue font-cyber font-bold text-2xl animate-glow">${stats.avgPointsPerMatch}</div>
          <div class="text-sm font-cyber text-gray-300">AVG PER MATCH</div>
        </div>
      </div>
    </div>
    
    <!-- Streaks Card -->
    <div class="cyber-container bg-gradient-to-br from-cyber-darker to-cyber-dark border-2 border-cyber-pink rounded-lg p-6 shadow-lg hover:shadow-neon-pink transition-all duration-300">
      <div class="flex items-center mb-4">
        <div class="w-3 h-3 bg-cyber-pink rounded-full mr-3 animate-pulse"></div>
        <h6 class="font-cyber text-cyber-pink text-lg font-bold animate-glow">🔥 STREAK DATA</h6>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="text-center p-4 bg-gradient-to-br from-cyber-green to-green-600 rounded-lg border border-cyber-green shadow-neon-green">
          <div class="text-3xl font-cyber font-bold text-white animate-glow">${stats.currentWinStreak}</div>
          <div class="text-sm font-cyber text-gray-100">CURRENT WIN</div>
        </div>
        <div class="text-center p-4 bg-gradient-to-br from-cyber-blue to-blue-600 rounded-lg border border-cyber-blue shadow-neon-blue">
          <div class="text-3xl font-cyber font-bold text-white animate-glow">${stats.longestWinStreak}</div>
          <div class="text-sm font-cyber text-gray-100">LONGEST WIN</div>
        </div>
        <div class="text-center p-4 bg-gradient-to-br from-cyber-pink to-red-600 rounded-lg border border-cyber-pink shadow-neon-pink">
          <div class="text-3xl font-cyber font-bold text-white">${stats.currentLossStreak}</div>
          <div class="text-sm font-cyber text-gray-100">CURRENT LOSS</div>
        </div>
        <div class="text-center p-4 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg border border-purple-400">
          <div class="text-3xl font-cyber font-bold text-white">${stats.longestLossStreak}</div>
          <div class="text-sm font-cyber text-gray-100">LONGEST LOSS</div>
        </div>
      </div>
    </div>
    
    <!-- Notable Matches Card -->
    <div class="cyber-container bg-gradient-to-br from-cyber-darker to-cyber-dark border-2 border-purple-400 rounded-lg p-6 shadow-lg hover:shadow-purple-400 transition-all duration-300">
      <div class="flex items-center mb-4">
        <div class="w-3 h-3 bg-purple-400 rounded-full mr-3 animate-pulse"></div>
        <h6 class="font-cyber text-purple-400 text-lg font-bold animate-glow">⭐ NOTABLE ENCOUNTERS</h6>
      </div>
      <div class="space-y-4">
        <div class="p-4 bg-gradient-to-r from-cyber-green to-green-600 rounded-lg border-2 border-cyber-green shadow-neon-green">
          <div class="flex items-center mb-2">
            <span class="text-3xl mr-3">🏆</span>
            <span class="font-cyber font-bold text-white text-lg">DOMINANT VICTORY</span>
          </div>
          <div class="text-white font-cyber font-bold text-2xl animate-glow">${stats.biggestWin.score}</div>
          <div class="text-gray-200 font-cyber text-sm">VS ${stats.biggestWin.opponent}</div>
          <div class="text-gray-300 font-cyber text-xs">${stats.biggestWin.date}</div>
        </div>
        
        <div class="p-4 bg-gradient-to-r from-cyber-pink to-red-600 rounded-lg border-2 border-cyber-pink shadow-neon-pink">
          <div class="flex items-center mb-2">
            <span class="text-3xl mr-3">🎯</span>
            <span class="font-cyber font-bold text-white text-lg">CLOSEST BATTLE</span>
          </div>
          <div class="text-white font-cyber font-bold text-2xl animate-glow">${stats.closestMatch.score}</div>
          <div class="text-gray-200 font-cyber text-sm">VS ${stats.closestMatch.opponent}</div>
          <div class="text-gray-300 font-cyber text-xs">${stats.closestMatch.date}</div>
        </div>
      </div>
    </div>
    
    <!-- Top Opponents Card -->
    <div class="cyber-container bg-gradient-to-br from-cyber-darker to-cyber-dark border-2 border-cyan-400 rounded-lg p-6 shadow-lg hover:shadow-cyan-400 transition-all duration-300">
      <div class="flex items-center mb-4">
        <div class="w-3 h-3 bg-cyan-400 rounded-full mr-3 animate-pulse"></div>
        <h6 class="font-cyber text-cyan-400 text-lg font-bold animate-glow">👥 RIVAL ANALYSIS</h6>
      </div>
      <div class="space-y-3">
        ${Object.entries(stats.opponents)
          .sort(([,a]: any, [,b]: any) => b.matches - a.matches)
          .slice(0, 5)
          .map(([name, data]: any, index) => {
            const winRate = Math.round((data.wins / data.matches) * 100);
            const borders = ['border-cyber-blue', 'border-cyber-green', 'border-cyber-pink', 'border-yellow-400', 'border-purple-400'];
            const shadows = ['shadow-neon-blue', 'shadow-neon-green', 'shadow-neon-pink', '', ''];
            const ranks = ['🥇', '🥈', '🥉', '🏅', '🎖️'];
            const rankTitles = ['PRIME TARGET', 'MAJOR RIVAL', 'KNOWN ENEMY', 'REGULAR FOE', 'OCCASIONAL MATCH'];
            
            return `
              <div class="flex items-center justify-between p-4 bg-cyber-dark rounded-lg border-2 ${borders[index]} ${shadows[index]} hover:bg-opacity-80 transition-all">
                <div class="flex items-center">
                  <span class="text-3xl mr-4">${ranks[index]}</span>
                  <div>
                    <div class="text-white font-cyber font-bold text-lg">${name}</div>
                    <div class="text-gray-400 font-cyber text-xs">${rankTitles[index]}</div>
                    <div class="text-gray-500 font-cyber text-xs">${data.matches} ENCOUNTERS</div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-cyan-400 font-cyber font-bold text-xl">${data.wins}W</div>
                  <div class="text-xs font-cyber ${winRate >= 50 ? 'text-cyber-green' : 'text-cyber-pink'}">${winRate}%</div>
                </div>
              </div>
            `;
          }).join('')}
      </div>
    </div>
  `;
  
  modal.classList.remove('hidden');
}

showMatchHistoryModal(): void {
  const modal = document.getElementById('matchHistoryModal');
  const tbody = document.getElementById('fullMatchHistoryTable');
  
  if (!modal || !tbody) return;
  
  const storedMatches = JSON.parse(localStorage.getItem('userMatchHistory') || '[]');
  const currentUser = app.getUsername();
  
  tbody.innerHTML = '';
  
  storedMatches.forEach((match: any) => {
    const tr = document.createElement('tr');
    
    let userWon = false;
    let opponent = '';
    let score = '';
    
    if (match.match_type === 'multiplayer') {
      const userTeam = match.teams?.find((team: any) => 
        team.players.some((player: any) => player.player_name === currentUser)
      );
      const opponentTeam = match.teams?.find((team: any) => team.id !== userTeam?.id);
      
      userWon = userTeam && opponentTeam ? userTeam.score > opponentTeam.score : false;
      opponent = `${userTeam?.name || 'Team 1'} vs ${opponentTeam?.name || 'Team 2'}`;
      score = `${userTeam?.score || 0} - ${opponentTeam?.score || 0}`;
    } else {
      const isPlayer1 = match.player1_name === currentUser;
      userWon = isPlayer1 ? match.player1_score > match.player2_score : match.player2_score > match.player1_score;
      opponent = isPlayer1 ? match.player2_name : match.player1_name;
      score = `${match.player1_score || 0} - ${match.player2_score || 0}`;
    }
    
    if (userWon) tr.classList.add('match-win');
    else tr.classList.add('match-loss');
    
    const matchType = match.match_type === 'tournament' ? 'Tournament' :
                     match.match_type === '1vAi' ? 'vs AI' :
                     match.match_type === 'multiplayer' ? 'Multiplayer' : '1v1';
    
    tr.innerHTML = `
      <td class="px-4 py-3 text-sm">${new Date(match.created_at).toLocaleDateString()}</td>
      <td class="px-4 py-3">${matchType}</td>
      <td class="px-4 py-3">${opponent}</td>
      <td class="px-4 py-3">${score}</td>
      <td class="px-4 py-3">${userWon ? '🏆 Win' : '❌ Loss'}</td>
      <td class="px-4 py-3">${match.status}</td>
    `;
    
    tbody.appendChild(tr);
  });
  
  modal.classList.remove('hidden');
}
  
  // ✅ ADD these new methods:
async fetchUserMatchHistory(userId: string, page: number = 1, limit: number = 50): Promise<any[]> {
  try {
    // API endpoint with pagination parameters
    const response = await this.fetchWithAutoRefresh(
      `${this.baseURL}/users/${userId}/matches?page=${page}&limit=${limit}`
    );
    if (!response.ok) return [];
    
    const data = await response.json();
    
    // The API returns an array directly, not wrapped in a matches property
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching match history:', error);
    return [];
  }
}

  async fetchUserTournamentHistory(userId: string): Promise<TournamentHistory[]> {
    try {
      // Get all tournaments the user participated in
      const response = await this.fetchWithAutoRefresh(`${this.baseURL}/users/${userId}/tournaments`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.tournaments || [];
    } catch (error) {
      console.error('Error fetching tournament history:', error);
      return [];
    }
  }

    // ❌ UPDATE this section in calculateUserStats:
calculateUserStats(matchHistory: any[], tournamentHistory: TournamentHistory[], userId: string): UserGameplayStats {
  const stats: UserGameplayStats = {
    totalMatches: 0,
    tournamentMatches: 0,
    regularMatches: 0,
    multiplayerMatches: 0,
    aiMatches: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    tournamentsPlayed: tournamentHistory.length,
    tournamentsWon: 0
  };

  const currentUser = app.getUsername();

  // Process matches based on your API structure
  matchHistory.forEach(match => {
    // Skip cancelled matches
    if (match.status === 'cancelled') return;
    
    stats.totalMatches++;
    
    switch(match.match_type) {
      case 'tournament':
        stats.tournamentMatches++;
        break;
      case 'multiplayer':
        stats.multiplayerMatches++;
        break;
      case '1vAi':
        stats.aiMatches++;
        break;
      default:
        stats.regularMatches++;
    }

    // Determine winner based on match type
    let userWon = false;
    
    if (match.match_type === 'multiplayer') {
      // For multiplayer, check if user's team won
      const userTeam = match.teams?.find((team: any) => 
        team.players.some((player: any) => player.user_id === parseInt(userId))
      );
      if (userTeam) {
        const opponentTeam = match.teams?.find((team: any) => team.id !== userTeam.id);
        userWon = userTeam.score > (opponentTeam?.score || 0);
      }
    } else {
      // For regular/tournament matches
      if (match.player1_name === currentUser) {
        userWon = match.player1_score > match.player2_score;
      } else if (match.player2_name === currentUser) {
        userWon = match.player2_score > match.player1_score;
      }
    }

    if (userWon) {
      stats.wins++;
    } else {
      stats.losses++;
    }
  });

  // Calculate win rate
  stats.winRate = stats.totalMatches > 0 ? Math.round((stats.wins / stats.totalMatches) * 100) : 0;

  return stats;
}
  populateProfileData(userData?: any, matchHistory: any[] = [], tournamentHistory: TournamentHistory[] = []): void {
    
    const user = userData.data || app.state.user;
        
    console.log('populate with userData:', userData.data, "app user data: ", app.state.user);

    if (!user) {
      console.warn('No user data found, cannot populate profile data');
      return;
    }

    //get full user Data

    if (this.profileForm.profileUsername)
      this.profileForm.profileUsername.textContent = user.username || app.getUsername() || 'Username';
    
    if (this.profileForm.profileAvatar) {
      // First check localStorage for cached profile picture
      const cachedImage = this.getProfilePictureFromLocalStorage();
      
      if (cachedImage) {
        this.profileForm.profileAvatar.src = cachedImage;
        console.log('Using cached profile picture from localStorage');
      } else if (user.profile_picture) {
        // Use server URL if no cached version
        this.profileForm.profileAvatar.src = user.profile_picture;
      } else {
        // Fallback to default
        this.profileForm.profileAvatar.src = app.getUserImg() || 'src/assets/icons/user.png';
      }
    }
    
    if (this.profileForm.displayNameField)
      this.profileForm.displayNameField.value = user.username || app.getUsername() || '';
    
    // if (this.profileForm.emailField)
    //   console.log('Setting email field value:', app.state.user!.email,'another way : ', app.getEmail());
    //   this.profileForm.emailField!.value = app.state.user!.email || app.getEmail() || '';
    
    // if (this.profileForm.statsTotalGames)
    //   this.profileForm.statsTotalGames.textContent = app.getTotalGamesPlayed().toString() || '0';
    
    // if (this.profileForm.statsWins)
    //   this.profileForm.statsWins.textContent = app.getTotalWins().toString() || '0';
    
    // if (this.profileForm.statsLosses)
    //   this.profileForm.statsLosses.textContent = app.getTotalLosses().toString() || '0';
    
    // if (this.profileForm.statsWinRate)
    //   this.profileForm.statsWinRate.textContent = app.getWinRate().toString() || '0';
    
    // if (this.profileForm.statsRank)
    //   this.profileForm.statsRank.textContent = app.getRank() || 'Beginner';
    // ✅ WITH this enhanced version:
  const userStats = this.calculateUserStats(matchHistory, tournamentHistory, userData?.id?.toString() || app.state.user?.id?.toString() || '');

  if (this.profileForm.statsTotalGames)
    this.profileForm.statsTotalGames.textContent = userStats.totalMatches.toString();

  if (this.profileForm.statsWins)
    this.profileForm.statsWins.textContent = userStats.wins.toString();

  if (this.profileForm.statsLosses)
    this.profileForm.statsLosses.textContent = userStats.losses.toString();

  if (this.profileForm.statsWinRate)
    this.profileForm.statsWinRate.textContent = `${userStats.winRate}%`;
      this.update2FAUI(user);
      this.renderMatchHistory(matchHistory, tournamentHistory, userData?.id || app.state.user?.id);
    }

  setupProfilePictureHandlers(): void {
    const { uploadBtn, removeBtn, profilePictureInput, profileAvatar } = this.profileForm;

    if (!uploadBtn || !profilePictureInput) return;

    uploadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      profilePictureInput.click();
    });

    profilePictureInput.addEventListener('change', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        components.showToast('error', 'File Too Large', 'Please select an image smaller than 5MB');
        return;
      }
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await this.fetchWithAutoRefresh(
          `${this.baseURL}/users/uploads/profile-picture`,
          {
            method: 'POST',
            credentials: 'include',
            body: formData,
          }
        );

        if (!res.ok) throw new Error('Failed to upload profile picture');

        const data = await res.json();
        // Convert file to base64 and save to localStorage
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64String = event.target?.result as string;
          this.saveProfilePictureToLocalStorage(base64String);
          
          if (profileAvatar) {
            profileAvatar.src = base64String;
          }
          
          // Update user state if available
          if (app.state.user) {
            app.state.user.profile_picture = data.url;
            localStorage.setItem('user', JSON.stringify(app.state.user));
          }
        };
        reader.readAsDataURL(file);
        
        components.showToast('success', 'Success', 'Profile picture updated successfully');
      } catch (err) {
        console.error('Error uploading profile picture:', err);
        components.showToast('error', 'Upload Error', 'Failed to upload profile picture');
      }
    });

    if (removeBtn) {
      removeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        try {
          const res = await this.fetchWithAutoRefresh(
            `${this.baseURL}/users/uploads/profile-picture`,
            {
              method: 'DELETE',
              credentials: 'include',
            }
          );

          if (!res.ok) throw new Error('Failed to remove profile picture');

          // Remove from localStorage
          this.removeProfilePictureFromLocalStorage();

          if (profileAvatar) {
            profileAvatar.src = 'src/assets/icons/user.png';
          }

          // Update user state if available
          if (app.state.user) {
            app.state.user.profile_picture = 'src/assets/icons/user.svg';
            localStorage.setItem('user', JSON.stringify(app.state.user));
          }
          
          components.showToast('success', 'Success', 'Profile picture removed successfully');
        } catch (err) {
          console.error('Error removing profile picture:', err);
          components.showToast('error', 'Remove Error', 'Failed to remove profile picture');
        }
      });
    }
  }
saveProfilePictureToLocalStorage(base64String: string): void {
    try {
      const userId = app.state.user?.id || 'default';
      const storageKey = `profile_picture_${userId}`;
      
      // Store with timestamp for cache management
      const profilePictureData = {
        image: base64String,
        timestamp: Date.now(),
        userId: userId
      };
      
      localStorage.setItem(storageKey, JSON.stringify(profilePictureData));
      
      // Also store the current active profile picture key
      localStorage.setItem('current_profile_picture_key', storageKey);
      
      console.log('Profile picture saved to localStorage');
    } catch (error) {
      console.error('Failed to save profile picture to localStorage:', error);
      // Handle localStorage quota exceeded
      if (error instanceof DOMException && error.code === 22) {
        components.showToast('warning', 'Storage Full', 'Unable to cache profile picture locally');
      }
    }
  }

  removeProfilePictureFromLocalStorage(): void {
    try {
      const userId = app.state.user?.id || 'default';
      const storageKey = `profile_picture_${userId}`;
      
      localStorage.removeItem(storageKey);
      localStorage.removeItem('current_profile_picture_key');
      
      console.log('Profile picture removed from localStorage');
    } catch (error) {
      console.error('Failed to remove profile picture from localStorage:', error);
    }
  }

  getProfilePictureFromLocalStorage(): string | null {
    try {
      console.log('Checking localStorage for profile picture...', app.state.user);
      const userId = app.state.user?.id || app.state.user?.id || 'default';
      const storageKey = `profile_picture_${userId}`;
      
      const savedData = localStorage.getItem(storageKey);
      if (!savedData) return null;
      
      const profilePictureData = JSON.parse(savedData);
      
      // Check if data is less than 7 days old (optional cache expiration)
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - profilePictureData.timestamp > sevenDaysInMs) {
        this.removeProfilePictureFromLocalStorage();
        return null;
      }
      
      return profilePictureData.image;
    } catch (error) {
      console.error('Failed to get profile picture from localStorage:', error);
      return null;
    }
  }

 

  async fetchWithAutoRefresh(url: string, options: RequestInit = {}): Promise<Response> {
    // Implement your fetch with auto refresh logic here
    // This should handle authentication and token refresh
    return fetch(url, {
      credentials: 'include',
      ...options
    });
  }
  
  update2FAUI(userData?: any): void {
    console.log('Updating 2FA UI with userData:', userData, "app user data: ", app.state.user);
    const user = userData || app.state.user;
    const is2FAEnabled = user?.two_factor_enabled || user?.two_factor_enabled|| app.get2FAState() || false;
    console.log('2FA Enabled:', is2FAEnabled);
    const twoFAStatus = document.getElementById('twoFAStatus');
    const enableTwoFABtn = document.getElementById('enableTwoFABtn');
    const disableTwoFABtn = document.getElementById('disableTwoFABtn');
    
    if (twoFAStatus) {
      if (is2FAEnabled) {
        twoFAStatus.textContent = 'Enabled';
        twoFAStatus.className = 'font-cyber bg-cyber-green text-cyber-dark px-2 py-1 rounded text-sm';
      } else {
        twoFAStatus.textContent = 'Disabled';
        twoFAStatus.className = 'font-cyber bg-cyber-pink text-cyber-dark px-2 py-1 rounded text-sm';
      }
    }
    
    if (enableTwoFABtn && disableTwoFABtn) {
      if (is2FAEnabled) {
        enableTwoFABtn.style.display = 'none';
        disableTwoFABtn.style.display = 'block';
        disableTwoFABtn.classList.remove('hidden');
      } else {
        enableTwoFABtn.style.display = 'block';
        enableTwoFABtn.classList.remove('hidden');
        disableTwoFABtn.style.display = 'none';
        disableTwoFABtn.classList.add('hidden');
      }
    }
  }
  
init2FA(): void {
    const modal = document.getElementById('twoFAModal');
    const enableBtn = document.getElementById('enableTwoFABtn');
    const disableBtn = document.getElementById('disableTwoFABtn');
    const closeBtn = document.getElementById('twoFACloseButton');
    const form = document.getElementById('twoFAForm');
    
    if (enableBtn) {
      enableBtn.addEventListener('click', (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        
        if (modal) {
          const qrSection = document.getElementById('qrCodeSection');
          if (qrSection) {
            qrSection.classList.remove('hidden');
            qrSection.style.display = 'block';
          }
          
          modal.classList.remove('hidden');
          modal.style.display = 'flex';
          
          this.setup2FA();
        }
        
        return false;
      });
    }
    
    if (disableBtn) {
      disableBtn.addEventListener('click', (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        
        if (modal) {
          const qrSection = document.getElementById('qrCodeSection');
          if (qrSection) {
            qrSection.classList.add('hidden');
            qrSection.style.display = 'none';
          }
          
          // Update modal for disable flow
          const modalTitle = modal.querySelector('.two-fa-title');
          if (modalTitle) modalTitle.textContent = 'Disable Two-Factor Authentication';
          
          const buttonText = modal.querySelector('[data-button-text]');
          if (buttonText) buttonText.textContent = 'Disable 2FA';
          
          modal.classList.remove('hidden');
          modal.style.display = 'flex';
        }
        
        return false;
      });
    }
    
    if (form) {
      form.addEventListener('submit', (e: Event) => {
        e.preventDefault();
        
        if (enableBtn && !enableBtn.classList.contains('hidden') && enableBtn.style.display !== 'none') 
          this.verify2FACode();
        else 
          this.disable2FA();
      });
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (modal) {
          modal.classList.add('hidden');
          modal.style.display = 'none';
          this.resetModalState();
        }
      });
    }
    
    if (modal) {
      modal.addEventListener('click', (e: MouseEvent) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
          modal.style.display = 'none';
          this.resetModalState();
        }
      });
    }
  }

  resetModalState(): void {
    const modal = document.getElementById('twoFAModal');
    if (!modal) return;

    const modalTitle = modal.querySelector('.two-fa-title');
    if (modalTitle) modalTitle.textContent = 'Two-Factor Authentication';

    const buttonText = modal.querySelector('[data-button-text]');
    if (buttonText) buttonText.textContent = 'Verify';

    const codeInput = document.getElementById('twoFACode') as HTMLInputElement;
    if (codeInput) codeInput.value = '';

    const errorElement = document.getElementById('twofa-error');
    if (errorElement) {
      errorElement.classList.add('hidden');
      errorElement.style.display = 'none';
    }
  }
  
 async setup2FA(): Promise<void> {
    const qrCodeContainer = document.getElementById('qrCodeContainer');
    const secretKeyElement = document.getElementById('secretKey');
    const errorElement = document.getElementById('twofa-error');
    
    if (!qrCodeContainer || !secretKeyElement) {
      console.error('setup2FA: Required elements not found');
      return;
    }
    
    qrCodeContainer.innerHTML = `<div class="animate-spin text-cyber-blue h-12 w-12 border-4 border-cyber-blue border-t-transparent rounded-full mx-auto" role="status">
      <span class="sr-only">Loading...</span>
    </div>`;
    secretKeyElement.textContent = 'Loading...';
    
    if (errorElement) {
      errorElement.classList.add('hidden');
      errorElement.style.display = 'none';
    }
    
    try {
      const response = await this.fetchWithAutoRefresh(`${this.baseURL}/auth/2fa/setup`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to start 2FA setup');
      }

      const data = await response.json();
      
      if (!data || !data.qrCode) {
        throw new Error(data.error || 'Failed to set up 2FA');
      }
      
      const qrImg = document.createElement('img');
      qrImg.src = data.qrCode;
      qrImg.alt = 'QR Code for 2FA';
      qrImg.className = 'max-w-full';
      
      qrCodeContainer.innerHTML = '';
      qrCodeContainer.appendChild(qrImg);
      
      if (data.secret) {
        secretKeyElement.textContent = data.secret;
      }
    } catch (error: any) {
      qrCodeContainer.innerHTML = '<div class="text-cyber-pink">Failed to load QR code</div>';
      secretKeyElement.textContent = 'Error loading secret key';
      
      if (errorElement) {
        errorElement.textContent = error.message || 'Failed to set up 2FA';
        errorElement.classList.remove('hidden');
        errorElement.style.display = 'block';
      }
    }
  }
  
  async verify2FACode(): Promise<void> {
    const codeInput = document.getElementById('twoFACode') as HTMLInputElement | null;
    const errorElement = document.getElementById('twofa-error');
    const submitButton = document.querySelector('#twoFAForm button[type="submit"]') as HTMLButtonElement;
    
    if (!codeInput) return;
    
    const code = codeInput.value;
    
    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
      if (errorElement) {
        errorElement.textContent = 'Please enter a valid 6-digit code';
        errorElement.classList.remove('hidden');
        errorElement.style.display = 'block';
      }
      return;
    }
    
    utils.setFormLoading(submitButton, true);
    
    try {
      const response = await this.fetchWithAutoRefresh(`${this.baseURL}/auth/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: code }),
      });

      if (!response.ok) {
        throw new Error('Invalid verification code');
      }

      const data = await response.json();
      
      utils.setFormLoading(submitButton, false);
      
      if (data.success) {
        if (app.state.user) {
          app.state.user.is_two_factor_enabled = true;
          localStorage.setItem('user', JSON.stringify(app.state.user));
     
        }
        
        this.update2FAUI();
        
        components.showToast('success', '2FA Enabled', 'Two-factor authentication has been successfully enabled.');
        
        const modal = document.getElementById('twoFAModal');
        if (modal) {
          modal.classList.add('hidden');
          modal.style.display = 'none';
        }

        // Reload profile data to update UI
        setTimeout(() => {
          this.loadProfileData();
        }, 1500);
      } else {
        if (errorElement) {
          errorElement.textContent = data.error || 'Verification failed';
          errorElement.classList.remove('hidden');
          errorElement.style.display = 'block';
        }
      }
    } catch (error: any) {
      components.showToast('error', '2FA Verification Error', error.message || 'Failed to verify 2FA');
      
      utils.setFormLoading(submitButton, false);
      
      if (errorElement) {
        errorElement.textContent = error.message || 'Failed to enable 2FA';
        errorElement.classList.remove('hidden');
        errorElement.style.display = 'block';
      }
    }
  }
  
  async disable2FA(): Promise<void> {
    const codeInput = document.getElementById('twoFACode') as HTMLInputElement | null;
    const errorElement = document.getElementById('twofa-error');
    const submitButton = document.querySelector('#twoFAForm button[type="submit"]') as HTMLButtonElement;
    
    if (!codeInput) return;
    
    const code = codeInput.value;
    
    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
      if (errorElement) {
        errorElement.textContent = 'Please enter a valid 6-digit code';
        errorElement.classList.remove('hidden');
        errorElement.style.display = 'block';
      }
      return;
    }
    
    utils.setFormLoading(submitButton, true);
    
    try {
      const response = await this.fetchWithAutoRefresh(`${this.baseURL}/auth/2fa/disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: code }),
      });

      if (!response.ok) {
        throw new Error('Failed to disable 2FA');
      }

      const data = await response.json();
      
      utils.setFormLoading(submitButton, false);
      
      if (data.success) {
        if (app.state.user) {
          app.state.user.is_two_factor_enabled = false;
          localStorage.setItem('user', JSON.stringify(app.state.user));
        }
        
        this.update2FAUI();
        
        components.showToast('success', '2FA Disabled', 'Two-factor authentication has been successfully disabled.');
        
        const modal = document.getElementById('twoFAModal');
        if (modal) {
          modal.classList.add('hidden');
          modal.style.display = 'none';
        }

        this.resetModalState();
        this.loadProfileData();
      } else {
        if (errorElement) {
          errorElement.textContent = data.error || 'Failed to disable 2FA';
          errorElement.classList.remove('hidden');
          errorElement.style.display = 'block';
        }
      }
    } catch (error: any) {
      components.showToast('error', '2FA Disable Error', error.message || 'Failed to disable 2FA');
      
      utils.setFormLoading(submitButton, false);
      
      if (errorElement) {
        errorElement.textContent = error.message || 'Failed to disable 2FA';
        errorElement.classList.remove('hidden');
        errorElement.style.display = 'block';
      }
    }
  }


  // ✅ WITH this enhanced version:
  renderMatchHistory(matchHistory: any[] = [], tournamentHistory: TournamentHistory[] = [], userID : number): void {
    const tableBody = document.getElementById('matchHistoryTable');
    if (!tableBody) return;
    
    const table = tableBody.closest('table');
    if (!table) return;
    
    const tableHead = table.querySelector('thead');
    if (!tableHead) return;

    tableHead.innerHTML = `<tr>
      <th class="font-cyber text-cyber-blue px-4 py-3 text-left">Date</th>
      <th class="font-cyber text-cyber-blue px-4 py-3 text-left">Type</th>
      <th class="font-cyber text-cyber-blue px-4 py-3 text-left">Vs</th>
      <th class="font-cyber text-cyber-blue px-4 py-3 text-left">Score</th>
      <th class="font-cyber text-cyber-blue px-4 py-3 text-left">Result</th>
    </tr>`;

    const currentUser = app.getUsername();
    tableBody.innerHTML = '';

    // Combine and sort all matches by date
    const allMatches : any = [];
    
    // Add regular matches
  matchHistory.forEach(match => {
    // Skip cancelled matches in display
    if (match.status === 'cancelled') return;
    
    allMatches.push({
      ...match,
      source: 'regular',
      date: new Date(match.created_at)
    });
  });


    // Add tournament matches
    tournamentHistory.forEach(tournament => {
      // Add tournament header
      allMatches.push({
        type: 'tournament-header',
        tournament_id: tournament.id,
        winner: tournament.winner,
        participants: tournament.participants,
        date: new Date(tournament.created_at),
        source: 'tournament-header'
      });

      // Add each match in the tournament
      tournament.matches.forEach(match => {
        allMatches.push({
          ...match,
          source: 'tournament',
          tournament_id: tournament.id,
          tournament_winner: tournament.winner,
          date: new Date(match.created_at || match.date)
        });
      });
    });

    // Sort by date (newest first)
    allMatches.sort((a : any, b : any) => b.date.getTime() - a.date.getTime());

    if (allMatches.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-gray-400">No match history available</td></tr>`;
      return;
    }

    // Render all matches
    allMatches.forEach((match : any )=> {
      if (match.source === 'tournament-header') {
        // Tournament header row (existing code)
      } else {
        // Regular match or tournament match row
        const tr = document.createElement('tr');
        
        // Determine winner and style
        let userWon = false;
        let opponent = '';
        let score = '';
        
        if (match.match_type === 'multiplayer') {
          // Handle multiplayer matches
          const userTeam = match.teams?.find((team: any) => 
            team.players.some((player: any) => player.user_id === parseInt(userID.toString()))
          );
          const opponentTeam = match.teams?.find((team: any) => team.id !== userTeam?.id);
          
          userWon = userTeam && opponentTeam ? userTeam.score > opponentTeam.score : false;
          opponent = `${userTeam?.name || 'Team 1'} vs ${opponentTeam?.name || 'Team 2'}`;
          score = `${userTeam?.score || 0} - ${opponentTeam?.score || 0}`;
        } else {
          // Handle regular/tournament matches
          if (match.player1_name === currentUser) {
            userWon = match.player1_score > match.player2_score;
            opponent = match.player2_name;
          } else {
            userWon = match.player2_score > match.player1_score;
            opponent = match.player1_name;
          }
          score = `${match.player1_score || 0} - ${match.player2_score || 0}`;
        }
        
        // Style based on result
        if (userWon) {
          tr.classList.add('match-win');
        } else {
          tr.classList.add('match-loss');
        }

        const matchType = match.source === 'tournament' ? 'Tournament' : 
                        match.match_type === '1vAi' ? 'vs AI' :
                        match.match_type === 'multiplayer' ? 'Multiplayer' : '1v1';
        
        const result = userWon ? '🏆 Win' : '❌ Loss';
        const date = match.date.toLocaleDateString();

        tr.innerHTML = `
          <td class="px-4 py-3 text-sm">${date}</td>
          <td class="px-4 py-3">${matchType}</td>
          <td class="px-4 py-3">${opponent}</td>
          <td class="px-4 py-3">${score}</td>
          <td class="px-4 py-3">${result}</td>
        `;
        tableBody.appendChild(tr);
      }
    });
}
// Render tournament matches grouped with a blank separator before each
renderTournamentMatches(tableBody: HTMLElement): void {
  const currentUser = app.getUsername();
  const tournaments = app.state.user?.tournaments || [];
  tournaments.forEach((tournament: Tournament) => {
    // Tournament summary row (ID and winner)
    const summary = document.createElement('tr');
    summary.classList.add('bg-cyber-blue', 'bg-opacity-20');
    summary.innerHTML = `
      <td colspan="4" class="text-center font-cyber text-cyber-blue px-4 py-3">
        Tournament #${tournament.tournament_id} — Winner: ${tournament.winner}
      </td>`;
    tableBody.appendChild(summary);
    // Add each tournament match
    tournament.matches.forEach(match => {
      const entry = utils.makeEntry(match, currentUser);
      const tr = document.createElement('tr');
      // Style all tournament match rows by the tournament winner
      if (tournament.winner === currentUser) tr.classList.add('match-win');
      else tr.classList.add('match-loss');
      tr.innerHTML = `
        <td class="px-4 py-3">${entry.type}</td>
        <td class="px-4 py-3">${entry.vs}</td>
        <td class="px-4 py-3">${entry.score}</td>
        <td class="px-4 py-3">${tournament.winner}</td>
      `;
      tableBody.appendChild(tr);
    });
  });
}

}
export default new Profile();
export { ProfileForm, MatchEntry };