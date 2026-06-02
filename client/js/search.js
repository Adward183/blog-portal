document.addEventListener('DOMContentLoaded', function() {
    updateHeader();
    
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q') || urlParams.get('tag') || '';
    
    if (query) {
        document.querySelector('.search-input-big').value = query;
        searchPosts(query, urlParams.get('tag') ? 'tag' : 'search');
    }
});

function updateHeader() {
    const authButtons = document.querySelector('.auth-buttons');
    if (!authButtons) return;

    if (isLoggedIn()) {
        const user = getCurrentUser();
        authButtons.innerHTML = `
            <a href="profile.html" class="btn-user">Привет, ${user.username}</a>
            <a href="#" class="btn-outline" id="logout-btn">Выйти</a>
        `;
        document.getElementById('logout-btn').addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
}

document.querySelector('.search-btn').addEventListener('click', function() {
    const query = document.querySelector('.search-input-big').value.trim();
    if (query) {
        searchPosts(query, 'search');
    }
});

document.querySelector('.search-input-big').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const query = this.value.trim();
        if (query) {
            searchPosts(query, 'search');
        }
    }
});

async function searchPosts(query, type) {
    const resultsContainer = document.querySelector('.search-results');
    const resultText = document.querySelector('.search-result-text');
    
    resultsContainer.innerHTML = '<p class="loading">Поиск...</p>';

    try {
        let url = '/posts/published?';
        if (type === 'tag') {
            url += 'tag=' + encodeURIComponent(query);
        } else {
            url += 'search=' + encodeURIComponent(query);
        }

        const data = await apiRequest(url);
        
        resultText.textContent = 'Найдено: ' + data.pagination.totalPosts + ' статей по запросу "' + query + '"';

        if (data.posts.length === 0) {
            resultsContainer.innerHTML = '<p class="no-results">Ничего не найдено</p>';
            return;
        }

        resultsContainer.innerHTML = '';

        data.posts.forEach(post => {
            const date = new Date(post.published_at || post.created_at);
            const formattedDate = date.toLocaleDateString('ru-RU');

            const card = document.createElement('a');
            card.className = 'search-result-card';
            card.href = 'post.html?id=' + post.id;
            card.innerHTML = `
                <span class="result-category">${post.category}</span>
                <span class="result-title">${post.title}</span>
                <span class="result-excerpt">${post.excerpt || ''}</span>
                <span class="result-date">${formattedDate} • 👁 ${post.view_count}</span>
            `;
            resultsContainer.appendChild(card);
        });

    } catch (error) {
        console.log('Ошибка поиска:', error);
        resultsContainer.innerHTML = '<p class="no-results">Ошибка поиска</p>';
    }
}