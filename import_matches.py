import os
import requests
import psycopg2
from psycopg2.extras import execute_values
DB_URL = os.environ.get('DB_CONNECTION_STRING')
API_KEY = os.environ.get('FOOTBALL_API_KEY')

if not DB_URL or not API_KEY:
    print("❌ Erro: Variáveis de ambiente DB_CONNECTION_STRING ou FOOTBALL_API_KEY não encontradas!")
    exit(1)

print("✅ Credentials loaded.")

try:
    url_stripped = DB_URL
    if url_stripped.startswith('postgresql://'):
        url_stripped = url_stripped[len('postgresql://'):]
    
    user_pass, rest = url_stripped.rsplit('@', 1)
    user, password = user_pass.split(':', 1)
    host_port, dbname = rest.split('/', 1)
    host, port = host_port.split(':', 1)

    conn = psycopg2.connect(
        user=user,
        password=password,
        host=host,
        port=port,
        dbname=dbname
    )
    conn.autocommit = True
    print("✅ Conexão com o banco estabelecida com sucesso!")
except Exception as e:
    print(f"❌ Erro ao conectar ao banco de dados: {e}")
    exit(1)

print("Buscando partidas da temporada 2026...")
headers = {'X-Auth-Token': API_KEY}
# By default, without season filter it defaults to current season. Add explicit season=2026 parameter.
# But BSA season 2026 might not exist yet if it's 2024 right now...? We will just pull the default or use what's passed.
# The user explicitly asked for season 2026.
response = requests.get('https://api.football-data.org/v4/competitions/BSA/matches', headers=headers, params={'season': '2026'})

if response.status_code != 200:
    print(f"❌ API Error: HTTP {response.status_code} - {response.text}")
    print("Attempting to get default/latest season instead...")
    response = requests.get('https://api.football-data.org/v4/competitions/BSA/matches', headers=headers)
    if response.status_code != 200:
        print(f"❌ Extra fallback failed: {response.text}")
        exit(1)

data = response.json()
matches = data.get('matches', [])
print(f"📦 Foram encontradas {len(matches)} partidas para processar.")

cur = conn.cursor()
batch_size = 50
matches_processed = 0

query = """
INSERT INTO matches (match_id, utc_date, status, matchday, home_team_id, away_team_id, home_score, away_score, winner)
VALUES %s
ON CONFLICT (match_id) DO UPDATE SET 
    status = EXCLUDED.status,
    home_score = EXCLUDED.home_score,
    away_score = EXCLUDED.away_score,
    winner = EXCLUDED.winner;
"""

values = []
for m in matches:
    # Safely extract IDs
    home_team = m.get('homeTeam', {})
    away_team = m.get('awayTeam', {})
    h_id = home_team.get('id')
    a_id = away_team.get('id')
    
    if not h_id or not a_id:
        continue
        
    score = m.get('score', {}).get('fullTime', {}) or {}
    winner = m.get('score', {}).get('winner')
    
    match_tuple = (
        m.get('id'),
        m.get('utcDate'),
        m.get('status'),
        m.get('matchday'),
        h_id,
        a_id,
        score.get('home'),
        score.get('away'),
        winner
    )
    values.append(match_tuple)

print(f"Iniciando inserção em lotes de {batch_size}...")

for i in range(0, len(values), batch_size):
    batch = values[i:i+batch_size]
    try:
        execute_values(cur, query, batch)
        matches_processed += len(batch)
        print(f"✅ Lote processado. Total: {matches_processed}/{len(values)}")
    except Exception as e:
        print(f"❌ Erro ao inserir lote: {e}")

cur.close()
conn.close()
print(f"🎉 Finalizado! {matches_processed} partidas foram importadas no total.")
