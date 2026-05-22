import boto3
import pandas as pd
import io
import os
from datetime import datetime

# --- Config ---
S3_BUCKET = "joel-walker-portfolio"
RAW_KEY = "raw/layoffs/layoffs.csv"
CLEAN_KEY = "cleaned/layoffs/layoffs_cleaned.csv"

def load_from_s3(bucket, key):
    """Read the raw CSV directly from S3 into a dataframe."""
    s3 = boto3.client("s3")
    obj = s3.get_object(Bucket=bucket, Key=key)
    df = pd.read_csv(io.BytesIO(obj["Body"].read()))
    print(f"  Loaded {len(df):,} rows from s3://{bucket}/{key}")
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

    # 4. Fix industry classifications — remap big tech companies
    industry_remaps = {
        "Consumer": "Consumer / Tech",
        "Retail": "Retail / Tech",
    }
    df["industry"] = df["industry"].replace(industry_remaps)
    print(f"  Remapped industry labels")

    # 5. Add a year and month column for easier time-series analysis
    df["year"] = df["date"].dt.year
    df["month"] = df["date"].dt.month
    df["year_month"] = df["date"].dt.to_period("M").astype(str)
    print(f"  Added year, month, year_month columns")

    # 6. Filter out rows where both total_laid_off AND percentage_laid_off are null
    before = len(df)
    df = df.dropna(subset=["total_laid_off", "percentage_laid_off"], how="all")
    after = len(df)
    print(f"  Dropped {before - after:,} rows with no layoff data")

    # 7. Round numeric columns
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

    print("\nDone. Clean data is in S3 at cleaned/layoffs/")

if __name__ == "__main__":
    main()