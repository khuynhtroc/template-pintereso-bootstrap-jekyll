import gspread
import json
import os
import re
import requests
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime

# Lấy thông tin credentials từ GitHub Secrets
creds_json_str = os.environ['GCP_SA_KEY']
sheet_id = os.environ['SHEET_ID']

# Cấu hình thư mục
POSTS_DIR = "_posts"
ASSETS_DIR = "assets/images"

def slugify(text):
    """Chuyển đổi văn bản sang slug chuẩn."""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)  # Loại bỏ ký tự đặc biệt
    text = re.sub(r'\s+', '-', text)      # Thay thế khoảng trắng bằng dấu gạch ngang
    return text

def download_image(url, posts_dir):
    """Tải hình ảnh từ URL và lưu vào thư mục assets."""
    try:
        if not url:
            return None

        if not os.path.exists(ASSETS_DIR):
            os.makedirs(ASSETS_DIR)

        # Lấy tên file từ URL
        filename = os.path.basename(url.split('?')[0])
        filepath = os.path.join(ASSETS_DIR, filename)

        if os.path.exists(filepath):
            print(f"Hình ảnh đã tồn tại, bỏ qua tải xuống: {filepath}")
            return f"/{ASSETS_DIR}/{filename}"

        response = requests.get(url, stream=True)
        response.raise_for_status()

        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"Hình ảnh đã được tải xuống: {filepath}")
        return f"/{ASSETS_DIR}/{filename}"
    except requests.exceptions.RequestException as e:
        print(f"Lỗi khi tải hình ảnh từ {url}: {e}")
        return None

def main():
    """Tải dữ liệu từ Google Sheet và tạo các bài đăng Jekyll."""
    try:
        # Xác thực với Google Sheets API
        creds_dict = json.loads(creds_json_str)
        scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
        creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
        client = gspread.authorize(creds)

        # Mở spreadsheet và worksheet
        sheet = client.open_by_key(sheet_id).sheet1

        # Lấy tất cả dữ liệu dưới dạng danh sách các dictionary
        posts = sheet.get_all_records()

        # Tạo thư mục _posts nếu chưa tồn tại
        if not os.path.exists(POSTS_DIR):
            os.makedirs(POSTS_DIR)

        print(f"Tìm thấy {len(posts)} bài viết trong Google Sheet.")

        for post in posts:
            title = post.get('title')
            if not title:
                continue

            # Lấy ngày tháng và định dạng lại
            post_date_str = str(post.get('date', ''))
            try:
                post_date = datetime.strptime(post_date_str, '%Y-%m-%d')
                date_prefix = post_date.strftime('%Y-%m-%d')
            except ValueError:
                print(f"Bỏ qua bài viết '{title}' do định dạng ngày không hợp lệ: {post_date_str}")
                continue

            # Tạo tên file chuẩn Jekyll
            title_slug = slugify(title)
            filename = f"{date_prefix}-{title_slug}.md"
            filepath = os.path.join(POSTS_DIR, filename)
            
            # Tải ảnh và lấy đường dẫn mới
            image_url = post.get('image', '')
            image_path = download_image(image_url, POSTS_DIR)
            
            # Xử lý categories: chuyển từ chuỗi sang danh sách chuỗi
            categories_str = post.get('categories', '')
            categories_list = [f'"{c.strip()}"' for c in categories_str.split(',') if c.strip()]
            categories_formatted = f"[{', '.join(categories_list)}]"
            
            # Tạo nội dung file markdown với Front Matter
            content = f"""---
title: "{title}"
metadate: "{post.get('metadate', '')}"
layout: "{post.get('layout', '')}"
categories: {categories_formatted}
image: "{image_path}"
visit: "{post.get('visit', '')}"
date: {post_date.strftime('%Y-%m-%d %H:%M:%S +0700')}
---

{post.get('content', '')}
"""

            # Ghi file
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)

            print(f"Đã tạo/cập nhật file: {filename}")
            
    except Exception as e:
        print(f"Đã xảy ra lỗi: {e}")

if __name__ == "__main__":
    main()