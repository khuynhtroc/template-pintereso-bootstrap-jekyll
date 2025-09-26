import gspread
import json
import os
import re
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime

# Lấy thông tin credentials từ GitHub Secrets
creds_json_str = os.environ['GCP_SA_KEY']
sheet_id = os.environ['SHEET_ID']

# Cấu hình thư mục
POSTS_DIR = "_posts"
ASSETS_DIR = "assets/images"
REDIRECTS_DIR = "redirects"

def slugify(text):
    """Chuyển đổi văn bản tiếng Việt có dấu sang slug không dấu."""
    text = text.lower().strip()
    text = re.sub(r'[àáạảãâầấậẩẫăằắặẳẵ]', 'a', text)
    text = re.sub(r'[èéẹẻẽêềếệểễ]', 'e', text)
    text = re.sub(r'[ìíịỉĩ]', 'i', text)
    text = re.sub(r'[òóọỏõôồốộổỗơờớợởỡ]', 'o', text)
    text = re.sub(r'[ùúụủũưừứựửữ]', 'u', text)
    text = re.sub(r'[ỳýỵỷỹ]', 'y', text)
    text = re.sub(r'[đ]', 'd', text)
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'\s+', '-', text)
    return text

def main():
    """Tải dữ liệu từ Google Sheet và tạo các bài đăng Jekyll."""
    try:
        # Xác thực với Google Sheets API
        creds_dict = json.loads(os.environ['GCP_SA_KEY'])
        scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
        creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
        client = gspread.authorize(creds)

        # Mở spreadsheet và worksheet
        sheet = client.open_by_key(os.environ['SHEET_ID']).sheet1

        # Lấy tất cả dữ liệu dưới dạng danh sách các dictionary
        posts_data = sheet.get_all_records()
        all_cells = sheet.get_all_cells()
        header_row = [cell.value for cell in all_cells if cell.row == 1]
        
        # Tìm chỉ số cột 'synced'
        try:
            synced_col_index = header_row.index('synced') + 1
        except ValueError:
            print("Cột 'synced' không tồn tại. Vui lòng thêm cột này vào Google Sheet của bạn.")
            return

        # Tạo thư mục _posts nếu chưa tồn tại
        if not os.path.exists(POSTS_DIR):
            os.makedirs(POSTS_DIR)
        if not os.path.exists(REDIRECTS_DIR):
            os.makedirs(REDIRECTS_DIR)

        print(f"Tìm thấy {len(posts_data)} hàng trong Google Sheet.")

        for index, post in enumerate(posts_data):
            row_index = index + 2

            if post.get('synced') == 'DONE':
                print(f"Hàng '{post.get('title')}' đã được đồng bộ, bỏ qua.")
                continue

            title = post.get('title')
            if not title:
                print(f"Bỏ qua hàng {row_index} vì không có tiêu đề.")
                continue

            post_date_str = str(post.get('date', ''))
            try:
                post_date = datetime.strptime(post_date_str, '%Y-%m-%d')
                date_prefix = post_date.strftime('%Y-%m-%d')
            except ValueError:
                print(f"Bỏ qua bài viết '{title}' do định dạng ngày không hợp lệ: {post_date_str}")
                continue

            title_slug = slugify(title)
            filename = f"{date_prefix}-{title_slug}.md"
            filepath = os.path.join(POSTS_DIR, filename)

            download_link = post.get('download_link', '')
            redirect_path = ""
            if download_link:
                redirect_filename = f"{title_slug}.md"
                redirect_filepath = os.path.join(REDIRECTS_DIR, redirect_filename)
                
                # Tạo file redirect
                redirect_content = f"""---
permalink: /redirects/{title_slug}
download_url: "{download_link}"
layout: "redirect"
---
"""
                with open(redirect_filepath, 'w', encoding='utf-8') as f:
                    f.write(redirect_content)
                print(f"Đã tạo file chuyển hướng: {redirect_filename}")
                redirect_path = f"/redirects/{title_slug}"

            # Tạo nội dung bài viết chính
            content = f"""---
title: "{title}"
metadate: "{post.get('metadate', '')}"
categories: {post.get('categories', '[]')}
image: "{post.get('image', '')}"
visit: "{post.get('visit', '')}"
date: {post_date.strftime('%Y-%m-%d %H:%M:%S +0700')}
download_url: "{redirect_path}"
---
{post.get('content', '')}
"""
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)

            print(f"Đã tạo/cập nhật file: {filename}")

            try:
                sheet.update_cell(row_index, synced_col_index, 'DONE')
                print(f"Đã cập nhật trạng thái đồng bộ cho hàng {row_index}.")
            except Exception as e:
                print(f"Lỗi khi cập nhật Google Sheet: {e}")
            
    except Exception as e:
        print(f"Đã xảy ra lỗi tổng thể: {e}")

if __name__ == "__main__":
    main()
