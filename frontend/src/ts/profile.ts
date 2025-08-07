import api from './api';
import app from './app';
import utils from './utils';
import components from './components';
import { CONFIG, VALIDATION_INPUTS } from './constants';
import { baseURL } from './constants';
import toastManager from './toastManager';
import game from './game';
import login from './login';
// Interface for profile form elements
interface ProfileForm {
  profileUsername?: HTMLElement | null;
  profileAvatar?: HTMLImageElement | null;
  displayNameField?: HTMLInputElement | null;
  emailField?: HTMLInputElement | null;
  passwordField?: HTMLInputElement | null;
  currentPasswordField?: HTMLInputElement | null;
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
  user: any;
 
  
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
      emailField: document.getElementById('settingEmail') as HTMLInputElement | null,
      passwordField: document.getElementById('settingPassword') as HTMLInputElement | null,
      currentPasswordField: document.getElementById('currentPassword') as HTMLInputElement | null,
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
    this.setupUpdateHandlers(); 

    // if (this.profileForm.displayNameField) 
    //   utils.setupInputField(this.profileForm.displayNameField, 'username', components);
    
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
      
    
      //  let usertest =await api.getUserById('10');
      //   console.log('User test data:', usertest);
      let smalluserData;
      // if (userId) {
      //   // Loading another user's profile
      //   const userRes = await this.fetchWithAutoRefresh(`${this.baseURL}/users/${userId}`);
      //   if (!userRes.ok) throw new Error('Failed to fetch user data');
      //   userData = await userRes.json();
      // } else {
      //   // Loading current user's profile
        smalluserData = await authRes.json();
        console.log('Current user data in the profile: ', smalluserData.user.user);
        smalluserData = smalluserData.user.user;
      // }



      // ✅ WITH this expanded version:
    
      let userFullData = await api.getUserById(smalluserData.id);
      if (!userFullData.success) {
        toastManager.error( app.getUsername() ,userFullData.error || 'Failed to fetch user data');
        return;
      }
      this.user = userFullData.data;
      console.log('Full user data:in porfile', userFullData);
      // Fetch user's match history and tournaments
      const [matchHistory] = await Promise.all([
        this.fetchUserMatchHistory(this.user.id),
        // this.fetchUserTournamentHistory(userFullData.data['id'] || userData.id)
      ]);
      localStorage.setItem('userMatchHistory', JSON.stringify(matchHistory));
      console.log('Match history:', matchHistory);
      // console.log('Tournament history:', tournamentHistory);
      this.populateProfileData(userFullData, matchHistory);
      
    } catch (err) {
      console.error('Error loading profile:', err);
      // components.showToast('error', 'Profile Error', 'Failed to load profile data');
      toastManager.error(app.getUsername(), 'Failed to load profile data');
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

// Add this method to show individual game session details
showGameSessionModal(matchId: string): void {
  const modal = document.getElementById('gameSessionModal');
  const content = document.getElementById('gameSessionContent');
  
  if (!modal || !content) return;
  
  const storedMatches = JSON.parse(localStorage.getItem('userMatchHistory') || '[]');
  const match = storedMatches.find((m: any) => m.id === parseInt(matchId));
  
  if (!match) return;
  
  const sessionStats = this.analyzeGameSession(match);
  
  content.innerHTML = `
    <!-- Individual Game Session Analysis -->
    <div class="space-y-6">
      <!-- Session Overview -->
      <div class="cyber-container">
        <h6 class="font-cyber text-cyber-blue text-lg mb-4">🎮 Session Overview</h6>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="cyber-card text-center grid-cols-4 col-span-4">
            <div class="text-2xl font-cyber text-cyber-green">${Number.isNaN(sessionStats.totalPoints) ? `${0}` : sessionStats.totalPoints }</div>
            <div class="text-xs text-gray-400">Total Pointss</div>
          </div>
          <div class="cyber-card text-center">
            <div class="text-2xl font-cyber text-cyber-pink">${sessionStats.longestRally}</div>
            <div class="text-xs text-gray-400">Longest Rally</div>
          </div>
          <div class="cyber-card text-center">
            <div class="text-2xl font-cyber text-cyber-yellow">${sessionStats.avgPointDuration}</div>
            <div class="text-xs text-gray-400">Avg Point Time</div>
          </div>
        </div>
      </div>
      
      <!-- Point-by-Point Breakdown -->
      <div class="cyber-container">
        <h6 class="font-cyber text-cyber-green text-lg mb-4">📊 Point Progression</h6>
        <div class="bg-cyber-dark p-4 rounded">
          ${this.generatePointProgressionChart(match)}
        </div>
      </div>
      
      <!-- Performance Metrics -->
      <div class="cyber-container">
        <h6 class="font-cyber text-cyber-pink text-lg mb-4">⚡ Performance Metrics</h6>
        <div class="grid grid-cols-1 md:grid-cols-1 gap-4">
          <div class="space-y-3">
            <div class="flex justify-between">
              <span>Scoring Efficiency: </span>
              <span class="text-cyber-green">${Number.isNaN(sessionStats.scoringEfficiency) ? `0` : sessionStats.scoringEfficiency}%</span>
            </div>
            <div class="flex justify-between">
              <span>Defensive Rating:</span>
              <span class="text-cyber-blue">${sessionStats.defensiveRating}</span>
            </div>
            <div class="flex justify-between">
              <span>Comeback Factor:</span>
              <span class="text-cyber-yellow">${sessionStats.comebackFactor}</span>
            </div>
          </div>
          <div class="space-y-3">
            <div class="flex justify-between">
              <span>Momentum Shifts:</span>
              <span class="text-cyber-pink">${sessionStats.momentumShifts}</span>
            </div>
            <div class="flex justify-between">
              <span>Consistency Score:</span>
              <span class="text-cyber-purple">${sessionStats.consistency}</span>
            </div>
            <div class="flex justify-between">
              <span>Pressure Performance:</span>
              <span class="text-cyber-green">${sessionStats.pressurePerformance}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  modal.classList.remove('hidden');
}




analyzeGameSession(match: any): any {
  const currentUser = app.getUsername();
  const isPlayer1 = match.player1_name === currentUser;
  const userScore = isPlayer1 ? match.player1_score : match.player2_score;
  const opponentScore = isPlayer1 ? match.player2_score : match.player1_score;
  
  return {
    duration: this.calculateMatchDuration(match),
    totalPoints: userScore + opponentScore,
    longestRally: Math.max(userScore, opponentScore), // Simulate
    avgPointDuration: "45s", // Simulate
    scoringEfficiency: Math.round((userScore / (userScore + opponentScore)) * 100),
    defensiveRating: Math.round(Math.random() * 100),
    comebackFactor: this.calculateComebackFactor(userScore, opponentScore),
    momentumShifts: Math.floor(Math.random() * 5) + 1,
    consistency: Math.round(Math.random() * 100),
    pressurePerformance: Math.round(Math.random() * 100)
  };
}

// Add these methods for better user interaction:
generatePointProgressionChart(match: any): string {
  const currentUser = app.getUsername();
  const isPlayer1 = match.player1_name === currentUser;
  const userScore = isPlayer1 ? match.player1_score : match.player2_score;
  const opponentScore = isPlayer1 ? match.player2_score : match.player1_score;
  
  let html = '<div class="flex items-end space-x-2 h-32">';
  
  // Generate point progression bars
  for (let i = 1; i <= Math.max(userScore, opponentScore); i++) {
    const userHeight = i <= userScore ? 80 : 20;
    const opponentHeight = i <= opponentScore ? 80 : 20;
    
    html += `
      <div class="flex flex-col space-y-1">
        <div class="bg-cyber-blue w-4 rounded-t" style="height: ${userHeight}px" title="You: Point ${i}"></div>
        <div class="bg-cyber-pink w-4 rounded-b" style="height: ${opponentHeight}px" title="Opponent: Point ${i}"></div>
        <div class="text-xs text-center text-gray-400">${i}</div>
      </div>
    `;
  }
  
  html += '</div>';
  return html;
}

calculateMatchDuration(match: any): string {
  // Simulate match duration based on total points
  const totalPoints = (match.player1_score || 0) + (match.player2_score || 0);
  const minutes = Math.floor(totalPoints * 0.75) + Math.floor(Math.random() * 3);
  const seconds = Math.floor(Math.random() * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

calculateComebackFactor(userScore: number, opponentScore: number): string {
  const diff = Math.abs(userScore - opponentScore);
  if (diff <= 1) return "Close Match";
  if (diff <= 2) return "Moderate";
  return userScore > opponentScore ? "Dominant" : "Challenging";
}

calculateDetailedStats(matchHistory: any[], username:string | null): any {
  const currentUser = username || app.getUsername();
  const stats = {
    // Basic stats
    totalMatches: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    performanceOverTime: [] as any[],
    
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
      // const isPlayer1 = match.player1_name === currentUser;
      const isPlayer1 = true;
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

// generatePerformanceBars(recentMatches: any[]): string {
//   if (!recentMatches || recentMatches.length === 0) {
//     return '<div class="text-gray-400 text-xs flex items-center justify-center h-full">No recent matches</div>';
//   }
  
//   return recentMatches.map(match => {
//     const height = Math.random() * 60 + 20;
//     const color = match.result === 1 ? 'bg-cyber-green' : 'bg-cyber-pink';
//     const opponent = match.opponent || 'Unknown';
//     const score = match.score || '0-0';
//     return `<div class="${color} w-6 rounded-t opacity-80 hover:opacity-100 transition-opacity" style="height: ${height}px" title="${opponent}: ${score}"></div>`;
//   }).join('');
// }

showDetailedStatsModal(): void {
  const modal = document.getElementById('detailedStatsModal');
  const content = document.getElementById('detailedStatsContent');
  
  if (!modal || !content) return;
  
  // Get current match history (you'll need to store this from loadProfileData)
  const storedMatches = JSON.parse(localStorage.getItem('userMatchHistory') || '[]');
  const stats = this.calculateDetailedStats(storedMatches, this.user.username || null);
  
  content.innerHTML = `
   <!-- CSS Charts Section -->
  <div class="col-span-full">
    <div class="cyber-container bg-gradient-to-br from-cyber-darker to-cyber-dark border-2 border-cyber-blue rounded-lg p-6 shadow-lg">
      <div class="flex items-center mb-6">
        <div class="w-3 h-3 bg-cyber-blue rounded-full mr-3 animate-pulse"></div>
        <h6 class="font-cyber text-cyber-blue text-xl font-bold animate-glow">📊 PERFORMANCE ANALYTICS</h6>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
        <!-- Win/Loss Pie Chart -->
        <div class="cyber-card">
          <h6 class="font-cyber text-cyber-green text-center mb-4">Win/Loss Distribution</h6>
          <div class="relative w-32 h-32 mx-auto">
            <div class="absolute inset-0 rounded-full border-8 border-cyber-green transform rotate-0" 
                 style="background: conic-gradient(#2DE2E6 0deg ${(stats.wins / (stats.wins + stats.losses)) * 360}deg, #FF2A6D ${(stats.wins / (stats.wins + stats.losses)) * 360}deg 360deg);"></div>
            <div class="absolute inset-4 bg-cyber-darker rounded-full flex items-center justify-center">
              <span class="font-cyber text-white text-sm">${stats.winRate}%</span>
            </div>
          </div>
          <div class="flex justify-center mt-4 space-x-4">
            <div class="flex items-center"><div class="w-3 h-3 bg-cyber-green mr-2"></div><span class="text-xs">Wins: ${stats.wins}</span></div>
            <div class="flex items-center"><div class="w-3 h-3 bg-cyber-pink mr-2"></div><span class="text-xs">Losses: ${stats.losses}</span></div>
          </div>
        </div>
        
        <!-- Match Type Bar Chart -->
        <div class="cyber-card">
          <h6 class="font-cyber text-cyber-blue text-center mb-4">Match Types</h6>
          <div class="space-y-3">
            <div class="flex items-center">
              <span class="text-xs w-16">Regular</span>
              <div class="flex-1 bg-cyber-dark h-4 rounded mx-2">
                <div class="bg-cyber-blue h-4 rounded" style="width: ${stats.regularMatches ? (stats.regularMatches / stats.totalMatches) * 100 : 0}%"></div>
              </div>
              <span class="text-xs w-8">${stats.regularMatches}</span>
            </div>
            <div class="flex items-center">
              <span class="text-xs w-16">AI</span>
              <div class="flex-1 bg-cyber-dark h-4 rounded mx-2">
                <div class="bg-cyber-pink h-4 rounded" style="width: ${stats.aiMatches ? (stats.aiMatches / stats.totalMatches) * 100 : 0}%"></div>
              </div>
              <span class="text-xs w-8">${stats.aiMatches}</span>
            </div>
            <div class="flex items-center">
              <span class="text-xs w-16">Multi</span>
              <div class="flex-1 bg-cyber-dark h-4 rounded mx-2">
                <div class="bg-cyber-yellow h-4 rounded" style="width: ${stats.multiplayerMatches ? (stats.multiplayerMatches / stats.totalMatches) * 100 : 0}%"></div>
              </div>
              <span class="text-xs w-8">${stats.multiplayerMatches}</span>
            </div>
            <div class="flex items-center">
              <span class="text-xs w-16">Tournament</span>
              <div class="flex-1 bg-cyber-dark h-4 rounded mx-2">
                <div class="bg-purple-400 h-4 rounded" style="width: ${stats.tournamentMatches ? (stats.tournamentMatches / stats.totalMatches) * 100 : 0}%"></div>
              </div>
              <span class="text-xs w-8">${stats.tournamentMatches}</span>
            </div>
          </div>
        </div>
        
       
        
        <!-- Top Opponents -->
        <div class="cyber-card md:col-span-2">
          <h6 class="font-cyber text-cyber-yellow text-center mb-4">Most Faced Opponents</h6>
          <div class="space-y-2">
            ${Object.entries(stats.opponents)
              .sort(([,a]: any, [,b]: any) => b.matches - a.matches)
              .slice(0, 5)
              .map(([name, data]: any, index) => {
                const winRate = Math.round((data.wins / data.matches) * 100);
                const colors = ['bg-cyber-blue', 'bg-cyber-green', 'bg-cyber-pink', 'bg-yellow-400', 'bg-purple-400'];
                return `
                  <div class="flex items-center justify-between p-2 bg-cyber-dark rounded">
                    <div class="flex items-center">
                      <div class="w-3 h-3 ${colors[index]} rounded-full mr-3"></div>
                      <span class="text-white text-sm font-cyber">${name}</span>
                    </div>
                    <div class="flex items-center space-x-4">
                      <span class="text-xs text-gray-400">${data.matches} games</span>
                      <span class="text-xs ${winRate >= 50 ? 'text-cyber-green' : 'text-cyber-pink'}">${winRate}% win</span>
                    </div>
                  </div>
                `;
              }).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>
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

      <!-- STACKED VERTICAL LAYOUT -->
      <div class="flex flex-col items-center gap-4">
        <!-- Joined -->
        <div class="w-full text-center p-4 bg-cyber-dark rounded-lg border border-cyber-blue shadow-neon-blue">
          <div class="text-3xl font-cyber font-bold text-cyber-blue animate-glow">
            ${stats.tournamentsParticipated.size}
          </div>
          <div class="text-sm font-cyber text-gray-300">PARTICIPATED</div>
        </div>

        <!-- Won -->
        <div class="w-full text-center p-4 bg-cyber-dark rounded-lg border border-cyber-green shadow-neon-green">
          <div class="text-3xl font-cyber font-bold text-cyber-green animate-glow">
            ${stats.tournamentsWon.size}
          </div>
          <div class="text-sm font-cyber text-gray-300">WON</div>
        </div>

        <!-- Win Rate -->
        <div class="w-full text-center">
          <div class="inline-flex items-center justify-center w-full px-6 py-3 bg-gradient-to-r from-cyber-blue to-cyber-green rounded-md border border-cyber-blue shadow-neon-blue">
            <span class="text-cyber-dark font-cyber font-bold text-lg">
              ${stats.tournamentsParticipated.size > 0
                ? Math.round((stats.tournamentsWon.size / stats.tournamentsParticipated.size) * 100)
                : 0}% WIN RATE
            </span>
          </div>
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
      <div class="flex items-center mb-6">
        <div class="w-3 h-3 bg-cyber-pink rounded-full mr-3 animate-pulse"></div>
        <h6 class="font-cyber text-cyber-pink text-lg font-bold animate-glow">🔥 STREAK DATA</h6>
      </div>

      <div class="flex flex-col space-y-4">
        <!-- Current Win Streak -->
        <div class="text-center p-4 bg-gradient-to-br from-cyber-green to-green-600 rounded-lg border border-cyber-green shadow-neon-green">
          <div class="text-3xl font-cyber font-bold text-white animate-glow">${stats.currentWinStreak}</div>
          <div class="text-sm font-cyber text-gray-100">CURRENT WIN</div>
        </div>

        <!-- Longest Win Streak -->
        <div class="text-center p-4 bg-gradient-to-br from-cyber-blue to-blue-600 rounded-lg border border-cyber-blue shadow-neon-blue">
          <div class="text-3xl font-cyber font-bold text-white animate-glow">${stats.longestWinStreak}</div>
          <div class="text-sm font-cyber text-gray-100">LONGEST WIN</div>
        </div>

        <!-- Current Loss Streak -->
        <div class="text-center p-4 bg-gradient-to-br from-cyber-pink to-red-600 rounded-lg border border-cyber-pink shadow-neon-pink">
          <div class="text-3xl font-cyber font-bold text-white">${stats.currentLossStreak}</div>
          <div class="text-sm font-cyber text-gray-100">CURRENT LOSS</div>
        </div>

        <!-- Longest Loss Streak -->
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
// Update showGameSessionModal to showGameSessionPopup
showGameSessionPopup(matchId: string, buttonElement: HTMLElement): void {
  const popup = document.getElementById('gameSessionPopup');
  const content = document.getElementById('gameSessionPopupContent');
  
  if (!popup || !content) return;
  
  const storedMatches = JSON.parse(localStorage.getItem('userMatchHistory') || '[]');
  const match = storedMatches.find((m: any) => m.id === parseInt(matchId));
  
  if (!match) return;
  
  const sessionStats = this.analyzeGameSession(match);
  
  // Compact popup content
  content.innerHTML = `
    <div class="space-y-3">
      <!-- Quick Stats -->
      <div class="grid grid-cols-1 gap-2">
        <div class="text-center p-2 bg-cyber-dark rounded border border-cyber-green ">
          <div class="text-lg font-cyber text-cyber-green">${Number.isNaN(sessionStats.totalPoints) ? `${0}` :sessionStats.totalPoints  }</div>
          <div class="text-xs text-gray-400">Total Points</div>
        </div>
      </div>
      
      <!-- Performance Bars -->
      <div class="space-y-2">
        <div class="flex justify-between text-xs">
          <span>Scoring Efficiency: </span>
          <span class="text-cyber-green">${Number.isNaN(sessionStats.scoringEfficiency) ? `${0}` : sessionStats.scoringEfficiency}%</span>
        </div>
        <div class="w-full bg-cyber-dark h-2 rounded">
          <div class="bg-cyber-green h-2 rounded transition-all duration-500" style="width: ${Number.isNaN(sessionStats.scoringEfficiency) ? `${0}` : sessionStats.scoringEfficiency}%"></div>
        </div>
        
        <div class="flex justify-between text-xs">
          <span>Defensive Rating</span>
          <span class="text-cyber-blue">${sessionStats.defensiveRating}</span>
        </div>
        <div class="w-full bg-cyber-dark h-2 rounded">
          <div class="bg-cyber-blue h-2 rounded transition-all duration-500" style="width: ${sessionStats.defensiveRating}%"></div>
        </div>
      </div>
      
      <!-- Mini Point Progression -->
      <div>
        <div class="text-xs text-gray-400 mb-2">Point Progression</div>
        <div class="flex space-x-1 h-12">
          ${this.generateMiniProgressionBars(match)}
        </div>
      </div>
      
  
    </div>
  `;
  
  // Position popup next to the button
  this.positionPopup(popup, buttonElement);
  
  // Show popup
  popup.classList.remove('hidden');
}

// Position popup relative to the clicked button
positionPopup(popup: HTMLElement, buttonElement: HTMLElement): void {
  const buttonRect = buttonElement.getBoundingClientRect();
  const popupWidth = 320; // 80 * 4 (w-80)
  
  // Calculate position
  let left = buttonRect.right + 10; // 10px spacing
  let top = buttonRect.top - 10;
  
  // Adjust if popup would go off-screen
  if (left + popupWidth > window.innerWidth) {
    left = buttonRect.left - popupWidth - 10; // Show on left side
  }
  
  if (top + 400 > window.innerHeight) {
    top = window.innerHeight - 420; // Adjust for popup height
  }
  
  if (top < 10) top = 10; // Don't go above viewport
  
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

// Generate mini bars for popup
generateMiniProgressionBars(match: any): string {
  const currentUser = app.getUsername();
  const isPlayer1 = match.player1_name === currentUser;
  const userScore = isPlayer1 ? match.player1_score : match.player2_score;
  const opponentScore = isPlayer1 ? match.player2_score : match.player1_score;
  
  let html = '';
  for (let i = 1; i <= Math.max(userScore, opponentScore); i++) {
    const userWon = i <= userScore;
    const opponentWon = i <= opponentScore;
    const height = userWon && opponentWon ? '24px' : userWon ? '16px' : opponentWon ? '8px' : '4px';
    const color = userWon ? 'bg-cyber-green' : 'bg-cyber-pink';
    
    html += `<div class="${color} w-2 rounded-t opacity-80" style="height: ${height}" title="Point ${i}"></div>`;
  }
  
  return html;
}

// Method to show full detailed session (opens the original modal)
showDetailedGameSession(matchId: string): void {
  // Hide popup first
  document.getElementById('gameSessionPopup')?.classList.add('hidden');
  
  // Show full modal with detailed analysis
  this.showGameSessionModal(matchId );
}
  async showMatchHistoryModal():  Promise<void>{
  const modal = document.getElementById('matchHistoryModal');
  const tbody = document.getElementById('fullMatchHistoryTable');
  
  if (!modal || !tbody) return <Promise<void>>Promise.resolve();
  // let user =  app.getUser();
  const HistoryMatches =  this.fetchUserMatchHistory(this.user.id);
  // JSON.parse(localStorage.getItem('userMatchHistory') || '[]');
  const currentUser = app.getUsername();
  
  tbody.innerHTML = '';
  
   (await HistoryMatches).forEach((match: any) => {
    const tr = document.createElement('tr');
    
    let userWon = false;
    let opponent = '';
    let score = '';
    let player1_name = '';
    
    if (match.match_type === 'multiplayer') {
    const userTeam = match.teams[0]
        const opponentTeam =match.teams[1]
        
        userWon = (userTeam?.score || 0) > (opponentTeam?.score || 0);
        player1_name = userTeam.name || 'team1';
        opponent = opponentTeam?.name || 'team2';
        score = `${userTeam?.score || 0} - ${opponentTeam?.score || 0}`;
    } else {
      // const isPlayer1 = match.player1_name == currentUser;
      const isPlayer1 = true; // Assuming current user is always player 1 for simplicity
      userWon = isPlayer1 ? match.player1_score > match.player2_score : match.player2_score > match.player1_score;
      // opponent = isPlayer1 ? match.player2_name : match.player1_name;
      opponent = match.player2_name;
      player1_name = match.player1_name;
      score = `${match.player1_score || 0} - ${match.player2_score || 0}`;
    }
    
    if (userWon) tr.classList.add('match-win');
    else tr.classList.add('match-loss');
    
    const matchType = match.match_type === 'tournament' ? 'Tournament' :
                     match.match_type === '1vAi' ? 'vs AI' :
                     match.match_type === 'multiplayer' ? 'Multiplayer' : '1v1';
    
    // In showMatchHistoryModal, update the table row generation:
    tr.innerHTML = `
    <td class="px-4 py-3 text-sm">${new Date(match.created_at).toLocaleDateString()}</td>
    <td class="px-4 py-3">${matchType}</td>
     <td class="px-4 py-3">${player1_name}</td>
    <td class="px-4 py-3">${opponent}</td>
    <td class="px-4 py-3">${score}</td>
    <td class="px-4 py-3">${userWon ? '🏆 Win' : '❌ Loss'}</td>
    <td class="px-4 py-3">${match.status}</td>
    <td class="px-4 py-3">
      <button class="cyber-btn-small text-xs py-1 px-2 hover:bg-cyber-green transition-colors" onclick="event.stopPropagation(); profile.showGameSessionPopup('${match.id}', this)">
        📊
      </button>
    </td>
  `;
    
    tbody.appendChild(tr);
  });
  
  modal.classList.remove('hidden');
  return Promise.resolve();
}
  
  // ✅ ADD these new methods:
async fetchUserMatchHistory(userId: string, page: number = 1, limit: number = 100): Promise<any[]> {
  try {
    // API endpoint with pagination parameters
    const response = await this.fetchWithAutoRefresh(
      `${this.baseURL}/users/${Number(userId)}/matches?page=${page}&limit=${limit}`
    );
    if (!response.ok) return [];
    
    const data = await response.json();
    
    // The API returns an array directly, not wrapped in a matches property
    return Array.isArray(data) ? data : [];
  } catch (error) {
    // toastManager.error( app.getUsername(),`Error fetching match history, ${error}`);
    
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
  console.log('Calculating user stats for:', currentUser, 'with match history:', matchHistory.length, 'and tournament history:', tournamentHistory.length);
  // Process matches based on your API structure
  matchHistory.forEach(match => {
    // Skip cancelled matches
    if (match.status === 'cancelled') return;
    
    stats.totalMatches++;
    console.log('Processing match:');
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
         const userTeam = match.teams[0]
        const opponentTeam =match.teams[1]
        
        userWon = (userTeam?.score || 0) > (opponentTeam?.score || 0);
        
    } else {
      // For regular/tournament matches
      if (match.player1_name === currentUser) {
        userWon = match.player1_score > match.player2_score;
      } else if (match.player2_name === currentUser) {
        userWon = match.player2_score > match.player1_score;
      }
    }
    // if (match.player1_score > match.player2_score) {  
    //     userWon = true;
    // }

    // if (userWon) {
    //   stats.wins++;
    // } else {
    //   stats.losses++;
    // }
    stats.wins = this.user.stats?.wins || 0;
    stats.losses = this.user.stats?.losses || 0;
  });

  // Calculate win rate
  stats.winRate = stats.totalMatches > 0 ? Math.round((stats.wins / stats.totalMatches) * 100) : 0;
  console.log('Calculated user stats:', stats);
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

    // if (this.profileForm.profileUsername)
    //   this.profileForm.profileUsername.textContent = user.username || app.getUsername() || 'Username';
    // Update these fields to be editable
    if (this.profileForm.displayNameField) {
        this.profileForm.displayNameField.value = user.username || app.getUsername() || '';
        this.profileForm.displayNameField.readOnly = false; // Make it editable
        this.profileForm.displayNameField.addEventListener('keydown', (event) => utils.preventSpaces(event));
    }
    
    if (this.profileForm.emailField) {
        this.profileForm.emailField.value = user.email || app.getEmail() || '';
        this.profileForm.emailField.readOnly = false; // Make it editable
        this.profileForm.emailField.addEventListener('keydown', (event) => utils.preventSpaces(event));
        // Remove the bg-cyber-dark class to make it look editable
        // this.profileForm.emailField.classList.remove('bg-cyber-dark');
    }

    if (this.profileForm.passwordField) {
        this.profileForm.passwordField.value = '';
        this.profileForm.passwordField.placeholder = 'Enter new password';
        this.profileForm.passwordField.readOnly = false; // Make it editable
        this.profileForm.passwordField.addEventListener('keydown', (event) => utils.preventSpaces(event));
        // Remove the bg-cyber-dark class to make it look editable
        // this.profileForm.passwordField.classList.remove('bg-cyber-dark');
    }
        if (this.profileForm.currentPasswordField) {
        this.profileForm.currentPasswordField.value = '';
        this.profileForm.currentPasswordField.placeholder = 'Enter current password';
        this.profileForm.currentPasswordField.readOnly = false; // Make it editable
         this.profileForm.currentPasswordField.addEventListener('keydown', (event) => utils.preventSpaces(event));
        // Remove the bg-cyber-dark class to make it look editable
        // this.profileForm.passwordField.classList.remove('bg-cyber-dark');
    }
    if (this.profileForm.profileAvatar) {
      // First check localStorage for cached profile picture
      // const cachedImage = this.getProfilePictureFromLocalStorage();
      
      // if (cachedImage) {
      //   this.profileForm.profileAvatar.src = cachedImage;
      //   console.log('Using cached profile picture from localStorage', cachedImage);
      // } else if (user.profile_picture) {
        // Use server URL if no cached version
        console.log('Using profile picture from user data in populate data:', user.profile_picture);
            const cleanPath = user.profile_picture?.replace(/^\//, ''); // Remove leading slash if present
            const apiUrl = `${CONFIG.baseURLWithoutApi}/${cleanPath}`;
            
            console.log('Trying to fetch profile picture from:', apiUrl);
            
            fetch(apiUrl, { credentials: 'include' })
              .then(async (res) => {
                if (!res.ok) {
                  console.error('Image not found, using default');
                   this.profileForm.profileAvatar!.src= 'src/assets/icons/user.png';
                  throw new Error('Image not found');
                }
                const blob = await res.blob();
                const imageUrl = URL.createObjectURL(blob);
                 this.profileForm.profileAvatar!.src= imageUrl;
                 app.state.user!.profile_picture = user.profile_picture; // Update user state with new profile picture URL
                // this.saveProfilePictureToLocalStorage(imageUrl);
          
                // if (this.profileForm.profileAvatar!.src) {
                //    this.profileForm.profileAvatar!.src = imageUrl;
                  login.updateUIAuthState();
                // }
              })
              .catch((e) => {
                console.error('Failed to load profile picture, using default', e);
                 this.profileForm.profileAvatar!.src = 'src/assets/icons/user.png';
              });
      // } else {
      //   // Fallback to default
      //   this.profileForm.profileAvatar.src = 'src/assets/icons/user.png';
      // }
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

  if (this.profileForm.statsTotalGames){
    console.log('Setting total games:', userStats.totalMatches);
    this.profileForm.statsTotalGames.textContent = userStats.totalMatches.toString();
  }

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
      if (file.size > 1 * 1024 * 1024) { // 1MB limit
        // components.showToast('error', 'File Too Large', 'Please select an image smaller than 5MB');
        toastManager.error(app.getUsername(), 'File Too Large , Please select an image smaller than 5MB');
        return;
      }
      const formData = new FormData();
      formData.append('file', file);

      try {
        if (!api.validateCSRFForStateChange('PATCH')) {
          return { success: false, error: 'CSRF validation failed' };
      }
        const res = await this.fetchWithAutoRefresh(
          `${this.baseURL}/users/uploads/profile-picture`,
          {
            method: 'POST',
            credentials: 'include',
             headers: api.prepareHeaders(formData),
            body: formData,
          }
        );

        if (!res.ok) {
          toastManager.error(app.getUsername(), 'Failed to upload profile picture');
          throw new Error('Failed to upload profile picture');
        }

        const data = await res.json();
        // Convert file to base64 and save to localStorage
     
          console.log('Profile picture uploaded successfully:', data);
           if (profileAvatar) {
          // If profile_picture exists, fetch it through the API, otherwise use default
          if (data){
            app.state.user!.profile_picture = data.url; // Update user state with new profile picture URL
            localStorage.setItem('user', JSON.stringify(app.state.user));
            localStorage.setItem('current_profile_picture_key', data.url);
            const cleanPath = data.url.replace(/^\//, ''); // Remove leading slash if present
            const apiUrl = `${CONFIG.baseURLWithoutApi}/${cleanPath}`;
            
            console.log('Trying to fetch profile picture from:', apiUrl);
            
            fetch(apiUrl, { credentials: 'include' })
              .then(async (res) => {
                if (!res.ok) {
                  console.error('Image not found, using default');
                  profileAvatar.src = 'src/assets/icons/user.png';
                  throw new Error('Image not found');
                }
                const blob = await res.blob();
                const imageUrl = URL.createObjectURL(blob);
                profileAvatar.src = imageUrl;
                this.saveProfilePictureToLocalStorage(data.url);
          
                if (profileAvatar) {
                  profileAvatar.src = imageUrl;
                  login.updateUIAuthState();
                }
              })
              .catch((e) => {
                console.error('Failed to load profile picture, using default', e);
                profileAvatar.src = 'src/assets/icons/user.png';
              });
          } else {
            profileAvatar.src = 'src/assets/icons/user.png';
          }
          }
          // Update user state if available
          if (app.state.user) {
            app.state.user.profile_picture = data.url;
            localStorage.setItem('user', JSON.stringify(app.state.user));
          }
          // Update logged in user image if available
          let loggedInUserImg = document.getElementById('loggedInUserImg');
          if (loggedInUserImg) {
            loggedInUserImg.setAttribute('src', data.url || 'src/assets/icons/user.png');
          }
       
          // if (loggedInUsername ) {
          //   loggedInUsername.textContent = app.state.user!.username || app.getUsername() || user.username || 'Unknown User';
        
          // }

        
       
        // components.showToast('success', 'Success', 'Profile picture updated successfully');
        toastManager.success(app.getUsername(), 'Profile picture updated successfully');
      } catch (err) {
        console.error('Error uploading profile picture:', err);
        // components.showToast('error', 'Upload Error', 'Failed to upload profile picture');
        toastManager.error(app.getUsername(), 'Failed to upload profile picture');
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

          if (!res.ok) {
            console.log('Failed to remove profile picture, response:', res);
            throw new Error('Failed to remove profile picture')
          };

          // Remove from localStorage
          this.removeProfilePictureFromLocalStorage();
          console.log('Profile picture removed from localStorage');
          if (profileAvatar) {
            profileAvatar.src = 'src/assets/icons/user.png';
          }

          // Update user state if available
          if (app.state.user) {
            app.state.user.profile_picture = 'src/assets/icons/user.png'; // Use consistent path
            localStorage.setItem('user', JSON.stringify(app.state.user));
          }
          
          // Update logged in user image if available
          let loggedInUserImg = document.getElementById('loggedInUserImg');
          if (loggedInUserImg) {
            loggedInUserImg.setAttribute('src', 'src/assets/icons/user.png');
          }
          
          // components.showToast('success', 'Success', 'Profile picture removed successfully');
          toastManager.success(app.getUsername(), 'Profile picture removed successfully');
        } catch (err) {
          console.error('Error removing profile picture:', err);
          // components.showToast('error', 'Remove Error', 'Failed to remove profile picture');
          if (profileAvatar) {
            profileAvatar.src = 'src/assets/icons/user.png';
          }
          toastManager.error(app.getUsername(), 'Failed to remove profile picture');
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
        // components.showToast('warning', 'Storage Full', 'Unable to cache profile picture locally');
        toastManager.warning(app.getUsername(), 'Unable to cache profile picture locally');
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
      
      // This method is sometimes called without UI updates, so let's ensure 
      // our state is consistent when this happens outside the click handler
      if (this.profileForm && this.profileForm.profileAvatar) {
        this.profileForm.profileAvatar.src = 'src/assets/icons/user.png';
      }
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
        
        // components.showToast('success', '2FA Enabled', 'Two-factor authentication has been successfully enabled.');
        toastManager.success(app.getUsername(), 'Two-factor authentication has been successfully enabled.');
        
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
      // components.showToast('error', '2FA Verification Error', error.message || 'Failed to verify 2FA');
      toastManager.error(app.getUsername(), error.message || 'Failed to verify 2FA');
      
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
        
        // components.showToast('success', '2FA Disabled', 'Two-factor authentication has been successfully disabled.');
        toastManager.success(app.getUsername(), 'Two-factor authentication has been successfully disabled.');
        
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
      // components.showToast('error', '2FA Disable Error', error.message || 'Failed to disable 2FA');
      toastManager.error(app.getUsername(), error.message || 'Failed to disable 2FA');
      
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
        let player1_name = match.player1_name || 'Player 1';
        
        if (match.match_type === 'multiplayer') {
        // Handle multiplayer matches
        const userTeam = match.teams[0]
        const opponentTeam =match.teams[1]
        
        userWon = (userTeam?.score || 0) > (opponentTeam?.score || 0);
        player1_name = userTeam.name || 'team1';
        opponent = opponentTeam?.name || 'team2';
        score = `${userTeam?.score || 0} - ${opponentTeam?.score || 0}`;
      } else {
        // Handle regular/tournament matches
        if (match.player1_name === currentUser) {
          userWon = match.player1_score > match.player2_score;
          opponent = match.player2_name;
        } else {
          // player1_name = match.player1_name;
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
           <td class="px-4 py-3">${player1_name}</td>
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

setupUpdateHandlers(): void {
    const updateUsernameBtn = document.createElement('button');
    updateUsernameBtn.setAttribute('data-i18n', 'profile.updateUsername');
    updateUsernameBtn.textContent = window.localization?.getTranslation('profile.updateUsername') || 'Update Username';
    updateUsernameBtn.className = 'cyber-btn-green text-sm py-2 px-4 rounded mt-2 whitespace-nowrap';
    updateUsernameBtn.type = 'button';

    const updateEmailBtn = document.createElement('button');
    updateEmailBtn.setAttribute('data-i18n', 'profile.updateEmail');
    updateEmailBtn.textContent = window.localization?.getTranslation('profile.updateEmail') || 'Update Email';
    updateEmailBtn.className = 'cyber-btn-green text-sm py-2 px-4 rounded mt-2';
    updateEmailBtn.type = 'button';

    const updatePasswordBtn = document.createElement('button');
    updatePasswordBtn.setAttribute('data-i18n', 'profile.updatePassword');
    updatePasswordBtn.textContent = window.localization?.getTranslation('profile.updatePassword') || 'Update Password';
    updatePasswordBtn.className = 'cyber-btn-green text-sm py-2 px-4 rounded mt-2 border-cyber-blue border-2 h-8';
    updatePasswordBtn.type = 'button';

    // Add buttons to the form
    if (this.profileForm.displayNameField?.parentElement) {
        this.profileForm.displayNameField.parentElement.appendChild(updateUsernameBtn);
    }
    if (this.profileForm.emailField?.parentElement) {
        this.profileForm.emailField.parentElement.appendChild(updateEmailBtn);
    }
    if (this.profileForm.passwordField?.parentElement) {
        this.profileForm.passwordField.parentElement.appendChild(updatePasswordBtn);
    }

    // Add event listeners
    updateUsernameBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleUsernameUpdate();
    });

    updateEmailBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleEmailUpdate();
    });

    updatePasswordBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handlePasswordUpdate();
    });
}


// Add these handler methods to your Profile class
async handleUsernameUpdate(): Promise<void> {
    if (!this.profileForm.displayNameField) return;
    
    const newUsername = this.profileForm.displayNameField.value.trim();
    
    if (!newUsername) {
        // components.showToast('error', 'Validation Error', 'Username cannot be empty');
        toastManager.error(app.getUsername(), 'Username cannot be empty');
        return;
    }

    if (newUsername.length < 3 || newUsername.length > 25) {
        // components.showToast('error', 'Validation Error', 'Username must be between 3 and 25 characters');
        toastManager.error(app.getUsername(), 'Username must be between 3 and 25 characters');
        return;
    }

    try {
        const result = await api.updateUserUsername(newUsername);
        
        if (result.success) {
            // components.showToast('success', 'Success', 'Username updated successfully');
            toastManager.success(app.getUsername(), result.message || 'Username updated successfully');
            console.log("the new username in profile", newUsername);
          
            // Update local state
            if (app.state.user) {
                console.log("the new username in app state", app.state.user!.username);
                app.state.user!.username = newUsername!;
                localStorage.setItem('user', JSON.stringify(app.state.user));
            }
            
            // Refresh profile data
            this.loadProfileData();
            // let newUsernameGame = game.init(newUsername, api.submitRegularMatch, api.submitTournamentMatch); 
            // console.log("the new username in game", app.getUsername());// Update username in game state
        } else {
            // components.showToast('error', 'Update Error', result.error || 'Failed to update username');
            toastManager.error(app.getUsername(), result.error || 'Failed to update username, user exists');
        }
    } catch (error: any) {
        // components.showToast('error', 'Update Error', 'An error occurred while updating username');
        toastManager.error(app.getUsername(), 'An error occurred while updating username');
    }
}

async handleEmailUpdate(): Promise<void> {
    if (!this.profileForm.emailField) return;
    
    const newEmail = this.profileForm.emailField.value.trim();
    
    if (!newEmail) {
        // components.showToast('error', 'Validation Error', 'Email cannot be empty');
        toastManager.error(app.getUsername(), 'Email cannot be empty');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
        // components.showToast('error', 'Validation Error', 'Please enter a valid email address');
        toastManager.error(app.getUsername(), 'Please enter a valid email address');
        return;
    }

    try {
        const result = await api.updateUserEmail(newEmail);
        
        if (result.success) {
            // components.showToast('success', 'Success', 'Email updated successfully');
            toastManager.success(app.getUsername(), 'Email updated successfully');
            
            // Update local state
            if (app.state.user) {
                app.state.user.email = newEmail;
                localStorage.setItem('user', JSON.stringify(app.state.user));
            }
            
            // Refresh profile data
            this.loadProfileData();
        } else {
            // components.showToast('error', 'Update Error', result.error || 'Failed to update email');
            toastManager.error(app.getUsername(), result.error || 'Failed to update email');
        }
    } catch (error: any) {
    //     components.showToast('error', 'Update Error', 'An error occurred while updating email');
        toastManager.error(app.getUsername(), 'An error occurred while updating email');
    }
}

async handlePasswordUpdate(): Promise<void> {
    if (!this.profileForm.passwordField) return;
    
    const newPassword = this.profileForm.passwordField.value.trim();
    const currentPassword = this.profileForm.currentPasswordField?.value.trim() || '';
    
    if (!newPassword || !currentPassword) {
        // components.showToast('error', 'Validation Error', 'New Password and Current Passoword fields cannot be empty');
         toastManager.error(app.getUsername(), 'New Password and Current Passoword fields cannot be empty');
        return;
    }

    if (newPassword.length < 8 || newPassword.length > 25) {
        // components.showToast('error', 'Validation Error', 'Password must be between 8 and 25 characters');
        toastManager.error(app.getUsername(), 'Password must be between 8 and 25 characters');
        return;
    }
    if (newPassword ==  currentPassword) {
        // components.showToast('error', 'Validation Error', 'New Password and Current Password must not the same');
        // toastManager.showToast('error', 'New Password and Current Password must not the same');
        toastManager.error(app.getUsername(), 'New Password and Current Password must not the same');
        return;
    }

    try {
        const result = await api.updateUserPassword(newPassword, currentPassword);
        
        if (result.success) {
            // components.showToast('success', 'Success', 'Password updated successfully');
            toastManager.success(app.getUsername(), 'Password updated successfully');
            
            // Clear the password field for security
            this.profileForm.passwordField.value = '';
            
            // Optionally refresh profile data
            this.loadProfileData();
        } else {
            // components.showToast('error', 'Update Error', result.error || 'Failed to update password');
            toastManager.showToast('error', result.error || 'Failed to update password');
        }
    } catch (error: any) {
        // components.showToast('error', 'Update Error', 'An error occurred while updating password');
        toastManager.error(app.getUsername(), 'An error occurred while updating password');
    }
}

}


// At the end of profile.ts
const profile = new Profile();

// Make it globally available  
(window as any).profile = profile;

export default profile;
export { ProfileForm, MatchEntry };