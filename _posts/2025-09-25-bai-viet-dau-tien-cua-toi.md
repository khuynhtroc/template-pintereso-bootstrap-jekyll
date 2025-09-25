---
title: "Bài Viết Đầu Tiên Của Tôi"
metadate: "hide"
layout: ""
categories: ["Graphic"]
image: "/assets/images/iso.jpg"
visit: "#"
date: 2025-09-25 00:00:00 +0700
download_url: "#"
---

Graphic Elements

<div style="text-align: center; margin-top: 2rem;">
    {% if page.download_url %}
    <a href="{{ page.download_url }}" class="btn" style="
        background-color: #3B82F6; /* Blue-500 */
        color: white;
        padding: 0.75rem 1.5rem;
        border-radius: 0.5rem;
        text-decoration: none;
        font-weight: bold;
        transition: background-color 0.3s;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    ">
        <i class="fas fa-download"></i> Tải về
    </a>
    {% endif %}
</div>
