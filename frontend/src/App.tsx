import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Trophy, TrendingUp, Shield, Activity, BarChart3, ChevronDown } from 'lucide-react'

interface TeamStats {
  name: string;
  external_id: number;
  matches_played: number;
  avg_goals_scored_home: number | null;
  avg_goals_scored_away: number | null;
  avg_goals_conceded_home: number | null;
  avg_goals_conceded_away: number | null;
  crest_url?: string | null;
  tla?: string | null;
}

function App() {
  const [teams, setTeams] = useState<TeamStats[]>([])
  const [, setLoading] = useState(true);
  const [allMatches, setAllMatches] = useState<any[]>([])

  const [homeTeam, setHomeTeam] = useState<TeamStats | null>(null)
  const [awayTeam, setAwayTeam] = useState<TeamStats | null>(null)

  useEffect(() => {
    async function fetchStats() {
      const { data, error } = await supabase
        .from('team_stats')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching stats:', error)
      } else {
        // Formata os números que vêm como strings do Supabase
        const formatted = (data as any[]).map(t => ({
          ...t,
          avg_goals_scored_home: Number(t.avg_goals_scored_home || 0),
          avg_goals_scored_away: Number(t.avg_goals_scored_away || 0),
          avg_goals_conceded_home: Number(t.avg_goals_conceded_home || 0),
          avg_goals_conceded_away: Number(t.avg_goals_conceded_away || 0)
        }))
        setTeams(formatted)
      }
      setLoading(false)
    }

    async function fetchMatches() {
      // Pegamos a data de 3 dias atrás para mostrar alguns resultados recentes
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - 3);
      
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .gte('utc_date', dateThreshold.toISOString()) // "Greate Than or Equal" (Maior ou igual a 3 dias atrás)
        .order('utc_date', { ascending: true })       // Ordena do mais antigo para o mais futuro
        .limit(15)                                    // Pega os próximos 15 jogos a partir dali

      if (error) {
        console.error('Erro ao buscar partidas:', error)
      } else {
        setAllMatches(data || [])
      }
    }

    fetchStats()
    fetchMatches()
  }, [])

  // Calculation Logic
  let expectedHomeGoals = 0
  let expectedAwayGoals = 0

  if (homeTeam && awayTeam) {
    expectedHomeGoals = (homeTeam.avg_goals_scored_home! + awayTeam.avg_goals_conceded_away!) / 2
    expectedAwayGoals = (awayTeam.avg_goals_scored_away! + homeTeam.avg_goals_conceded_home!) / 2
  }

  // Simplified Probability Logic
  const totalExpected = expectedHomeGoals + expectedAwayGoals
  let drawProb = 0
  let homeProb = 0
  let awayProb = 0

  if (totalExpected > 0) {
    const diff = Math.abs(expectedHomeGoals - expectedAwayGoals)
    drawProb = Math.max(0, 0.35 - (diff * 0.15))
    const remain = 1 - drawProb
    homeProb = remain * (expectedHomeGoals / totalExpected)
    awayProb = remain * (expectedAwayGoals / totalExpected)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-10 font-sans selection:bg-emerald-500/30">

      <header className="mb-12 text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 mb-2 border border-emerald-500/20 shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]">
          <Trophy className="w-8 h-8" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
          Brasileirão 2026
          <span className="block text-xl md:text-2xl font-medium text-emerald-400 mt-2 tracking-normal">Prognósticos & xG Machine</span>
        </h1>
      </header>

      <main className="w-full max-w-5xl px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Teams Selector Panel */}
        <section className="lg:col-span-5 flex flex-col space-y-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-2 text-slate-200">
            <Activity className="w-5 h-5 text-emerald-400" /> Montar Confronto
          </h2>

          <div className="space-y-4">
            <div className="relative">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mandante</label>
              <div className="relative">
                <select
                  className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3.5 appearance-none focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                  value={homeTeam?.external_id || ""}
                  onChange={e => setHomeTeam(teams.find(t => t.external_id === Number(e.target.value)) || null)}
                >
                  <option value="">Selecione a equipe de casa</option>
                  {teams.filter(t => t.external_id !== awayTeam?.external_id).map(team => (
                    <option key={team.external_id} value={team.external_id}>{team.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex justify-center -my-2 relative z-10">
              <div className="bg-slate-800 border bg-clip-padding border-slate-700/50 text-slate-400 rounded-full px-3 py-1 text-sm font-bold shadow-lg">
                VS
              </div>
            </div>

            <div className="relative">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Visitante</label>
              <div className="relative">
                <select
                  className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3.5 appearance-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                  value={awayTeam?.external_id || ""}
                  onChange={e => setAwayTeam(teams.find(t => t.external_id === Number(e.target.value)) || null)}
                >
                  <option value="">Selecione a equipe visitante</option>
                  {teams.filter(t => t.external_id !== homeTeam?.external_id).map(team => (
                    <option key={team.external_id} value={team.external_id}>{team.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </section>

        {/* Prediction Panel */}
        <section className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col justify-center">

          {!homeTeam || !awayTeam ? (
            <div className="flex flex-col items-center justify-center text-center space-y-4 py-12 text-slate-500">
              <BarChart3 className="w-16 h-16 opacity-20" />
              <p className="text-lg">Selecione duas equipes para <br className="hidden md:block" /> gerar a previsão estatística do confronto.</p>
            </div>
          ) : (
            <div className="space-y-10 animate-in fade-in zoom-in-95 duration-500">

              {/* Scoreline Predictor */}
              <div className="flex items-center justify-between">
                <div className="flex-1 text-center flex flex-col items-center">
                  {homeTeam.crest_url && (
                    <img 
                      src={homeTeam.crest_url} 
                      alt={homeTeam.name} 
                      className="w-16 h-16 md:w-20 md:h-20 object-contain mb-4 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  )}
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-2">{homeTeam.name}</h3>
                  <div className="text-4xl md:text-6xl font-black text-emerald-400 tracking-tighter drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    {expectedHomeGoals.toFixed(1)}
                  </div>
                  <p className="text-xs text-slate-400 uppercase mt-2 tracking-widest font-semibold font-mono">Gols Esp.</p>
                </div>

                <div className="px-4 text-center">
                  <span className="text-slate-600 font-bold block mb-4">xG</span>
                  <div className="h-12 w-0.5 bg-gradient-to-b from-transparent via-slate-700 to-transparent mx-auto"></div>
                </div>

                <div className="flex-1 text-center flex flex-col items-center">
                  {awayTeam.crest_url && (
                    <img 
                      src={awayTeam.crest_url} 
                      alt={awayTeam.name} 
                      className="w-16 h-16 md:w-20 md:h-20 object-contain mb-4 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  )}
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-2">{awayTeam.name}</h3>
                  <div className="text-4xl md:text-6xl font-black text-indigo-400 tracking-tighter drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                    {expectedAwayGoals.toFixed(1)}
                  </div>
                  <p className="text-xs text-slate-400 uppercase mt-2 tracking-widest font-semibold font-mono">Gols Esp.</p>
                </div>
              </div>

              {/* Data Breakdown (Radar substitute) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50 flex flex-col justify-center">
                  <p className="text-slate-400 text-xs mb-1 font-medium"><TrendingUp className="inline w-3 h-3 mr-1" />Ataque vs Defesa</p>
                  <p className="text-sm font-semibold">{homeTeam.avg_goals_scored_home?.toFixed(2)} marc. casa</p>
                  <p className="text-sm font-semibold text-slate-500">vs</p>
                  <p className="text-sm font-semibold">{awayTeam.avg_goals_conceded_away?.toFixed(2)} sofr. fora</p>
                </div>
                <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50 flex flex-col justify-center">
                  <p className="text-slate-400 text-xs mb-1 font-medium"><Shield className="inline w-3 h-3 mr-1" />Defesa vs Ataque</p>
                  <p className="text-sm font-semibold">{homeTeam.avg_goals_conceded_home?.toFixed(2)} sofr. casa</p>
                  <p className="text-sm font-semibold text-slate-500">vs</p>
                  <p className="text-sm font-semibold">{awayTeam.avg_goals_scored_away?.toFixed(2)} marc. fora</p>
                </div>
              </div>

              {/* Probabilities Bar */}
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-4 flex items-center justify-between">
                  <span>Probabilidade de Resultado</span>
                  <span className="text-slate-500 text-xs font-normal">Baseado em Histórico</span>
                </h4>

                <div className="w-full h-8 flex rounded-xl overflow-hidden ring-1 ring-white/10 shadow-inner">
                  <div
                    className="h-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-emerald-950 transition-all duration-1000 ease-out relative overflow-hidden"
                    style={{ width: `${homeProb * 100}%` }}>
                    <div className="absolute inset-0 bg-white/20 w-1/2 -skew-x-12 translate-x-[200%] animate-[shine_3s_infinite]"></div>
                    {(homeProb * 100) > 10 && `${(homeProb * 100).toFixed(0)}%`}
                  </div>
                  <div
                    className="h-full bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-300 transition-all duration-1000 ease-out"
                    style={{ width: `${drawProb * 100}%` }}>
                    {(drawProb * 100) > 10 && `${(drawProb * 100).toFixed(0)}%`}
                  </div>
                  <div
                    className="h-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-indigo-950 transition-all duration-1000 ease-out relative overflow-hidden"
                    style={{ width: `${awayProb * 100}%` }}>
                    <div className="absolute inset-0 bg-white/20 w-1/2 -skew-x-12 translate-x-[200%] animate-[shine_3s_infinite_1s]"></div>
                    {(awayProb * 100) > 10 && `${(awayProb * 100).toFixed(0)}%`}
                  </div>
                </div>

                <div className="flex justify-between mt-3 text-xs font-medium">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_theme(colors.emerald.500)]"></div> {homeTeam.name}</div>
                  <div className="flex items-center gap-1.5 text-slate-400">Empate</div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_theme(colors.indigo.500)]"></div> {awayTeam.name}</div>
                </div>
              </div>

            </div>
          )}

        </section>
      </main>

      {/* Seção de Agenda e Resultados */}
      <section className="w-full max-w-5xl px-6 mt-12 mb-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-400" /> Agenda & Resultados
          </h2>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
            Rodada Atual
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          {allMatches.length === 0 ? (
            <div className="p-10 text-center text-slate-500">Buscando calendário...</div>
          ) : (
            allMatches.map((match) => {
              // Busca os dados completos dos times
              const homeTeamData = teams.find(t => t.external_id === match.home_team_id);
              const awayTeamData = teams.find(t => t.external_id === match.away_team_id);
              const isFinished = match.status === 'FINISHED'

              return (
                <div key={match.match_id} className="group border-b border-slate-800/50 last:border-0 hover:bg-slate-800/40 transition-all flex items-center px-4 md:px-8 py-4">
                  
                  {/* Data e Hora */}
                  <div className="flex flex-col text-[10px] md:text-xs font-mono text-slate-500 w-12 md:w-20">
                    <span className="group-hover:text-slate-300 transition-colors">
                      {new Date(match.utc_date).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                    </span>
                    <span className="font-bold text-slate-600 group-hover:text-emerald-500/50">
                      {new Date(match.utc_date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                    </span>
                  </div>

                  {/* Times e Placar */}
                  <div className="flex-1 flex items-center justify-center gap-2 md:gap-4">
                    {/* Mandante */}
                    <div className="flex-1 flex items-center justify-end gap-2">
                      <span className="font-semibold text-slate-200 hidden md:block">{homeTeamData?.name}</span>
                      <span className="font-semibold text-slate-200 md:hidden">{homeTeamData?.tla}</span>
                      {homeTeamData?.crest_url && <img src={homeTeamData.crest_url} className="w-6 h-6 object-contain" alt="" />}
                    </div>
                    
                    {/* Placar */}
                    <div className={`flex items-center justify-center rounded-lg border font-black text-sm md:text-lg min-w-[50px] md:min-w-[80px] py-1 shadow-inner ${
                      isFinished 
                      ? 'bg-slate-950 border-emerald-500/20 text-emerald-400' 
                      : 'bg-slate-800/50 border-slate-700 text-slate-500'
                    }`}>
                      {isFinished ? `${match.home_score} - ${match.away_score}` : 'VS'}
                    </div>

                    {/* Visitante */}
                    <div className="flex-1 flex items-center justify-start gap-2">
                      {awayTeamData?.crest_url && <img src={awayTeamData.crest_url} className="w-6 h-6 object-contain" alt="" />}
                      <span className="font-semibold text-slate-200 hidden md:block">{awayTeamData?.name}</span>
                      <span className="font-semibold text-slate-200 md:hidden">{awayTeamData?.tla}</span>
                    </div>
                  </div>

                  {/* Badge de Status */}
                  <div className="hidden md:flex w-24 justify-end">
                    <span className={`text-[10px] uppercase px-2.5 py-1 rounded-md font-bold tracking-tighter ${
                      isFinished 
                      ? 'bg-slate-800 text-slate-500' 
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse'
                    }`}>
                      {isFinished ? 'Encerrado' : 'Ao Vivo / Próx'}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

    </div>
  )
}

export default App
