// scripts/sync_supabase.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { glob } = require('glob');

// Lấy thông tin kết nối từ biến môi trường của GitHub Action
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Dùng Service Key!

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Service Key is missing!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncPosts() {
    // Tìm tất cả các file markdown trong thư mục _posts
    const postFiles = await glob('_posts/**/*.md');
    
    if (postFiles.length === 0) {
        console.log('No posts found to sync.');
        return;
    }

    console.log(`Found ${postFiles.length} posts. Preparing to sync...`);

    const productsToUpsert = postFiles.map(filePath => {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const { data: frontMatter } = matter(fileContent); // Chỉ lấy front matter
        
        // Tạo slug từ tên file, ví dụ: 2025-09-29-san-pham-a.md -> san-pham-a
        const slug = path.basename(filePath, '.md').substring(11);

        return {
            slug: slug,
            name: frontMatter.title,
            description: frontMatter.description,
            price: frontMatter.price,
            sku: frontMatter.sku,
            download_url: frontMatter.download_url,
            categories: frontMatter.categories,
            date: date,
            // Thêm các trường khác nếu có
        };
    });

    // Sử dụng 'upsert' để chèn mới hoặc cập nhật nếu đã tồn tại dựa trên cột 'slug'
    const { data, error } = await supabase
        .from('products')
        .upsert(productsToUpsert, { onConflict: 'slug' });

    if (error) {
        console.error('Error syncing data to Supabase:', error);
        process.exit(1);
    }

    console.log(`Successfully upserted ${productsToUpsert.length} products to Supabase.`);
}

syncPosts();
