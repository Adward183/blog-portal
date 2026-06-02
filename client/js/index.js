let currentPage = 1;
let currentSort = 'new';

document.addEventListener('DOMContentLoaded', function() {
    updateHeader();
    loadPosts();
    loadSidebarCategories();
    loadSidebarTags();
    loadSidebarPopular();

    document.querySelectorAll('.btn-sort').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.btn-sort').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentSort = this.textContent.trim() === 'Популярные' ? 'popular' : 'new';
            loadPosts(1);
        });
    });
});

function updateHeader() {
    const authButtons = document.querySelector('.auth-buttons');
    if (!authButtons) return;

    if (isLoggedIn()) {
        const user = getCurrentUser();
        
        let extraLinks = '';
        
        if (user.role === 'author' || user.role === 'moderator' || user.role === 'admin') {
            extraLinks += '<a href="editor.html" class="btn-write-header">✏️ Написать</a>';
        }
        
        if (user.role === 'moderator' || user.role === 'admin') {
            extraLinks += '<a href="moderation.html" class="btn-moderation">⚡ Модерация</a>';
        }
        
        authButtons.innerHTML = `
            ${extraLinks}
            <a href="profile.html" class="btn-user">Привет, ${user.username}</a>
            <a href="#" class="btn-outline" id="logout-btn">Выйти</a>
        `;
        
        document.getElementById('logout-btn').addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
}

async function loadPosts(page = 1) {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const categoryFilter = urlParams.get('category');

        let sortParam = currentSort === 'popular' ? '&sort=popular' : '';
        let categoryParam = categoryFilter ? '&category=' + encodeURIComponent(categoryFilter) : '';
        
        const data = await apiRequest('/posts/published?page=' + page + '&limit=3' + sortParam + categoryParam);
        const articlesContainer = document.querySelector('.articles');
        const paginationContainer = document.querySelector('.pagination');
        const categoryTitle = document.querySelector('.category-filter-title');

        if (!articlesContainer) return;

        if (categoryFilter) {
            if (categoryTitle) {
                categoryTitle.style.display = 'block';
                categoryTitle.textContent = '📁 Категория: ' + categoryFilter;
            }
        } else {
            if (categoryTitle) {
                categoryTitle.style.display = 'none';
            }
        }

        if (data.posts.length === 0) {
            articlesContainer.innerHTML = '<p class="no-posts">Пока нет опубликованных статей</p>';
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }

        currentPage = data.pagination.currentPage;
        renderPagination(data.pagination);

        articlesContainer.innerHTML = '';

        data.posts.forEach(post => {
            const article = document.createElement('article');
            article.className = 'article-card';

            const date = new Date(post.published_at || post.created_at);
            const formattedDate = date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

            article.innerHTML = `
                ${post.featured_image ? `<img src="${post.featured_image}" alt="${post.title}" class="article-image">` : ''}
                <div class="article-body">
                    <div class="article-meta">
                        <a href="index.html?category=${encodeURIComponent(post.category)}" class="article-category">${post.category}</a>
                        <span class="article-date">${formattedDate}</span>
                    </div>
                    <a href="post.html?id=${post.id}" class="article-title">${post.title}</a>
                    <p class="article-excerpt">${post.excerpt || ''}</p>
                    <div class="article-footer">
                        <a href="profile.html" class="article-author">
                            <span>${post.author_name}</span>
                        </a>
                        <div class="article-stats">
                            <span>👁 ${post.view_count}</span>
                        </div>
                    </div>
                </div>
            `;

            articlesContainer.appendChild(article);
        });

    } catch (error) {
        console.log('Ошибка загрузки постов:', error);
    }
}

function renderPagination(pagination) {
    const container = document.querySelector('.pagination');
    if (!container || pagination.totalPages <= 1) {
        if (container) container.innerHTML = '';
        return;
    }

    let html = '';

    html += `<a href="#" class="page-btn ${pagination.currentPage === 1 ? 'page-btn-disabled' : ''}" data-page="${pagination.currentPage - 1}">←</a>`;

    for (let i = 1; i <= pagination.totalPages; i++) {
        html += `<a href="#" class="page-btn ${i === pagination.currentPage ? 'page-btn-active' : ''}" data-page="${i}">${i}</a>`;
    }

    html += `<a href="#" class="page-btn ${pagination.currentPage === pagination.totalPages ? 'page-btn-disabled' : ''}" data-page="${pagination.currentPage + 1}">→</a>`;

    container.innerHTML = html;

    container.querySelectorAll('.page-btn:not(.page-btn-disabled)').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const page = parseInt(this.getAttribute('data-page'));
            if (page) {
                loadPosts(page);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });
}

async function loadSidebarCategories() {
    try {
        const categories = await apiRequest('/posts/categories/list');
        const container = document.querySelector('.category-list');

        if (!container) return;

        if (categories.length === 0) {
            container.innerHTML = '<p class="no-items">Нет категорий</p>';
            return;
        }

        const emojis = {
            'Программирование': '💻',
            'Дизайн': '🎨',
            'Технологии': '📱',
            'Наука': '🔬',
            'Бизнес': '💼',
            'Образование': '📚',
            'Путешествия': '✈️',
            'Здоровье': '💚',
            'Кулинария': '🍳',
            'Спорт': '⚽',
            'Игры': '🎮',
            'Кино': '🎬',
            'Музыка': '🎵'
        };

        container.innerHTML = '';

        categories.forEach(cat => {
            const item = document.createElement('a');
            item.className = 'category-item';
            item.href = 'index.html?category=' + encodeURIComponent(cat.category);
            item.innerHTML = `
                <span>${emojis[cat.category] || '📄'} ${cat.category}</span>
                <span class="count">${cat.count}</span>
            `;
            container.appendChild(item);
        });

    } catch (error) {
        console.log('Ошибка загрузки категорий:', error);
    }
}

async function loadSidebarTags() {
    try {
        const data = await apiRequest('/posts/published?limit=50');
        const container = document.querySelector('.tags-cloud');

        if (!container) return;

        const allTags = [];
        data.posts.forEach(post => {
            if (post.tags) {
                post.tags.forEach(tag => allTags.push(tag));
            }
        });

        const uniqueTags = [...new Set(allTags)].slice(0, 8);

        if (uniqueTags.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = '';

        uniqueTags.forEach(tag => {
            const tagEl = document.createElement('a');
            tagEl.className = 'tag';
            tagEl.href = 'search.html?tag=' + encodeURIComponent(tag);
            tagEl.textContent = tag;
            container.appendChild(tagEl);
        });

    } catch (error) {
        console.log('Ошибка загрузки тегов:', error);
    }
}

async function loadSidebarPopular() {
    try {
        const data = await apiRequest('/posts/published?limit=5&sort=popular');
        const container = document.querySelector('.popular-list');

        if (!container) return;

        if (data.posts.length === 0) {
            container.innerHTML = '';
            return;
        }

        const sorted = data.posts.sort((a, b) => b.view_count - a.view_count).slice(0, 3);

        container.innerHTML = '';

        sorted.forEach(post => {
            const item = document.createElement('a');
            item.className = 'popular-item';
            item.href = 'post.html?id=' + post.id;
            item.innerHTML = `
                <span class="popular-title">${post.title}</span>
                <span class="popular-views">👁 ${post.view_count}</span>
            `;
            container.appendChild(item);
        });

    } catch (error) {
        console.log('Ошибка загрузки популярного:', error);
    }
}

const searchInput = document.querySelector('.search-input');
if (searchInput) {
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && this.value.trim()) {
            window.location.href = 'search.html?q=' + encodeURIComponent(this.value.trim());
        }
    });
}