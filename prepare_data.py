import pandas as pd
import json
import re
import math

STATBEL_FOLDER = '../../données statbel/'
START_DATE = pd.to_datetime('2012-01-01')

round_to_n = lambda x, n: round(x, -int(math.floor(math.log10(x))) + (n - 1))

DATA = {}

# Convert CPI excel filt into a json

print('Load CPI data...')
df = pd.read_excel(STATBEL_FOLDER+'CPI All groups.xlsx')
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


for coicop, index in df.loc[df.date >= START_DATE, ['coicop', 'date', 'MS_CPI_IDX']].groupby(['coicop']):
    values = index.to_dict(orient='records')
    timescale_id = add_timescale([v['date'].strftime('%Y-%m-%d') for v in values])
    values = [round_to_n(v['MS_CPI_IDX'], 3) for v in values]
    DATA['products'][coicop]['CPI'] = values
    DATA['products'][coicop]['timescale'] = timescale_id

DATA['timescales'] = timescales

# Add average weight from EBM studies

print('Add EBM data...')

def get_main_file_and_sheet(year):
    if year == 2020:
        file = STATBEL_FOLDER+'EBM/EBM_0113_2020_FR_07SEP21.XLSX'
    elif year == 2018:
        file = STATBEL_FOLDER+'EBM/EBM_0113_2018_FR_19NOV19.XLSX'
    elif year in [2012, 2014, 2016]:
        file = STATBEL_FOLDER+'EBM/Enquete_sur_le_budget_des_menages_EBM_2012-2014-2016.xls'
    else:
        raise ValueError(f'No data available for year {year}')
    
    sheet = f'HBS_Tab01_BE_{year}'

    return file, sheet

def get_main_data(year):
    file, sheet = get_main_file_and_sheet(year)
    df = pd.read_excel(file, sheet_name=sheet, skiprows=3)
    df = df.rename(columns={'Unnamed: 0': 'COICOP', 'Unnamed: 1': 'Libellés'}).drop(0).dropna(subset=['Libellés'])
    df['level'] = df['COICOP'].str.len()

    return df

def percent_and_abs(df):
    COL_PP = 'Dépenses moyennes par personne et par an (€)'
    all = df[['COICOP', COL_PP]].rename(columns={COL_PP: 'abs'}).set_index('COICOP').to_dict(orient='index')
    tot = all['0']['abs']
    for k in all:
        all[k]['rel'] = round_to_n(all[k]['abs'] / tot, 3)
        all[k]['abs'] = round_to_n(all[k]['abs'], 3)
    return all

spendings = {}

for year in range(2012, 2022, 2):
    s = percent_and_abs(get_main_data(year))
    spendings[year] = {k: v for k, v in s.items() if k in DATA['products']}

DATA['spendings'] = spendings

###############################################################################
# Save data
###############################################################################

print('Saving data...')

with open('src/data.json', 'w') as f:
    json.dump(DATA, f)