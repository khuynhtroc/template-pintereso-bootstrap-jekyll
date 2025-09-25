import gspread
import json
import os
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime

# Lấy thông tin credentials từ GitHub Secrets
creds_json_str = os.environ['GCP_SA_KEY']
sheet_id = os.environ['SHEET_ID']

# Xác thực với Google Sheets API
creds_dict = json.loads(creds_json_str)
scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
client = gspread.authorize(creds)

# Mở spreadsheet và worksheet
sheet = client.open_by_key(sheet_id).sheet1

# Lấy tất cả dữ liệu dưới dạng danh sách các dictionary
posts = sheet.get_all_records()

# Đường dẫn tới thư mục _posts
posts_dir = "_posts"
if not os.path.exists(posts_dir):
    os.makedirs(posts_dir)

print(f"Tìm thấy {len(posts)} bài viết trong Google Sheet.")

for post in posts:
    # Lấy ngày tháng và định dạng lại
    post_date_str = str(post['date'])
    try:
        # Chuyển đổi ngày tháng sang đối tượng datetime
        post_date = datetime.strptime(post_date_str, '%Y-%m-%d')
        date_prefix = post_date.strftime('%Y-%m-%d')
    except ValueError:
        print(f"Bỏ qua bài viết '{post['title']}' do định dạng ngày không hợp lệ: {post_date_str}")
        continue

    # Tạo tên file chuẩn Jekyll: YYYY-MM-DD-tieu-de-bai-viet.md
    title_slug = post['title'].lower().strip().replace(' ', '-')
    filename = f"{date_prefix}-{title_slug}.md"
    filepath = os.path.join(posts_dir, filename)

    # Tạo nội dung file markdown với Front Matter
    content = f"""---
title: "{post['title']}"
metadate: "{post['metadate']}"
layout: {post['layout']}
categories: [{post['categories']}]
image: "{post['image']}"
visit: "{post['visit']}"
date: {post_date.strftime('%Y-%m-%d %H:%M:%S +0700')}
---

{post['content']}
"""

    # Ghi file
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Đã tạo/cập nhật file: {filename}")

print("Đồng bộ hoàn tất!")