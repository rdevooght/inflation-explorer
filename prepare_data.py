from locale import normalize
import pandas as pd
import json
import re
import math
import os
from unidecode import unidecode

STATBEL_FOLDER = "../../données statbel/"
START_DATE = pd.to_datetime("2012-01-01")

round_to_n = lambda x, n: 0 if x == 0 else round(x, -int(math.floor(math.log10(x))) + (n - 1))

DATA = {}

# Convert CPI excel filt into a json

print("Load CPI data...")
df = pd.read_excel(STATBEL_FOLDER + "CPI All groups.xlsx")
df = df.dropna(subset=["MS_CPI_IDX"])

# Extract categories

print("Extract categories from CPI data...")
df["date"] = pd.to_datetime(df.NM_YR.astype(str) + "-" + df.NM_MTH.astype(str) + "-01")
df["CD_COICOP"] = df.CD_COICOP.apply(lambda x: x.replace(".", "").replace("-", "0") if isinstance(x, str) else x)
df["coicop"] = df.CD_COICOP
df["level"] = df.coicop.str.len() - 1

products = {"0": {"coicop": "0", "name": "Tous les produits", "level": "0"}}

for level in range(1, 5):
    products.update(
        df.loc[df.NM_CD_COICOP_LVL == level, ["CD_COICOP", "coicop", f"TX_COICOP_FR_LVL{level}", "level"]]
        .drop_duplicates()
        .rename(columns={f"TX_COICOP_FR_LVL{level}": "name"})
        .set_index("CD_COICOP")
        .to_dict(orient="index")
    )

## manual correction
products["10500"]["name"] = "Education not definable by level"

# Remove the numbering from the categories names
for k, v in products.items():
    v["name"] = re.sub("^\d+\. ", "", v["name"])

DATA["products"] = products

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
                print("Warning: timescale already exists with different length")
                print(start, end)

    timescales.append(timescale)
    return len(timescales) - 1


for coicop, index in df.loc[df.date >= START_DATE, ["coicop", "date", "MS_CPI_IDX"]].groupby(["coicop"]):
    values = index.to_dict(orient="records")
    timescale_id = add_timescale([v["date"].strftime("%Y-%m-%d") for v in values])
    values = [round_to_n(v["MS_CPI_IDX"], 3) for v in values]
    DATA["products"][coicop]["CPI"] = values
    DATA["products"][coicop]["timescale"] = timescale_id

DATA["timescales"] = timescales

# Add average weight from EBM studies

print("Add EBM data...")

groupings = {
    "total": "Tab01",
    "quartile de revenus": "Tab03_QRT",
    # "nombre de personnes âgées (65+) dans le ménage": "TAB04",
    # "nombre d'actifs dans le ménage": "TAB05",
    "présence d'enfant(s) (<16 ans) dans le ménage": "TAB06",
    "statut propriétaire-locataire de la personne de référence": "TAB07",
    # "âge de la personne de référence": "TAB08",
    "type de ménage eurostat": "TAB09",
    # "type de ménage": "TAB10",
    # "taille du ménage": "TAB11",
    # "statut social de la personne de référence du ménage": "TAB12",
    # "âge de la personne la plus âgée": "TAB13",
}

tab2group = {v.replace("_QRT", ""): k for k, v in groupings.items()}


def find_closest_grouping(approx_grouping_name):
    tokens = unidecode(approx_grouping_name.lower()).split(" ")
    matches = []
    for g in groupings:
        match = True
        g_tokens = re.split("( |-|')", unidecode(g))
        for t in tokens:
            if t not in g_tokens:
                match = False
                break
        if match:
            matches.append(g)

    if not matches:
        raise Exception("No match")

    if len(matches) > 1:
        for i, m in enumerate(matches):
            print(f"{i}: {m}")
        key = int(input("Choose group among matches: "))
        matches = [matches[key]]

    return matches[0]


def get_file_and_sheet(year, group, region="BE"):
    if year == 2020:
        file = STATBEL_FOLDER + "EBM/EBM_0113_2020_FR_07SEP21.XLSX"
    elif year == 2018:
        file = STATBEL_FOLDER + "EBM/EBM_0113_2018_FR_19NOV19.XLSX"
    elif year in [2012, 2014, 2016]:
        file = STATBEL_FOLDER + "EBM/Enquete_sur_le_budget_des_menages_EBM_2012-2014-2016.xls"
    else:
        raise ValueError(f"No data available for year {year}")

    tab = groupings[group] if group in groupings else groupings[find_closest_grouping(group)]
    if region not in ["FL", "VL", "BE", "BXL", "WAL"]:
        raise ValueError(f"Invalid region {region}")
    if region in ["FL", "VL"]:
        region = "FL" if tab.startswith("Tab") else "VL"

    sheet = f"HBS_{tab}_{region}_{year}"

    return file, sheet


COL_NAME = "Dépenses moyennes par ménage"


def get_sheet_info(file, sheet):

    # Check if the file info is already saved in a json file
    sheet_info_file = STATBEL_FOLDER + "EBM/as_csv/" + sheet + "/info.json"
    if os.path.exists(sheet_info_file):
        with open(sheet_info_file, "r") as f:
            info = json.load(f)
        return info

    df = pd.read_excel(file, sheet_name=sheet, nrows=7, header=None)
    info = {
        "file": file,
        "sheet": sheet,
        "title": df.loc[0, 0],
        "area": df.loc[1, 0].split(" - ")[0],
        "year": df.loc[1, 0].split(" - ")[2],
        "groups": {},
        "grouping": tab2group[sheet.split("_")[1]],
    }

    if df.loc[6, 0] == "COICOP":
        info["start_of_data"] = 7
    elif df.loc[5, 0] == "COICOP":
        info["start_of_data"] = 6
    elif df.loc[4, 0] == "COICOP":
        info["start_of_data"] = 5
        assert sheet.startswith("HBS_Tab01")
    else:
        raise Exception("Could not parse data correctly")

    # get groups
    # Tab01 sheets are a special case: there are no groups
    if info["start_of_data"] == 5:
        group_row = 2
        groups = [(2, "total")]
    else:
        group_row = info["start_of_data"] - 3
        groups = list(df.loc[group_row][df.loc[group_row].notnull()].to_dict().items())
    for i in range(1 if len(groups) > 1 else 0, len(groups)):
        group = groups[i][1]
        info["groups"][group] = {}
        col_id = groups[i][0]
        max_col = groups[i + 1][0] - 1 if len(groups) > i + 1 else df.columns.max()
        while col_id <= max_col:
            info["groups"][group][
                df.loc[group_row + 1, col_id]
                .replace("Dépenses moyennes par ménage et par an (€)", COL_NAME)
                .replace("Dépenses moyennes pour la totalité des ménages (par an en euros)", COL_NAME)
            ] = col_id
            col_id += 1

    # Save info
    if not os.path.exists(STATBEL_FOLDER + "EBM/as_csv/" + sheet):
        os.makedirs(STATBEL_FOLDER + "EBM/as_csv/" + sheet)
        with open(sheet_info_file, "w") as f:
            json.dump(info, f)

    return info


def get_data(sheet_info):

    groups = {}
    for group, cols in sheet_info["groups"].items():
        # Check if the data is already saved in a csv file
        normalized_group_name = re.sub("[^a-z0-9_]", "", unidecode(group).lower().replace(" ", "_"))
        data_file = STATBEL_FOLDER + "EBM/as_csv/" + sheet_info["sheet"] + "/" + normalized_group_name + ".csv"
        if os.path.exists(data_file):
            df = pd.read_csv(data_file, converters={"COICOP": lambda x: str(x)})
        else:
            df = pd.read_excel(file, sheet_name=sheet, skiprows=sheet_info["start_of_data"], header=None).dropna(
                subset=[1]
            )
            cols_renaming = {v: k for k, v in cols.items()}
            cols_renaming = {**{0: "COICOP", 1: "Libellés"}, **cols_renaming}
            df = df.loc[:, cols_renaming.keys()].rename(columns=cols_renaming)
            df["level"] = df["COICOP"].str.len()
            for col in cols:
                df[col] = df[col].apply(lambda x: 0 if x == "-" else x)

            # Save data
            df.to_csv(data_file, index=False)

        groups[group] = df.copy()

    return groups


def percent_and_abs(df):
    all = df[["COICOP", COL_NAME]].rename(columns={COL_NAME: "abs"}).set_index("COICOP").to_dict(orient="index")
    tot = all["0"]["abs"]
    for k in all:
        all[k]["rel"] = round_to_n(all[k]["abs"] / tot, 3)
        all[k]["abs"] = round_to_n(all[k]["abs"], 3)
        all[k] = [all[k]["abs"], all[k]["rel"]]  # change form dict to list to win some space
    return all


spendings = []

for year in range(2012, 2022, 2):
    for region in ["BE", "BXL", "WAL", "FL"]:
        print(f"Region {region}, year {year}...")
        for grouping in groupings:
            file, sheet = get_file_and_sheet(year, grouping, region)
            sheet_info = get_sheet_info(file, sheet)
            groups = get_data(sheet_info)
            for group, df in groups.items():
                if group != "3 adultes ou plus*":  # exception for missing data
                    s = percent_and_abs(df)
                    spendings.append(
                        {
                            "year": year,
                            "region": region,
                            "grouping": grouping,
                            "group": group,
                            "spendings": {k: v for k, v in s.items() if k in DATA["products"]},
                        }
                    )

DATA["spendings"] = spendings

###############################################################################
# Save data
###############################################################################

print("Saving data...")

with open("src/data.json", "w") as f:
    json.dump(DATA, f)
