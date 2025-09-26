#!/usr/bin/env python3
"""
scrape_fb_public.py
Scraper for public Facebook pages using mbasic.facebook.com (mobile basic).
- Extracts posts (caption, image), extracts download links from comments (supports links with spaces inside).
- Saves posts as Jekyll posts in _posts/
- Keeps processed.json to avoid duplicates
- Optionally uploads images to S3 and writes image URL to front-matter (recommended)
Usage:
  python scrape_fb_public.py --page PAGE_USERNAME --out _posts --assets assets/images --limit 30 --upload-s3
"""

import os
import re
import time
import json
import random
import logging
import argparse
from urllib.parse import urljoin, urlparse
from datetime import datetime
from slugify import slugify
from bs4 import BeautifulSoup
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Optional S3
try:
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError
    BOTO3_AVAILABLE = True
except Exception:
    BOTO3_AVAILABLE = False

# Config
BASE = "https://mbasic.facebook.com"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
PROCESSED_FILE = "processed.json"

# Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("fb-scraper")

# HTTP session with retries
def make_session():
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})
    retries = Retry(total=5, backoff_factor=1, status_forcelist=[429,500,502,503,504])
    adapter = HTTPAdapter(max_retries=retries)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session

session = make_session()

# -------------------------
# Helpers
# -------------------------
def extract_first_url(text):
    """Extract first URL from text that may contain spaces/obfuscation and normalize it."""
    if not text:
        return None
    t = text.replace("\n", " ")
    # find sequence that looks like a URL possibly with spaces in between parts
    # we'll match https?:// followed by anything until whitespace, but allow internal spaces; then remove spaces
    m = re.search(r'(https?://[^\s]+|www\.[^\s]+)', t)
    if not m:
        # try looser: find 'http' then take up to 200 chars and remove spaces/dots duplicated
        m2 = re.search(r'(https?://[^\s]{0,200})', t)
        if not m2:
            return None
        raw = m2.group(0)
    else:
        raw = m.group(0)
    # Some people obfuscate like "terabox.    com" or "terabox . com" -> remove spaces around dots and all whitespace inside host path
    # Strategy: remove ALL whitespace inside raw URL, then normalize repeated dots:
    cleaned = re.sub(r'\s+', '', raw)
    # also fix cases like "http://example . com" where a space may be before dot
    cleaned = re.sub(r'\.\s*\.', '.', cleaned)
    # If starts with "www." add http://
    if cleaned.startswith("www."):
        cleaned = "http://" + cleaned
    # Quick validation minimal: has a dot after protocol/domain
    try:
        parsed = urlparse(cleaned)
        if not parsed.scheme:
            cleaned = "http://" + cleaned
            parsed = urlparse(cleaned)
        if "." not in parsed.netloc:
            return None
    except Exception:
        return None
    return cleaned

def load_processed(path=PROCESSED_FILE):
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return set(data)
        except Exception:
            logger.warning("processed.json corrupted, starting fresh")
            return set()
    return set()

def save_processed(processed_set, path=PROCESSED_FILE):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(list(processed_set), f, ensure_ascii=False, indent=2)

def safe_filename(s):
    return re.sub(r'[\\/:"*?<>|]+', '-', s)

# -------------------------
# Scrape logic
# -------------------------
def fetch_page_index(page_username, limit_links=50):
    """
    Fetch mbasic page index and collect candidate post links.
    Returns list of full URLs to individual posts (mbasic links)
    """
    url = f"{BASE}/{page_username}"
    links = []
    visited = set()
    count = 0
    for page in range(0, 10):  # attempt multiple pages of listing (basic pagination)
        logger.info(f"Fetching index: {url}")
        r = session.get(url, timeout=30)
        if r.status_code != 200:
            logger.warning(f"Status {r.status_code} for {url}")
            break
        soup = BeautifulSoup(r.text, "html.parser")
        for a in soup.find_all("a", href=True):
            href = a['href']
            if any(x in href for x in ("/story.php", "/permalink.php", "/photo.php", "/posts/")):
                full = urljoin(BASE, href)
                if full not in visited:
                    visited.add(full)
                    links.append(full)
                    count += 1
                    if count >= limit_links:
                        return links
        # find "See more" or next link
        more = None
        for a in soup.find_all("a", href=True):
            text = a.get_text().strip().lower()
            if text in ("see more", "xem thêm", "next", "older posts", "load more posts"):
                more = urljoin(BASE, a['href'])
                break
        if not more:
            # try link with "m_more_item" id/class
            next_link = soup.find("a", string=re.compile("See more|Xem thêm|Older"))
            if next_link and next_link.has_attr("href"):
                more = urljoin(BASE, next_link['href'])
        if not more:
            break
        url = more
        time.sleep(random.uniform(1.5, 3.5))
    return links

def parse_post_page(post_url):
    """
    Parse an individual post page (mbasic)
    Returns dict: {id, url, date, message, image_url, download_url}
    """
    logger.info(f"Parsing post: {post_url}")
    r = session.get(post_url, timeout=30)
    if r.status_code != 200:
        logger.warning(f"Status {r.status_code} for {post_url}")
        return None
    soup = BeautifulSoup(r.text, "html.parser")

    # ID: try to get from URL query or path
    post_id = None
    parsed = urlparse(post_url)
    q = parsed.query
    if "story_fbid=" in q:
        m = re.search(r"story_fbid=(\d+)", q)
        if m:
            post_id = m.group(1)
    # fallback: use path
    if not post_id:
        # generate an id from path + timestamp
        post_id = re.sub(r'\W+', '-', parsed.path).strip('-')

    # message: in mbasic it's often in divs, try multiple heuristics
    message = ""
    # the main message is often in the first div with data-ft or the one before "Like" link
    # simple heuristic:
    main_div = None
    for div in soup.find_all("div"):
        if div.get("data-ft") and div.get_text(strip=True):
            main_div = div
            break
    if main_div:
        message = main_div.get_text(separator="\n").strip()
    else:
        # fallback: find big text blocks
        ptexts = [d.get_text(separator="\n").strip() for d in soup.find_all("div") if d.get_text(strip=True)]
        message = ptexts[0] if ptexts else ""

    # date: find timestamp link
    date_str = None
    date_a = soup.find("a", href=True)
    if date_a and date_a.get_text(strip=True):
        date_text = date_a.get_text(strip=True)
        # not always machine parseable; we'll use current time if not found
        date_str = date_text

    # image: find first <img> inside article area but avoid profile images; heuristic: big images have src with "scontent"
    image_url = None
    # find image tags that are direct children of a <div role="article"> maybe not present
    for img in soup.find_all("img"):
        src = img.get("src")
        if not src:
            continue
        # skip tiny icons (src containing "emoji.php" or "profile_pic")
        if any(x in src for x in ("emoji.php", "profile_pic")):
            continue
        # heuristics: if src contains 'scontent' or '/photo.php' or is not a data: URI
        if src.startswith("http"):
            image_url = src
            break

    # comments: find blocks with comments, extract link
    download_link = None
    # search for any text nodes containing http or www, prioritize comments area
    text_nodes = soup.find_all(text=True)
    for t in text_nodes:
        txt = t.strip()
        if not txt:
            continue
        if "http" in txt or "www." in txt:
            link = extract_first_url(txt)
            if link:
                download_link = link
                break

    # fallback: look for "See more comments" link and fetch comment page (skipped for simplicity)
    return {
        "id": post_id,
        "url": post_url,
        "date_text": date_str,
        "message": message,
        "image_url": image_url,
        "download_url": download_link
    }

# -------------------------
# S3 helper
# -------------------------
class S3Client:
    def __init__(self, bucket, region=None, prefix=""):
        if not BOTO3_AVAILABLE:
            raise RuntimeError("boto3 not installed")
        self.bucket = bucket
        self.s3 = boto3.client("s3")
        self.prefix = prefix.strip("/")

    def upload_fileobj(self, fileobj, key, acl="public-read"):
        s3key = f"{self.prefix}/{key}" if self.prefix else key
        try:
            self.s3.upload_fileobj(fileobj, self.bucket, s3key, ExtraArgs={"ACL": acl})
            url = f"https://{self.bucket}.s3.amazonaws.com/{s3key}"
            return url
        except (BotoCoreError, ClientError) as e:
            logger.error(f"S3 upload error: {e}")
            return None

    def upload_from_url(self, url, key):
        # stream download and upload
        r = session.get(url, stream=True, timeout=60)
        if r.status_code != 200:
            logger.warning(f"Failed to download {url} for S3 upload")
            return None
        from io import BytesIO
        bio = BytesIO()
        for chunk in r.iter_content(chunk_size=8192):
            if chunk:
                bio.write(chunk)
        bio.seek(0)
        return self.upload_fileobj(bio, key)

# -------------------------
# Create Jekyll post
# -------------------------
def create_jekyll_post(output_dir, assets_dir, post_obj, image_hosted_url=None):
    message = post_obj.get("message", "").strip()
    created = datetime.utcnow().isoformat()
    post_id = post_obj.get("id")
    slug_base = slugify(message[:60] or f"fb-post-{post_id}")
    date_prefix = datetime.utcnow().strftime("%Y-%m-%d")
    filename = f"{date_prefix}-{slug_base}.md"
    filepath = os.path.join(output_dir, filename)

    front = []
    title = f"Facebook post {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"
    front.append("---")
    front.append(f"title: \"{title}\"")
    front.append(f"date: {created}")
    front.append("layout: post")
    if image_hosted_url:
        front.append(f'image: "{image_hosted_url}"')
    if post_obj.get("download_url"):
        front.append(f'download_url: "{post_obj.get("download_url")}"')
    front.append('categories: [facebook]')
    front.append('tags: [facebook, imported]')
    front.append(f'original_post: "{post_obj.get("url")}"')
    front.append("---\n")

    body = message + "\n"
    os.makedirs(output_dir, exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write("\n".join(front))
        f.write(body)
    logger.info(f"Created Jekyll post: {filepath}")
    return filepath

# -------------------------
# Main pipeline
# -------------------------
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--page", required=True, help="Page username (public), e.g. anhpng")
    parser.add_argument("--out", default="_posts", help="Jekyll posts output dir")
    parser.add_argument("--assets", default="assets/images", help="Local assets dir (if not using S3)")
    parser.add_argument("--limit", type=int, default=30, help="Max posts to check on index")
    parser.add_argument("--upload-s3", action="store_true", help="Upload images to S3 instead of saving locally")
    parser.add_argument("--s3-bucket", default="", help="S3 bucket name (required if --upload-s3)")
    parser.add_argument("--s3-prefix", default="", help="S3 prefix/folder")
    parser.add_argument("--commit-images", action="store_true", help="If true and not using S3, images saved to assets will be committed by GH action")
    args = parser.parse_args()

    processed = load_processed()
    new_processed = set(processed)

    s3client = None
    if args.upload_s3:
        if not BOTO3_AVAILABLE:
            logger.error("boto3 is required for S3 upload. pip install boto3")
            return
        if not args.s3_bucket:
            logger.error("S3 bucket is required when --upload-s3 is set")
            return
        s3client = S3Client(args.s3_bucket, prefix=args.s3_prefix)

    # get links from page index
    post_links = fetch_page_index(args.page, limit_links=args.limit)
    logger.info(f"Found {len(post_links)} candidate posts")

    for link in post_links:
        # polite delay
        time.sleep(random.uniform(1.8, 4.2))

        parsed = urlparse(link)
        # get an ID-like key
        key = link
        if key in processed or key in new_processed:
            logger.info(f"Skipping already processed: {link}")
            continue

        try:
            data = parse_post_page(link)
            if not data:
                continue

            # If image exists, handle it
            image_hosted = None
            if data.get("image_url"):
                if s3client:
                    # generate s3 key
                    ext = os.path.splitext(urlparse(data["image_url"]).path)[1] or ".jpg"
                    safe_key = safe_filename(f"{data['id']}{ext}")
                    logger.info(f"Uploading image to S3: {data['image_url']}")
                    image_hosted = s3client.upload_from_url(data["image_url"], safe_key)
                    if not image_hosted:
                        logger.warning("S3 upload failed, will fallback to original URL")
                        image_hosted = data["image_url"]
                else:
                    # save local
                    os.makedirs(args.assets, exist_ok=True)
                    ext = os.path.splitext(urlparse(data["image_url"]).path)[1] or ".jpg"
                    fname = safe_filename(f"{data['id']}{ext}")
                    dest = os.path.join(args.assets, fname)
                    try:
                        r = session.get(data["image_url"], stream=True, timeout=30)
                        if r.status_code == 200:
                            with open(dest, "wb") as f:
                                for chunk in r.iter_content(chunk_size=8192):
                                    if chunk:
                                        f.write(chunk)
                            image_hosted = "/" + os.path.relpath(dest).replace("\\", "/")
                        else:
                            logger.warning(f"Failed to download image {data['image_url']}")
                    except Exception as e:
                        logger.warning(f"Error downloading image: {e}")
                        image_hosted = data["image_url"]

            # create jekyll post
            create_jekyll_post(args.out, args.assets, data, image_hosted_url=image_hosted)

            # mark processed by link (unique)
            new_processed.add(key)
            # small delay to avoid hammering
            time.sleep(random.uniform(0.8, 2.0))
        except Exception as e:
            logger.exception(f"Error processing {link}: {e}")
            # do not stop whole run

    # save processed
    save_processed(new_processed)
    logger.info("Done. Processed saved to processed.json")

if __name__ == "__main__":
    main()
