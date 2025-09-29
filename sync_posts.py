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

def download_image(url):
    """Tải hình ảnh từ URL và lưu vào thư mục assets."""
    try:
        if not url:
            return None

        if not os.path.exists(ASSETS_DIR):
            os.makedirs(ASSETS_DIR)

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

            image_url = post.get('image', '')
            image_path = download_image(image_url)

            download_url = post.get('download_link', '')
            
            # === START MODIFICATION: Lấy SKU và Price ===
            sku = post.get('sku', '')
            price = post.get('price', '')
            # === END MODIFICATION ===
            
            categories_str = post.get('categories', '')
            # Đảm bảo categories được định dạng đúng là YAML array, ví dụ: ["Graphic", "Design"]
            categories_list = [f'"{c.strip()}"' for c in categories_str.split(',') if c.strip()]
            categories_formatted = f"[{', '.join(categories_list)}]"
            
            content = f"""---
title: "{title}"
metadate: "{post.get('metadate', '')}"
categories: {categories_formatted}
image: "{image_path}"
visit: "{post.get('visit', '')}"
date: {post_date.strftime('%Y-%m-%d %H:%M:%S +0700')}
download_url: "{download_url}"
sku: "{sku}"
price: "{price}"
redirect_from: "/redirects/{title_slug}"
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
