import gspread
import json
import os
import re
import requests
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime

# Get credentials from GitHub Secrets
creds_json_str = os.environ['GCP_SA_KEY']
sheet_id = os.environ['SHEET_ID']

# Directory configurations
POSTS_DIR = "_posts"
ASSETS_DIR = "assets/images"

def slugify(text):
    """
    Converts Vietnamese text to a standard slug,
    handling accented characters.
    """
    text = text.lower().strip()
    text = re.sub(r'[àáạảãăắằẳẵặâầấẩẫậ]', 'a', text)
    text = re.sub(r'[èéẹẻẽêềếểễệ]', 'e', text)
    text = re.sub(r'[ìíịỉĩ]', 'i', text)
    text = re.sub(r'[òóọỏõôồốổỗộơờớởỡợ]', 'o', text)
    text = re.sub(r'[ùúụủũưừứửữự]', 'u', text)
    text = re.sub(r'[ỳýỵỷỹ]', 'y', text)
    text = re.sub(r'[đ]', 'd', text)
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'\s+', '-', text)
    return text

def download_image(url):
    """Downloads an image from a URL and saves it to the assets directory."""
    try:
        if not url:
            print("URL hình ảnh trống, bỏ qua tải xuống.")
            return None

        if not os.path.exists(ASSETS_DIR):
            os.makedirs(ASSETS_DIR)

        # Get the filename from the URL, removing query parameters
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
    """Fetches data from Google Sheet and creates Jekyll posts."""
    try:
        print("Bắt đầu quy trình đồng bộ...")
        
        # Authenticate with Google Sheets API
        print("Đang xác thực với Google Sheets API...")
        creds_dict = json.loads(creds_json_str)
        scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
        creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
        client = gspread.authorize(creds)
        print("Xác thực thành công.")

        # Open the spreadsheet and worksheet
        print(f"Đang mở Google Sheet với ID: {sheet_id}")
        sheet = client.open_by_key(sheet_id).sheet1

        # Fetch all records as a list of dictionaries
        posts_data = sheet.get_all_records()
        if not posts_data:
            print("Không có dữ liệu nào trong Google Sheet. Dừng quá trình đồng bộ.")
            return

        all_cells = sheet.get_all_cells()
        header_row = [cell.value for cell in all_cells if cell.row == 1]
        
        # Find the index of the 'synced' column
        try:
            synced_col_index = header_row.index('synced') + 1 # gspread uses 1-based indexing
        except ValueError:
            print("Lỗi: Cột 'synced' không tồn tại. Vui lòng thêm cột này vào Google Sheet của bạn.")
            return

        # Create the _posts directory if it doesn't exist
        if not os.path.exists(POSTS_DIR):
            os.makedirs(POSTS_DIR)

        print(f"Tìm thấy {len(posts_data)} hàng trong Google Sheet.")

        for index, post in enumerate(posts_data):
            row_index = index + 2 # row 1 is the header

            # Check sync status
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

            categories_str = post.get('categories', '')
            categories_list = [f'"{c.strip()}"' for c in categories_str.split(',') if c.strip()]
            categories_formatted = f"[{', '.join(categories_list)}]"
            
            content = f"""---
title: "{title}"
metadate: "{post.get('metadate', '')}"
categories: {categories_formatted}
image: "{image_path}"
visit: "{post.get('visit', '')}"
date: {post_date.strftime('%Y-%m-%d %H:%M:%S +0700')}
---

{post.get('content', '')}
"""
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)

            print(f"Đã tạo/cập nhật file: {filename}")

            # Update sync status in Google Sheet
            try:
                print(f"Đang cập nhật trạng thái đồng bộ cho hàng {row_index}...")
                sheet.update_cell(row_index, synced_col_index, 'DONE')
                print(f"Đã cập nhật trạng thái đồng bộ thành công cho hàng {row_index}.")
            except gspread.exceptions.APIError as api_e:
                print(f"Lỗi API khi cập nhật Google Sheet: {api_e.response.text}")
                print("Lỗi này thường xảy ra do thiếu quyền. Hãy kiểm tra lại quyền của tài khoản dịch vụ.")
            except Exception as e:
                print(f"Lỗi không xác định khi cập nhật Google Sheet: {e}")
            
    except Exception as e:
        print(f"Đã xảy ra lỗi tổng thể: {e}")
        print("Vui lòng kiểm tra lại cấu hình GitHub Secrets và kết nối.")

if __name__ == "__main__":
    main()