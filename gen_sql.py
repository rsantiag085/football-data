import json

def process_teams():
    with open('teams.json', 'r') as f:
        data = json.load(f)
    teams = data.get('teams', [])
    
    insert_queries = []
    for team in teams:
        ext_id = team['id']
        name = team.get('name', '').replace("'", "''")
        tla = team.get('tla', '')
        if tla is None: tla = ''
        tla = tla.replace("'", "''")
        crest_url = team.get('crest', '')
        if crest_url is None: crest_url = ''
        crest_url = crest_url.replace("'", "''")
        
        query = f"INSERT INTO teams (external_id, name, tla, crest_url) VALUES ({ext_id}, '{name}', '{tla}', '{crest_url}') ON CONFLICT (external_id) DO UPDATE SET name = EXCLUDED.name, crest_url = EXCLUDED.crest_url;"
        insert_queries.append(query)
    
    # We can execute as a single statement by wrapping them in BEGIN; ... COMMIT; or just running multiple INSERTs.
    with open('teams.sql', 'w') as f:
        f.write("\n".join(insert_queries))
    return len(teams)

def process_matches():
    with open('matches.json', 'r') as f:
        data = json.load(f)
    matches = data.get('matches', [])
    
    insert_queries = []
    
    # Pre-extract all teams from matches just in case any team wasn't in teams.json
    extra_teams_queries = []
    team_ids = set()
    for m in matches:
        for prefix in ['homeTeam', 'awayTeam']:
            t = m.get(prefix)
            if t and t.get('id'):
                tid = t['id']
                if tid not in team_ids:
                    team_ids.add(tid)
                    tname = t.get('name', '').replace("'", "''")
                    ttla = t.get('tla', '')
                    if ttla is None: ttla = ''
                    ttla = ttla.replace("'", "''")
                    tcrest = t.get('crest', '')
                    if tcrest is None: tcrest = ''
                    tcrest = tcrest.replace("'", "''")
                    # Insert if not exists, but here we don't know if they are already in teams table, but ON CONFLICT will save us. DO NOTHING because the main teams have more info (like full name/crest).
                    extra_teams_queries.append(f"INSERT INTO teams (external_id, name, tla, crest_url) VALUES ({tid}, '{tname}', '{ttla}', '{tcrest}') ON CONFLICT (external_id) DO NOTHING;")

    for match in matches:
        match_id = match['id']
        utc_date = match.get('utcDate', '')
        status = match.get('status', '')
        matchday = match.get('matchday')
        if matchday is None: matchday = 'NULL'
        
        home_team = match.get('homeTeam', {})
        away_team = match.get('awayTeam', {})
        home_id = home_team.get('id')
        if home_id is None: home_id = 'NULL'
        away_id = away_team.get('id')
        if away_id is None: away_id = 'NULL'
        
        home_score = match.get('score', {}).get('fullTime', {}).get('home')
        if home_score is None: home_score = 'NULL'
        away_score = match.get('score', {}).get('fullTime', {}).get('away')
        if away_score is None: away_score = 'NULL'
        
        winner = match.get('score', {}).get('winner')
        winner_val = f"'{winner}'" if winner else 'NULL'
        
        query = f"INSERT INTO matches (match_id, utc_date, status, matchday, home_team_id, away_team_id, home_score, away_score, winner) VALUES ({match_id}, '{utc_date}', '{status}', {matchday}, {home_id}, {away_id}, {home_score}, {away_score}, {winner_val}) ON CONFLICT (match_id) DO UPDATE SET status = EXCLUDED.status, home_score = EXCLUDED.home_score, away_score = EXCLUDED.away_score, winner = EXCLUDED.winner;"
        insert_queries.append(query)
    
    with open('matches.sql', 'w') as f:
        f.write("\n".join(extra_teams_queries) + "\n" + "\n".join(insert_queries))
    return len(matches)

n_teams = process_teams()
n_matches = process_matches()
print(f"Processed {n_teams} teams and {n_matches} matches.")
