let currentFilter = 'review';

document.addEventListener('DOMContentLoaded', function() {
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    const user = getCurrentUser();
    if (user.role !== 'moderator' && user.role !== 'admin') {
        alert('Нет доступа');
        window.location.href = 'index.html';
        return;
    }

    loadPosts();
});

function filterPosts(status) {
    currentFilter = status;
    document.querySelectorAll('.mod-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    loadPosts();
}

async function loadPosts() {
    try {
        let posts;
        if (currentFilter === 'review') {
            posts = await apiRequest('/posts/review/all');
        } else {
            const data = await apiRequest('/posts/published');
            posts = data.posts;
        }

        const container = document.querySelector('.moderation-list');

        if (!container) return;

        if (posts.length === 0) {
            container.innerHTML = '<p class="no-items">Нет постов</p>';
            return;
        }

        container.innerHTML = '';

        posts.forEach(post => {
            const date = new Date(post.created_at);
            const card = document.createElement('div');
            card.className = 'moderation-card';
            card.id = 'post-' + post.id;
            card.innerHTML = `
                <div class="moderation-card-header">
                    <span class="post-status ${post.status === 'published' ? 'status-published' : 'status-review'}">
                        ${post.status === 'published' ? 'Опубликовано' : 'На проверке'}
                    </span>
                    <span class="post-date">${date.toLocaleDateString('ru-RU')}</span>
                </div>
                <a href="post.html?id=${post.id}" class="moderation-post-title">${post.title}</a>
                <p class="moderation-post-excerpt">${post.excerpt || ''}</p>
                <div class="moderation-post-meta">
                    <span>👤 ${post.author_name || 'Неизвестен'}</span>
                    <span>📁 ${post.category}</span>
                </div>
                ${post.status === 'review' ? `
                <div class="moderation-actions">
                    <button class="btn-approve" onclick="moderate(${post.id}, 'approve')">✅ Одобрить</button>
                    <button class="btn-reject" onclick="moderate(${post.id}, 'reject')">❌ Отклонить</button>
                </div>
                ` : ''}
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.log('Ошибка:', error);
    }
}

async function moderate(postId, action) {
    try {
        await apiRequest('/posts/' + postId + '/moderate', {
            method: 'PATCH',
            body: JSON.stringify({ action: action })
        });
        loadPosts();
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}