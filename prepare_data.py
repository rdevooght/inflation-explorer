import pandas as pd
import json
import re

DATA = {}

# Convert CPI excel filt into a json

print('Load CPI data...')
df = pd.read_excel('../../données statbel/CPI All groups.xlsx')
df = df.dropna(subset=['MS_CPI_IDX'])

# Extract categories

print('Extract categories from CPI data...')
df['date'] = pd.to_datetime(df.NM_YR.astype(str) + '-' + df.NM_MTH.astype(str) + '-01')
df['CD_COICOP'] = df.CD_COICOP.apply(lambda x: x.replace('.', '').replace('-', '0') if isinstance(x, str) else x)
df['coicop'] = df.CD_COICOP
df['level'] = df.coicop.str.len() - 1

products = {'0': {'coicop': '0', 'name': 'Tous les produits', 'level': '0'}}

for level in range(1, 5):
    products.update(
        df.loc[
                df.NM_CD_COICOP_LVL == level, ['CD_COICOP', 'coicop', f'TX_COICOP_FR_LVL{level}', 'level']
            ].drop_duplicates().rename(columns={f'TX_COICOP_FR_LVL{level}': 'name'}).set_index('CD_COICOP').to_dict(orient='index')
    )

# Remove the numbering from the categories names
for k, v in products.items():
    v['name'] = re.sub('^\d+\. ', '', v['name'])

DATA['products'] = products

# Extract the evolution of the index for each category

timescales = []
def add_timescale(timescale):
    start = timescale[0]
    end = timescale[-1]
    l = len(timescale)
    for i, t in enumerate(timescales):
        if t[0] == start and t[-1] == end:
            if len(t) == l:
                return i
            else:
                print('Warning: timescale already exists with different length')
                print(start, end)
    
    timescales.append(timescale)
    return len(timescales) - 1

for coicop, index in df.loc[:, ['coicop', 'date', 'MS_CPI_IDX']].groupby(['coicop']):
    values = index.to_dict(orient='records')
    timescale_id = add_timescale([v['date'].strftime('%Y-%m-%d') for v in values])
    values = [round(v['MS_CPI_IDX'], 2) for v in values]
    DATA['products'][coicop]['CPI'] = values
    DATA['products'][coicop]['timescale'] = timescale_id

DATA['timescales'] = timescales

###############################################################################
# Save data
###############################################################################

print('Saving data...')

with open('src/data.json', 'w') as f:
    json.dump(DATA, f)