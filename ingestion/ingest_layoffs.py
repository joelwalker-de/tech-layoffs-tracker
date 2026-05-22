import boto3
import pandas as pd
import os
from datetime import datetime

# --- Config ---
RAW_DATA_PATH = os.path.expanduser("~/projects/layoffs-tracker/data/layoffs.csv")
S3_BUCKET = "joel-walker-portfolio"
S3_KEY = "raw/layoffs/layoffs.csv"

def validate_data(df):
    """Check the data looks right before we upload anything."""
    required_columns = [
        "company", "location", "total_laid_off", "date",
        "percentage_laid_off", "industry", "stage", "funds_raised", "country"
    ]
    missing = [col for col in required_columns if col not in df.columns]
    if missing:
        raise ValueError(f"Missing columns: {missing}")
    
    print(f"  Row count     : {len(df):,}")
    print(f"  Columns       : {list(df.columns)}")
    print(f"  Date range    : {df['date'].min()} → {df['date'].max()}")
    print(f"  Nulls in total_laid_off: {df['total_laid_off'].isna().sum():,}")
    print(f"  Industries    : {df['industry'].nunique()} unique")
    print(f"  Countries     : {df['country'].nunique()} unique")

def upload_to_s3(local_path, bucket, key):
    """Upload the raw CSV to S3."""
    s3 = boto3.client("s3")
    s3.upload_file(local_path, bucket, key)
    print(f"  Uploaded to s3://{bucket}/{key}")

def main():
    print("=" * 50)
    print(f"Layoffs Ingestion — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 50)

    print("\n[1] Loading raw data...")
    df = pd.read_csv(RAW_DATA_PATH)

    print("\n[2] Validating data...")
    validate_data(df)

    print("\n[3] Uploading to S3...")
    upload_to_s3(RAW_DATA_PATH, S3_BUCKET, S3_KEY)

    print("\nDone. Raw data is now in S3.")

if __name__ == "__main__":
    main()