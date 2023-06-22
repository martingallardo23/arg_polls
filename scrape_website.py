import requests
from bs4 import BeautifulSoup
import pandas as pd
from dateutil.parser import parse
import urllib.parse

# Function to translate Spanish month names to English
def spanish_to_english_month(spanish_month):
    month_map = {
        "enero": "January", "febrero": "February", "marzo": "March",
        "abril": "April", "mayo": "May", "junio": "June",
        "julio": "July", "agosto": "August", "septiembre": "September",
        "octubre": "October", "noviembre": "November", "diciembre": "December"
    }
    return month_map.get(spanish_month.lower(), "")

# Function to parse date text to date
def extract_and_parse_date(date_text):
    spanish_month = next((month for month in month_map if month in date_text), None)
    if spanish_month:
        date_text = date_text.replace(spanish_month, spanish_to_english_month(spanish_month))
    return parse(date_text, dayfirst=True)
# Function to check if a string can be converted to a float
def is_float(string):
    try:
        float(string)
        return True
    except ValueError:
        return False

# Function to replace commas with dots and convert to float
def replace_commas(val):
    if val == "-":
        return None
    else:
        return float(val.replace(',', '.'))

# Main script
url = "https://es.wikipedia.org/wiki/Anexo:Encuestas_de_intención_de_voto_para_las_elecciones_presidenciales_de_Argentina_de_2023"
url = urllib.parse.quote(url, safe=':/')  # Encode URL correctly
tables = pd.read_html(url, header=0)

for i, df in enumerate(tables):
    df.dropna(how='all', inplace=True)  # Drop rows with all NaN values
    df.columns = [col_name for col_name in df.columns]  # Rename columns
    if 'fecha' in df.columns:  # Check if 'fecha' column exists
        df['fecha'] = df['fecha'].apply(extract_and_parse_date)  # Parse date column
    
    # Replace commas with dots and convert to float
    for col in df.columns:
        if df[col].dtype == object:
            df[col] = df[col].apply(replace_commas)
    
    df.to_csv(f'table_{i+1}.csv', index=False)  # Save each table to a separate csv file
