import boto3
import pandas as pd
import io
import os
from datetime import datetime

# --- Config ---
S3_BUCKET = "joel-walker-portfolio"
RAW_KEY = "raw/layoffs/layoffs.csv"
CLEAN_KEY = "cleaned/layoffs/layoffs_cleaned.csv"

# Companies that appear as "Other" but have a known industry.
# Keys are lowercase stripped company names; exact match only.
COMPANY_INDUSTRY_MAP = {
    # Enterprise Software
    "microsoft": "Enterprise Software",
    "oracle": "Enterprise Software",
    "sap": "Enterprise Software",
    "sap labs": "Enterprise Software",
    "salesforce": "Enterprise Software",
    "servicenow": "Enterprise Software",
    "workday": "Enterprise Software",
    "qualtrics": "Enterprise Software",
    "smartsheet": "Enterprise Software",
    "atlassian": "Enterprise Software",
    "autodesk": "Enterprise Software",
    "dropbox": "Enterprise Software",
    "zoom": "Enterprise Software",
    "ringcentral": "Enterprise Software",
    "twilio": "Enterprise Software",
    "messagebird": "Enterprise Software",
    "gupshup": "Enterprise Software",
    "sinch": "Enterprise Software",
    "whispir": "Enterprise Software",
    "automation anywhere": "Enterprise Software",
    "uipath": "Enterprise Software",
    "workato": "Enterprise Software",
    "clickup": "Enterprise Software",
    "asana": "Enterprise Software",
    "miro": "Enterprise Software",
    "calendly": "Enterprise Software",
    "anaplan": "Enterprise Software",
    "avaya": "Enterprise Software",
    "certinia": "Enterprise Software",
    "coda": "Enterprise Software",
    "connectwise": "Enterprise Software",
    "cloud software group": "Enterprise Software",
    "everbridge": "Enterprise Software",
    "forgerock": "Enterprise Software",
    "formstack": "Enterprise Software",
    "goto": "Enterprise Software",
    "hyland software": "Enterprise Software",
    "kinaxis": "Enterprise Software",
    "kissflow": "Enterprise Software",
    "lokalise": "Enterprise Software",
    "lucid software": "Enterprise Software",
    "n-able technologies": "Enterprise Software",
    "nextiva": "Enterprise Software",
    "sharefile": "Enterprise Software",
    "smarsh": "Enterprise Software",
    "staffbase": "Enterprise Software",
    "teamwork": "Enterprise Software",
    "tonkean": "Enterprise Software",
    "walkme": "Enterprise Software",
    "zapier": "Enterprise Software",
    "zenbusiness": "Enterprise Software",
    "vendr": "Enterprise Software",
    "zylo": "Enterprise Software",
    "blackbaud": "Enterprise Software",
    "bonterra": "Enterprise Software",
    "tackle": "Enterprise Software",
    "torii": "Enterprise Software",
    "retool": "Enterprise Software",
    "alphasense": "Enterprise Software",
    "atera": "Enterprise Software",
    "jamf": "Enterprise Software",
    "kandji": "Enterprise Software",
    "digimarc": "Enterprise Software",
    "pitch": "Enterprise Software",
    "sketch": "Enterprise Software",
    "slite": "Enterprise Software",
    "whereby": "Enterprise Software",
    "wetransfer": "Enterprise Software",
    "almanac": "Enterprise Software",
    "karbon": "Enterprise Software",
    "salto": "Enterprise Software",
    "phunware": "Enterprise Software",
    "hubilo": "Enterprise Software",
    "skykick": "Enterprise Software",
    "vowel": "Enterprise Software",
    "rows": "Enterprise Software",
    "esper": "Enterprise Software",
    "gocanvas": "Enterprise Software",
    "tealbook": "Enterprise Software",
    "submittable": "Enterprise Software",
    "red hat": "Enterprise Software",
    "mark43": "Enterprise Software",
    "netlify": "Enterprise Software",
    "audiocodes": "Enterprise Software",
    "q4": "Enterprise Software",
    "dude solutions": "Enterprise Software",
    "similarweb": "Enterprise Software",
    "symend": "Enterprise Software",
    "synopsys": "Enterprise Software",
    "cellebrite": "Enterprise Software",
    "automattic": "Enterprise Software",
    "hopin": "Enterprise Software",
    "soundhound": "Enterprise Software",
    "zendesk": "Enterprise Software",
    "freshworks": "Enterprise Software",
    "hubspot": "Enterprise Software",
    "monday.com": "Enterprise Software",
    "figma": "Enterprise Software",
    "airtable": "Enterprise Software",
    "notion": "Enterprise Software",
    "fiverr": "Enterprise Software",
    "upwork": "Enterprise Software",

    # IT Services
    "ibm": "IT Services",
    "accenture": "IT Services",
    "cognizant": "IT Services",
    "infosys": "IT Services",
    "wipro": "IT Services",
    "tata consultancy services": "IT Services",
    "capgemini": "IT Services",
    "kyndryl": "IT Services",
    "dxc technology": "IT Services",
    "thoughtworks": "IT Services",
    "sada": "IT Services",
    "ericsson": "IT Services",

    # Hardware
    "dell": "Hardware",
    "hp": "Hardware",
    "hewlett packard": "Hardware",
    "lenovo": "Hardware",
    "western digital": "Hardware",
    "seagate": "Hardware",
    "logitech": "Hardware",
    "desktop metal": "Hardware",
    "impinj": "Hardware",
    "microvision": "Hardware",
    "pico interactive": "Hardware",
    "fluke": "Hardware",
    "storedot": "Hardware",
    "tomtom": "Hardware",
    "tempo automation": "Hardware",
    "viasat": "Hardware",
    "xsight labs": "Hardware",

    # Transportation
    "uber": "Transportation",
    "lyft": "Transportation",
    "doordash": "Transportation",
    "instacart": "Transportation",
    "deliveroo": "Transportation",
    "grubhub": "Transportation",
    "bird": "Transportation",
    "lime": "Transportation",
    "bolt": "Transportation",
    "ola": "Transportation",
    "grab": "Transportation",
    "didi": "Transportation",

    # Travel
    "airbnb": "Travel",
    "booking.com": "Travel",
    "booking holdings": "Travel",
    "expedia": "Travel",
    "tripadvisor": "Travel",
    "hopper": "Travel",
    "vacasa": "Travel",
    "sonder": "Travel",
    "oyo": "Travel",
    "klook": "Travel",
    "travelport": "Travel",

    # Crypto
    "coinbase": "Crypto",
    "binance": "Crypto",
    "kraken": "Crypto",
    "gemini": "Crypto",
    "blockfi": "Crypto",
    "celsius": "Crypto",
    "ftx": "Crypto",
    "crypto.com": "Crypto",
    "consensys": "Crypto",
    "opensea": "Crypto",
    "ripple": "Crypto",

    # Media & Entertainment
    "netflix": "Media & Entertainment",
    "spotify": "Media & Entertainment",
    "disney": "Media & Entertainment",
    "bandcamp": "Media & Entertainment",
    "atmosphere": "Media & Entertainment",
    "utopia music": "Media & Entertainment",
    "iqiyi smart": "Media & Entertainment",
    "qyuki": "Media & Entertainment",
    "warner bros": "Media & Entertainment",
    "paramount": "Media & Entertainment",
    "buzzfeed": "Media & Entertainment",
    "vice": "Media & Entertainment",
    "vox media": "Media & Entertainment",
    "soundcloud": "Media & Entertainment",
    "deezer": "Media & Entertainment",
    "tidal": "Media & Entertainment",
    "twitch": "Media & Entertainment",
    "pinterest": "Media & Entertainment",
    "reddit": "Media & Entertainment",
    "vimeo": "Media & Entertainment",
    "snap": "Media & Entertainment",

    # Finance
    "goldman sachs": "Finance",
    "morgan stanley": "Finance",
    "stripe": "Finance",
    "robinhood": "Finance",
    "prosus": "Finance",
    "affirm": "Finance",
    "klarna": "Finance",
    "jp morgan": "Finance",
    "jpmorgan": "Finance",
    "paypal": "Finance",
    "brex": "Finance",
    "chime": "Finance",
    "nubank": "Finance",
    "revolut": "Finance",
    "wise": "Finance",
    "plaid": "Finance",
    "marqeta": "Finance",
    "opendoor": "Finance",
    "better": "Finance",
    "better.com": "Finance",
    "loandepot": "Finance",
    "sofi": "Finance",

    # Healthcare
    "johnson & johnson": "Healthcare",
    "pfizer": "Healthcare",
    "abbott": "Healthcare",
    "moderna": "Healthcare",
    "merck": "Healthcare",
    "papa": "Healthcare",
    "benchling": "Healthcare",
    "cerebral": "Healthcare",
    "noom": "Healthcare",
    "teladoc": "Healthcare",
    "amwell": "Healthcare",
    "hims": "Healthcare",
    "hims & hers": "Healthcare",
    "23andme": "Healthcare",
    "invitae": "Healthcare",
    "oscar health": "Healthcare",

    # Automotive
    "general motors": "Automotive",
    "gm": "Automotive",
    "ford": "Automotive",
    "tesla": "Automotive",
    "rivian": "Automotive",
    "lucid": "Automotive",
    "fisker": "Automotive",
    "nikola": "Automotive",
    "stellantis": "Automotive",
    "cruise": "Automotive",
    "argo ai": "Automotive",
    "aurora": "Automotive",
    "polestar": "Automotive",
    "canoo": "Automotive",
    "arrival": "Automotive",
    "motional": "Automotive",
    "brodmann17": "Automotive",

    # Gaming
    "unity": "Gaming",
    "niantic": "Gaming",
    "singularity 6": "Gaming",
    "etermax": "Gaming",
    "improbable": "Gaming",
    "bluestacks": "Gaming",

    # Robotics
    "agility robotics": "Robotics",
    "american robotics": "Robotics",
    "plus one robotics": "Robotics",
    "pudutech": "Robotics",
    "intrinsic": "Robotics",
    "monarch tractor": "Robotics",

    # BioTech
    "zymergen": "BioTech",
    "infarm": "BioTech",
    "indigo": "BioTech",
}


def load_from_s3(bucket, key):
    """Read the raw CSV directly from S3 into a dataframe."""
    s3 = boto3.client("s3")
    obj = s3.get_object(Bucket=bucket, Key=key)
    df = pd.read_csv(io.BytesIO(obj["Body"].read()))
    print(f"  Loaded {len(df):,} rows from s3://{bucket}/{key}")
    return df

def reclassify_other(df):
    """For rows where industry == 'Other', apply the known company→industry map."""
    mask_other = df["industry"].str.strip() == "Other"
    n_before = mask_other.sum()

    company_lower = df["company"].str.strip().str.lower()
    mapped = company_lower.map(COMPANY_INDUSTRY_MAP)

    apply_mask = mask_other & mapped.notna()
    df.loc[apply_mask, "industry"] = mapped[apply_mask]

    reclassified = df.loc[apply_mask, ["company", "industry"]].drop_duplicates("company")
    n_reclassified = apply_mask.sum()

    print(f"  'Other' rows before: {n_before}")
    print(f"  Rows reclassified:   {n_reclassified}")
    print(f"  'Other' rows after:  {mask_other.sum() - n_reclassified}")

    if n_reclassified > 0:
        print(f"\n  Reclassified companies:")
        by_industry = reclassified.groupby("industry")["company"].apply(list)
        for industry, companies in by_industry.items():
            print(f"    [{industry}] {', '.join(sorted(companies))}")

    return df

def clean_data(df):
    """Apply all cleaning logic to the raw dataframe."""

    # 1. Drop columns we don't need
    df = df.drop(columns=["source", "date_added"], errors="ignore")
    print(f"  Dropped unused columns")

    # 2. Fix date column — convert from M/D/YYYY string to proper date
    df["date"] = pd.to_datetime(df["date"], format="mixed", dayfirst=False, errors="coerce")
    print(f"  Fixed date column — nulls after parse: {df['date'].isna().sum()}")

    # 3. Strip rogue quote characters from location
    df["location"] = df["location"].str.replace('"', '', regex=False).str.strip()
    df["country"] = df["country"].str.replace('"', '', regex=False).str.strip()
    print(f"  Cleaned location and country strings")

    # 4. Fix industry classifications — remap broad labels and reclassify "Other"
    industry_remaps = {
        "Consumer": "Consumer / Tech",
        "Retail": "Retail / Tech",
    }
    df["industry"] = df["industry"].replace(industry_remaps)
    print(f"  Remapped industry labels")

    # 5. Reclassify known companies mislabelled as "Other"
    df = reclassify_other(df)

    # 6. Add a year and month column for easier time-series analysis
    df["year"] = df["date"].dt.year
    df["month"] = df["date"].dt.month
    df["year_month"] = df["date"].dt.to_period("M").astype(str)
    print(f"\n  Added year, month, year_month columns")

    # 7. Filter out rows where both total_laid_off AND percentage_laid_off are null
    before = len(df)
    df = df.dropna(subset=["total_laid_off", "percentage_laid_off"], how="all")
    after = len(df)
    print(f"  Dropped {before - after:,} rows with no layoff data")

    # 8. Round numeric columns
    df["total_laid_off"] = df["total_laid_off"].fillna(0).astype(int)
    df["percentage_laid_off"] = df["percentage_laid_off"].round(2)
    df["funds_raised"] = df["funds_raised"].round(1)

    print(f"  Final row count: {len(df):,}")
    return df

def upload_clean_to_s3(df, bucket, key):
    """Write the cleaned dataframe back to S3 as a new CSV."""
    s3 = boto3.client("s3")
    buffer = io.StringIO()
    df.to_csv(buffer, index=False)
    s3.put_object(Bucket=bucket, Key=key, Body=buffer.getvalue())
    print(f"  Uploaded clean data to s3://{bucket}/{key}")

def main():
    print("=" * 50)
    print(f"Layoffs Transform — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 50)

    print("\n[1] Loading raw data from S3...")
    df = load_from_s3(S3_BUCKET, RAW_KEY)

    print("\n[2] Cleaning data...")
    df_clean = clean_data(df)

    print("\n[3] Uploading clean data to S3...")
    upload_clean_to_s3(df_clean, S3_BUCKET, CLEAN_KEY)

    print("\n[4] Industry distribution (rows with total_laid_off > 0):")
    dist = (
        df_clean[df_clean["total_laid_off"] > 0]
        .groupby("industry", dropna=False)["total_laid_off"]
        .agg(events="count", total_laid_off="sum")
        .sort_values("total_laid_off", ascending=False)
    )
    dist["total_laid_off"] = dist["total_laid_off"].map("{:,}".format)
    print(dist.to_string())

    print("\nDone. Clean data is in S3 at cleaned/layoffs/")

if __name__ == "__main__":
    main()