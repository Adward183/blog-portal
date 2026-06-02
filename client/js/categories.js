document.addEventListener('DOMContentLoaded', function() {
    updateHeader();
    loadCategories();
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

async function loadCategories() {
    try {
        const categories = await apiRequest('/posts/categories/list');
        const container = document.querySelector('.categories-grid');

        if (!container) return;

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

        if (categories.length === 0) {
            container.innerHTML = '<p class="no-items">Нет категорий</p>';
            return;
        }

        container.innerHTML = '';

        categories.forEach(cat => {
            const card = document.createElement('a');
            card.className = 'category-card';
            card.href = 'index.html?category=' + encodeURIComponent(cat.category);
            card.innerHTML = `
                <span class="category-card-icon">${emojis[cat.category] || '📄'}</span>
                <span class="category-card-name">${cat.category}</span>
                <span class="category-card-count">${cat.count} статей</span>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.log('Ошибка загрузки категорий:', error);
    }
}